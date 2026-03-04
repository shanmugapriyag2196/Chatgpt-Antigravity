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
    console.log(">>>> [API_START] POST /api/chat");
    try {
        const { messages } = await req.json();
        console.log(">>>> [API_DATA] Messages count:", messages?.length);

        const key = process.env.OPENAI_API_KEY;
        if (!key) {
            console.error(">>>> [API_ERROR] OPENAI_API_KEY is missing!");
            throw new Error("SERVER_CONFIG: OPENAI_API_KEY is missing.");
        }

        console.log(">>>> [API_INIT] Initializing OpenAI provider...");
        const openai = createOpenAI({
            apiKey: key,
        });

        console.log(">>>> [API_STREAM] Triggering streamText...");
        const result = streamText({
            model: openai("gpt-4o-mini"),
            system: "You are a helpful AI assistant.",
            messages,
        });

        console.log(">>>> [API_SUCCESS] Returning stream response.");
        return (result as any).toDataStreamResponse();
    } catch (error: any) {
        // This is THE most important log part. 
        // We output a unique string so we can find it in Vercel logs easily.
        const errorDetails = {
            message: error.message || "NO_MESSAGE_PROVIDED",
            name: error.name || "Error",
            stack: error.stack?.substring(0, 500),
            fullError: JSON.stringify(error) === "{}" ? error.toString() : JSON.stringify(error)
        };

        console.error(">>>> [REAL_SERVER_ERROR]:", errorDetails);

        return new Response(
            JSON.stringify({
                error: true,
                details: errorDetails,
                serverTime: new Date().toISOString()
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
}
