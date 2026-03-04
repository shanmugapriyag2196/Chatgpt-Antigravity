import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const key = process.env.OPENAI_API_KEY;
    return new Response(JSON.stringify({
        status: "Chat API Active",
        keyLength: key ? key.length : 0,
        timestamp: new Date().toISOString()
    }), { headers: { "Content-Type": "application/json" } });
}

export async function POST(req: Request) {
    console.log(">>>> [CHAT_API] POST received");

    try {
        const body = await req.json();

        // 1. Connectivity Test (Pong)
        if (body.test === "pong") {
            return new Response(JSON.stringify({ message: "PONG_SUCCESS" }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // 2. Real AI Logic
        const { messages } = body;
        const key = process.env.OPENAI_API_KEY;

        if (!key) {
            return new Response("Missing API Key", { status: 500 });
        }

        const openai = createOpenAI({ apiKey: key });

        const result = streamText({
            model: openai("gpt-4o-mini"),
            system: "You are a helpful assistant.",
            messages,
        });

        return (result as any).toDataStreamResponse();
    } catch (error: any) {
        console.error(">>>> [CHAT_API_ERROR]", error);
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
