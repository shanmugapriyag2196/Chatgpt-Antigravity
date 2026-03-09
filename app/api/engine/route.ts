import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
    const key = process.env.OPENAI_API_KEY || "";
    const hint = key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : "INVALID_LENGTH";
    return new Response(JSON.stringify({
        status: "Engine API Active v18",
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
            const mockStream = `0:"[DEMO MODE ACTIVE] Microsoft Power Apps is a low-code tool from Microsoft used to create business apps quickly without much coding.\\n\\nIt allows you to build apps that run on mobile, tablet, or web and connect to data sources like Microsoft Excel, Microsoft SharePoint, or databases.\\n\\n✅ Example: an app for leave requests, approvals, or data entry."\n`;
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
            return new Response(`0:"[CRITICAL ERROR] API Key Missing in Vercel Environment Variables."\n`, {
                headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" }
            });
        }

        const openai = createOpenAI({ apiKey: key });

        // Phase 1: High-Precision Streaming
        // We bypass result.toDataStreamResponse() and iterate manually
        const result = streamText({
            model: openai("gpt-4o-mini") as any, // Most compatible
            system: "You are a helpful assistant. Always provide clear, direct results.",
            messages,
        });

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                // Initial Handshakes
                controller.enqueue(encoder.encode(`0:"[HANDSHAKE: SERVER OK]"\n`));
                controller.enqueue(encoder.encode(`0:"[PROTOCOL: MANUAL STREAMING v18]"\n`));

                try {
                    // Iterate over the text stream directly
                    for await (const textPart of result.textStream) {
                        // Protocol: 0:"text"
                        const chunk = `0:${JSON.stringify(textPart)}\n`;
                        controller.enqueue(encoder.encode(chunk));
                    }
                } catch (streamError: any) {
                    console.error(`>>>> [ENGINE_ITER_ERR:${requestId}]`, streamError);
                    controller.enqueue(encoder.encode(`0:"\\n[STREAM ERROR: ${streamError.message}]"\n`));
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "X-Vercel-AI-Data-Stream": "v1",
                "Cache-Control": "no-cache"
            }
        });

    } catch (error: any) {
        console.error(">>>> [ENGINE_FATAL]", error);
        return new Response(`0:"[FATAL ENGINE ERROR: ${error.message}]"\n`, {
            headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" }
        });
    }
}
