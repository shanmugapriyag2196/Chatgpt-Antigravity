import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

// Using Node.js runtime for build stability
export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const key = process.env.OPENAI_API_KEY;

        // Explicitly check for suspicious keys before calling OpenAI
        if (!key) {
            throw new Error("OPENAI_API_KEY is completely missing from environment variables.");
        }
        if (key.length < 150) {
            throw new Error(`OPENAI_API_KEY looks truncated. Expected ~164 chars, but found ${key.length}. Please check Vercel settings.`);
        }

        console.log("DEBUG - Key Check Passed. Length:", key.length);

        const result = streamText({
            model: openai("gpt-4o-mini"),
            system: "You are a helpful AI assistant. Provide detailed and accurate information, especially regarding technology integrations like Power Apps, AI, and Microsoft 365.",
            messages,
        });

        return result.toDataStreamResponse();
    } catch (error: any) {
        console.error("DEBUG - Chat API Error:", error);

        return new Response(
            JSON.stringify({
                message: error.message || "Unknown Server Error",
                status: 500,
                debug: {
                    name: error.name,
                    stack: error.stack?.substring(0, 100)
                }
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
}
