import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

// Using Node.js runtime for build stability
export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // Runtime diagnostics (Safe - does not leak keys)
        const key = process.env.OPENAI_API_KEY;
        console.log("DEBUG - Runtime Diagnostics:");
        console.log("- OPENAI_API_KEY present:", !!key);
        if (key) {
            console.log("- OPENAI_API_KEY length:", key.length);
            console.log("- OPENAI_API_KEY starts with:", key.substring(0, 7));
            console.log("- OPENAI_API_KEY ends with:", key.substring(key.length - 4));
        }

        const result = streamText({
            model: openai("gpt-4o-mini"),
            system: "You are a helpful AI assistant. Provide detailed and accurate information, especially regarding technology integrations like Power Apps, AI, and Microsoft 365.",
            messages,
        });

        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error("DEBUG - Chat API Error:", error);
        return new Response(
            JSON.stringify({
                error: "OpenAI API Error",
                message: error.message || "An unexpected error occurred on the server.",
                details: error
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
}
