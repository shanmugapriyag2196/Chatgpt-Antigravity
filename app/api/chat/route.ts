import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

// IMPORTANT! Set the runtime to edge
export const runtime = "edge";

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const result = streamText({
            model: openai("gpt-4o-mini"),
            messages,
        });

        return result.toTextStreamResponse();
    } catch (error) {
        return new Response(JSON.stringify({ error: "Failed to fetch response" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
