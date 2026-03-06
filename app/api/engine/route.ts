import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
    const key = process.env.OPENAI_API_KEY;
    return new Response(JSON.stringify({
        status: "Engine API Active v3",
        keyLength: key ? key.length : 0,
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

        // Mock Stream Test
        if (body.test === "mock") {
            console.log(`>>>> [ENGINE_MOCK:${requestId}] Delivering mock stream...`);
            // This is the standard DataStream format for "This is a mock response"
            const mockStream = `0:"This matches the AI SDK protocol. It should appear in the chat."\nd:{"finishReason":"stop","usage":{"promptTokens":1,"completionTokens":1}}\n`;
            return new Response(mockStream, {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "X-Vercel-AI-Data-Stream": "v1"
                }
            });
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
