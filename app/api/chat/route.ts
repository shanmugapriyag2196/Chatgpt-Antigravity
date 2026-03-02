import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

// Using Node.js runtime for build stability
export const runtime = "nodejs";

// Diagnostic GET handler - helps user verify environment without complex fetch
export async function GET() {
    const key = process.env.OPENAI_API_KEY;
    return new Response(JSON.stringify({
        status: "Diagnostic Endpoint Active",
        keyPresent: !!key,
        keyLength: key ? key.length : 0,
        keyPrefix: key ? key.substring(0, 7) : "N/A",
        timestamp: new Date().toISOString()
    }), { headers: { "Content-Type": "application/json" } });
}

export async function POST(req: Request) {
    console.log("DEBUG - [API] Request received at /api/chat");
    try {
        const { messages } = await req.json();
        const key = process.env.OPENAI_API_KEY;

        if (!key) throw new Error("OPENAI_API_KEY is missing from environment.");

        const openai = createOpenAI({
            apiKey: key,
        });

        const result = streamText({
            model: openai("gpt-4o-mini"),
            system: "You are a helpful AI assistant.",
            messages,
        });

        return result.toDataStreamResponse();
    } catch (error: any) {
        console.error("DEBUG - Chat API Error:", error);
        return new Response(
            JSON.stringify({
                message: error.message || "Unknown Server Error",
                name: error.name,
                stack: error.stack?.substring(0, 100)
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
