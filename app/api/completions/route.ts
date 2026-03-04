import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    console.log(">>>> [COMPLETIONS_POST] Request received");

    try {
        const { messages } = await req.json();
        const key = process.env.OPENAI_API_KEY;

        if (!key) {
            console.error(">>>> [COMPLETIONS_ERROR] API Key missing");
            return new Response("API Key not configured", { status: 500 });
        }

        const openai = createOpenAI({ apiKey: key });

        console.log(">>>> [COMPLETIONS_OPENAI] Calling streamText...");
        const result = streamText({
            model: openai("gpt-4o-mini"),
            system: "You are a helpful assistant.",
            messages,
        });

        console.log(">>>> [COMPLETIONS_SUCCESS] Streaming started");
        // Using result.toDataStreamResponse() for compatibility with useChat hook
        return result.toDataStreamResponse();
    } catch (error: any) {
        console.error(">>>> [COMPLETIONS_CRASH]", error);

        const errorInfo = {
            message: error.message || "No error message",
            name: error.name || "Error",
            stack: error.stack?.substring(0, 300)
        };

        return new Response(JSON.stringify({
            error: true,
            message: "SERVER_CRASH",
            details: errorInfo
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
