import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
    const key = process.env.OPENAI_API_KEY || "";
    const hint = key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : "INVALID_LENGTH";
    return new Response(JSON.stringify({
        status: "Engine API Active v5",
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
        console.log(`>>>> [ENGINE_BODY:${requestId}] Payload received:`, JSON.stringify(body).substring(0, 100));

        // Connectivity Pong
        if (body.test === "pong") {
            return new Response(JSON.stringify({ message: "PONG_READY", id: requestId }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // Deep Diagnostic (Non-streaming)
        if (body.test === "diagnostic") {
            const key = process.env.OPENAI_API_KEY;
            if (!key) return new Response("Key Missing", { status: 500 });
            const openai = createOpenAI({ apiKey: key });
            try {
                console.log(`>>>> [ENGINE_DIAG:${requestId}] Testing generateText...`);
                const { text } = await generateText({
                    model: openai("gpt-4o-mini"),
                    prompt: "Say 'Engine Verified'",
                });
                return new Response(JSON.stringify({ success: true, text }), { headers: { "Content-Type": "application/json" } });
            } catch (e: any) {
                console.error(`>>>> [ENGINE_DIAG_ERR:${requestId}]`, e);
                return new Response(JSON.stringify({ success: false, error: e.message }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" }
                });
            }
        }

        const { messages } = body;
        const key = process.env.OPENAI_API_KEY;

        if (!key) {
            console.error(`>>>> [ENGINE_ERROR:${requestId}] API Key missing!`);
            return new Response("Key Missing", { status: 500 });
        }

        console.log(`>>>> [ENGINE_INIT:${requestId}] Model: gpt-4o-mini, Messages: ${messages?.length}`);

        const openai = createOpenAI({ apiKey: key });

        const result = streamText({
            model: openai("gpt-4o-mini"),
            system: "You are a helpful assistant. Always provide a clear response.",
            messages,
        });

        console.log(`>>>> [ENGINE_SUCCESS:${requestId}] Releasing stream response...`);
        return (result as any).toDataStreamResponse();
    } catch (error: any) {
        console.error(">>>> [ENGINE_ERROR]", error);
        return new Response(JSON.stringify({
            error: true,
            message: error.message || "Unknown Error",
            stack: error.stack?.substring(0, 200)
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
