import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
    return new Response(JSON.stringify({
        status: "Engine API Active v22 (Flow Sync)",
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

        // 2. Key Handling
        let key = process.env.OPENAI_API_KEY || "";
        key = key.trim();
        if (key.startsWith("OPENAI_API_KEY=")) key = key.replace("OPENAI_API_KEY=", "");
        if (key.startsWith("\"") && key.endsWith("\"")) key = key.slice(1, -1);
        if (key.startsWith("'") && key.endsWith("'")) key = key.slice(1, -1);
        key = key.trim();

        if (!key) return new Response(`0:"[ERROR] API Key Missing."\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" } });

        const openai = createOpenAI({ apiKey: key });

        // Phase 1: The Flow Sync (v22)
        // Since the user is in Tier 0 and streaming is blocked (confirmed by zero tokens in v21),
        // we use generateText (Non-Streaming) which matches the behavior of Make/n8n.

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                controller.enqueue(encoder.encode(`0:"[HANDSHAKE: SERVER OK]"\n`));
                controller.enqueue(encoder.encode(`0:"[FLOW SYNC: v22 ACTIVE]"\n`));

                try {
                    // Call generateText (Wait for full response)
                    const { text } = await generateText({
                        model: openai("gpt-3.5-turbo") as any,
                        system: "You are a helpful assistant. Provide clear, short results.",
                        messages,
                    });

                    if (text) {
                        controller.enqueue(encoder.encode(`0:${JSON.stringify(text)}\n`));
                    } else {
                        controller.enqueue(encoder.encode(`0:"[ERROR] Flow Sync returned an empty response. Check OpenAI Usage tier."\n`));
                    }
                } catch (e: any) {
                    console.error("v22 Generate Error:", e);
                    controller.enqueue(encoder.encode(`0:"\\n[FLOW SYNC ERROR: ${e.message}]"\\n`));
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
        return new Response(`0:"[FATAL: ${error.message}]"\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" } });
    }
}
