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
    console.log(">>>> [API_POST_START] Timestamp:", new Date().toISOString());
    try {
        const body = await req.json();
        const { messages } = body;

        console.log(">>>> [API_PAYLOAD] Messages length:", messages?.length);
        if (!messages || messages.length === 0) {
            console.error(">>>> [API_ERROR] No messages in payload");
            return new Response("Error: No messages provided in request", { status: 400 });
        }

        const key = process.env.OPENAI_API_KEY;
        if (!key) {
            console.error(">>>> [API_ERROR] OPENAI_API_KEY is missing from environment");
            return new Response("Error: Server Configuration Error (Missing Key)", { status: 500 });
        }

        console.log(">>>> [API_INIT] Initializing OpenAI client...");
        const openai = createOpenAI({
            apiKey: key,
        });

        console.log(">>>> [API_OPENAI] Calling streamText...");
        const result = streamText({
            model: openai("gpt-4o-mini"),
            system: "You are a helpful AI assistant.",
            messages,
        });

        console.log(">>>> [API_SUCCESS] Stream initialized. Sending response...");
        return result.toDataStreamResponse();
    } catch (error: any) {
        console.error(">>>> [API_CRASH] Critical failure:", error);

        const errorInfo = {
            message: error.message || "No error message provided",
            name: error.name || "UnknownError",
            stack: error.stack?.substring(0, 300),
            cause: error.cause
        };

        console.log(">>>> [API_RECOVERY] Returning detailed error JSON");
        return new Response(JSON.stringify({
            isError: true,
            message: "SERVER_CRASH_DURING_INITIALIZATION",
            details: errorInfo
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
