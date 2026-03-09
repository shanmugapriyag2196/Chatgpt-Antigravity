import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
    return new Response(JSON.stringify({
        status: "Engine API Active v21",
        timestamp: new Date().toISOString()
    }), { headers: { "Content-Type": "application/json" } });
}

export async function POST(req: Request) {
    const requestId = Math.random().toString(36).substring(7);

    try {
        const body = await req.json();
        const { messages, demoMode } = body;

        // 1. DEMO MODE
        if (demoMode) {
            const mockText = "Microsoft Power Apps is a low-code tool from Microsoft used to create business apps quickly without much coding.\\n\\nIt allows you to build apps that run on mobile, tablet, or web and connect to data sources like Microsoft Excel, Microsoft SharePoint, or databases.\\n\\n✅ Example: an app for leave requests, approvals, or data entry.";
            return new Response(`0:${JSON.stringify(mockText)}\n`, {
                headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" }
            });
        }

        // 2. Key Validation
        let key = process.env.OPENAI_API_KEY || "";
        key = key.trim();
        if (key.startsWith("OPENAI_API_KEY=")) key = key.replace("OPENAI_API_KEY=", "");
        if (key.startsWith("\"") && key.endsWith("\"")) key = key.slice(1, -1);
        if (key.startsWith("'") && key.endsWith("'")) key = key.slice(1, -1);
        key = key.trim();

        if (!key) return new Response(`0:"[ERROR] API Key Missing."\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" } });

        const openai = createOpenAI({ apiKey: key });

        // Phase 1: The Token Forge (v21)
        // Force GPT-3.5-Turbo for Tier 0 accounts with balance
        const result = streamText({
            model: openai("gpt-3.5-turbo") as any,
            system: "You are a helpful assistant. Provide clear results.",
            messages,
        });

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                controller.enqueue(encoder.encode(`0:"[HANDSHAKE: SERVER OK]"\n`));
                controller.enqueue(encoder.encode(`0:"[PIVOT: GPT-3.5 SYNC v21]"\n`));

                let tokenCount = 0;
                try {
                    // Manual iteration to catch specific OpenAI errors
                    for await (const chunk of (result as any).fullStream) {
                        if (chunk.type === 'text-delta' && chunk.textDelta) {
                            tokenCount++;
                            controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk.textDelta)}\n`));
                        } else if (chunk.type === 'error') {
                            const errMsg = JSON.stringify(chunk.error).substring(0, 100);
                            controller.enqueue(encoder.encode(`0:"\\n[AI SYNC ERROR: ${errMsg}]"\\n`));
                        }
                    }
                } catch (e: any) {
                    controller.enqueue(encoder.encode(`0:"\\n[SYSTEM ERROR: ${e.message}]"\\n`));
                } finally {
                    if (tokenCount === 0 && !demoMode) {
                        controller.enqueue(encoder.encode(`0:"\\n[ZERO TOKENS] Connection succeeded but AI is silent. This confirms a Tier 0 model restriction. Use DEMO MODE to verify UI."\\n`));
                    }
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
        return new Response(`0:"[FATAL: ${error.message}]"\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" } });
    }
}
