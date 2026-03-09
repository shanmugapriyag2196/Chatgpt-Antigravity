import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
    const key = process.env.OPENAI_API_KEY || "";
    const hint = key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : "INVALID_LENGTH";
    return new Response(JSON.stringify({
        status: "Engine API Active v16",
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
            const errStream = `0:"[CRITICAL ERROR] API Key Missing in Vercel Environment Variables. Please check your Project Settings."\n`;
            return new Response(errStream, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" } });
        }

        const openai = createOpenAI({ apiKey: key });

        // Phase 1: Deep Probe (Non-streaming to catch actual error message)
        let probeError = "";
        try {
            console.log(`>>>> [ENGINE_PROBE:${requestId}] Probing OpenAI with gpt-4o-mini...`);
            await generateText({
                model: openai("gpt-4o-mini") as any,
                prompt: "say 'ok'",
                maxTokens: 1
            });
        } catch (e: any) {
            probeError = e.message || "Unknown OpenAI Error";
            console.error(`>>>> [ENGINE_PROBE_FAILED:${requestId}]`, probeError);
        }

        const encoder = new TextEncoder();

        // If probe failed, we immediately report the specific reason
        if (probeError) {
            let userFriendly = probeError;
            if (probeError.includes("insufficient_quota")) {
                userFriendly = "OPENAI ERROR: Your account has insufficient quota (No balance). Please add credits to your OpenAI account at platform.openai.com/billing.";
            } else if (probeError.includes("invalid_api_key")) {
                userFriendly = "OPENAI ERROR: Invalid API Key. Please verify the key in Vercel settings.";
            }

            const errStream = `0:"[HANDSHAKE: SERVER OK]"\n0:"[ERROR CAPTURED: ${userFriendly}]"\n`;
            return new Response(errStream, {
                headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" }
            });
        }

        // Phase 2: Attempt Streaming with gpt-4o
        try {
            const result = streamText({
                model: openai("gpt-4o") as any,
                system: "You are a helpful assistant. Provide clear results.",
                messages,
            });

            const originalResponse = (result as any).toDataStreamResponse();
            const originalStream = originalResponse.body;
            if (!originalStream) throw new Error("Stream failed to initialize");

            let chunkCount = 0;
            const transformStream = new TransformStream({
                start(controller) {
                    controller.enqueue(encoder.encode(`0:"[HANDSHAKE: SERVER OK]"\n`));
                    controller.enqueue(encoder.encode(`0:"[STATUS: AI PROVIDER CONNECTED]"\n`));
                },
                transform(chunk, controller) {
                    chunkCount++;
                    controller.enqueue(chunk);
                },
                flush(controller) {
                    if (chunkCount === 0) {
                        controller.enqueue(encoder.encode(`0:"\\n[SYSTEM ERROR: AI returned zero tokens. This usually means a hidden account restriction. Try DEMO MODE to verify UI.]"\n`));
                    }
                }
            });

            return new Response(originalStream.pipeThrough(transformStream), {
                headers: originalResponse.headers
            });

        } catch (streamError: any) {
            console.error(`>>>> [ENGINE_STREAM_ERR:${requestId}]`, streamError);
            const errStream = `0:"[HANDSHAKE: SERVER OK]"\n0:"[STREAM ERROR: ${streamError.message}]"\n`;
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
