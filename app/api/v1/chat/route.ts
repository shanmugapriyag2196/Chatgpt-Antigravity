import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    console.log(">>>> [V1_CHAT_POST] Request received");

    try {
        const { messages } = await req.json();
        const key = process.env.OPENAI_API_KEY;

        if (!key) {
            console.error(">>>> [V1_CHAT_ERROR] API Key missing");
            return new Response("API Key not configured", { status: 500 });
        }

        const openai = createOpenAI({ apiKey: key });

        console.log(">>>> [V1_CHAT_OPENAI] Calling streamText...");
        const result = streamText({
            model: openai("gpt-4o-mini"),
            system: "You are a helpful assistant.",
            messages,
        });

        console.log(">>>> [V1_CHAT_SUCCESS] Streaming started");
        return (result as any).toDataStreamResponse();
    } catch (error: any) {
        console.error(">>>> [V1_CHAT_CRASH]", error);
        return new Response(JSON.stringify({
            error: true,
            message: error.message || "Unknown error",
            stack: error.stack?.substring(0, 300)
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
