import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

// Using Node.js runtime for build stability
export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const result = streamText({
            model: openai("gpt-4o-mini"),
            system: "You are a helpful AI assistant. Provide detailed and accurate information, especially regarding technology integrations like Power Apps, AI, and Microsoft 365.",
            messages,
        });

        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error("Chat API Error:", error);
        return new Response(JSON.stringify({
            error: "Failed to fetch response",
            details: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
