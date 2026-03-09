import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
    const key = process.env.OPENAI_API_KEY || "";
    const hint = key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : "INVALID_LENGTH";
    return new Response(JSON.stringify({
        status: "Engine API Active v17",
        keyLength: key.length,
        keyHint: hint,
        provider: "openai",
        timestamp: new Date().toISOString()
    }), { headers: { "Content-Type": "application/json" } });
}

export async function POST(req: Request) {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`>>>> [ENGINE_RECV:${requestId}] POST Request started`);

    try {
        const body = await req.json();
        const { messages, demoMode } = body;

        // 1. Demo Mode Fallback
        if (demoMode) {
            const mockStream = `0:"[DEMO MODE ACTIVE] Microsoft Power Apps is a low-code tool from Microsoft used to create business apps quickly without much coding.\\n\\nIt allows you to build apps that run on mobile, tablet, or web and connect to data sources like Microsoft Excel, Microsoft SharePoint, or databases.\\n\\n✅ Example: an app for leave requests, approvals, or data entry."\nd:{"finishReason":"stop"}\n`;
            return new Response(mockStream, {
                headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" }
            });
        }

        // 2. Get and Clean the Key
        let key = process.env.OPENAI_API_KEY || "";
        key = key.trim();
        if (key.startsWith("OPENAI_API_KEY=")) key = key.replace("OPENAI_API_KEY=", "");
        if (key.startsWith("\"") && key.endsWith("\"")) key = key.slice(1, -1);
        if (key.startsWith("'") && key.endsWith("'")) key = key.slice(1, -1);
        key = key.trim();

        if (!key) {
            const errStream = `0:"[CRITICAL ERROR] API Key Missing in Vercel Environment Variables."\n`;
            return new Response(errStream, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" } });
        }

        const openai = createOpenAI({ apiKey: key });

        // Phase 1: Auto-Model Selector
        let selectedModel = "gpt-4o"; // Default
        try {
            console.log(`>>>> [ENGINE_AUTO:${requestId}] Fetching model list...`);
            const listRes = await fetch("https://api.openai.com/v1/models", {
                headers: { "Authorization": `Bearer ${key}` }
            });
            const listData = await listRes.json();
            const modelNames = listData.data?.map((m: any) => m.id) || [];

            if (modelNames.includes("gpt-4o")) selectedModel = "gpt-4o";
            else if (modelNames.includes("gpt-4")) selectedModel = "gpt-4";
            else if (modelNames.includes("gpt-3.5-turbo")) selectedModel = "gpt-3.5-turbo";
            else if (modelNames.length > 0) selectedModel = modelNames[0];

            console.log(`>>>> [ENGINE_AUTO:${requestId}] Selected Model: ${selectedModel}`);
        } catch (e) {
            console.error(`>>>> [ENGINE_AUTO_ERR:${requestId}] Model fetch failed, using default.`);
        }

        // Phase 2: Streaming
        try {
            const result = streamText({
                model: openai(selectedModel) as any,
                system: "You are a helpful assistant. Provide clear results.",
                messages,
            });

            const originalResponse = (result as any).toDataStreamResponse();
            const originalStream = originalResponse.body;
            if (!originalStream) throw new Error("Stream failed");

            const encoder = new TextEncoder();
            let chunkCount = 0;

            const transformStream = new TransformStream({
                start(controller) {
                    controller.enqueue(encoder.encode(`0:"[HANDSHAKE: SERVER OK]"\n`));
                    controller.enqueue(encoder.encode(`0:"[PROTOCOL: SYNCING WITH ${selectedModel.toUpperCase()}]"\n`));
                },
                transform(chunk, controller) {
                    chunkCount++;
                    // Inject heartbeat every 10 chunks
                    if (chunkCount % 10 === 1) {
                        controller.enqueue(encoder.encode(`0:"[SYNC: RECEIVING DATA ${chunkCount}]"\n`));
                    }
                    controller.enqueue(chunk);
                },
                flush(controller) {
                    console.log(`>>>> [ENGINE_COMPLETE:${requestId}] Finished with ${chunkCount} chunks.`);
                    if (chunkCount === 0) {
                        controller.enqueue(encoder.encode(`0:"\\n[ERROR: The AI returned no text. Check account balance or permissions.]"\n`));
                    }
                }
            });

            return new Response(originalStream.pipeThrough(transformStream), {
                headers: originalResponse.headers
            });

        } catch (streamError: any) {
            console.error(`>>>> [ENGINE_STREAM_ERR:${requestId}]`, streamError);
            const errStream = `0:"[STREAM ERROR: ${streamError.message}]"\n`;
            return new Response(errStream, {
                headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" }
            });
        }

    } catch (error: any) {
        console.error(">>>> [ENGINE_FATAL]", error);
        return new Response(`0:"[FATAL ENGINE ERROR: ${error.message}]"\n`, {
            headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" }
        });
    }
}
