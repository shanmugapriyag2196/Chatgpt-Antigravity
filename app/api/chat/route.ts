import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Diagnostic GET handler
export async function GET() {
    const key = process.env.OPENAI_API_KEY;
    return NextResponse.json({
        status: "Diagnostic Endpoint Active",
        method: "GET",
        keyPresent: !!key,
        keyLength: key ? key.length : 0,
        timestamp: new Date().toISOString()
    });
}

// OPTIONS handler for potential CORS/Preflight issues
export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Allow': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

export async function POST(req: Request) {
    console.log(">>>> [API_POST] Request received");

    try {
        const body = await req.json();
        const { messages } = body;

        // BARE MINIMUM TEST: If message is "ping", return "pong"
        if (messages && messages[0]?.content === "test connectivity") {
            console.log(">>>> [API_POST] Connectivity test detected");
            return new Response("PONG - Server is accepting POST requests", { status: 200 });
        }

        const key = process.env.OPENAI_API_KEY;
        if (!key) {
            console.error(">>>> [API_POST] Missing key");
            return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
        }

        const openai = createOpenAI({ apiKey: key });

        const result = streamText({
            model: openai("gpt-4o-mini"),
            system: "You are a helpful assistant.",
            messages,
        });

        console.log(">>>> [API_POST] Streaming started");
        return result.toDataStreamResponse();

    } catch (error: any) {
        console.error(">>>> [API_POST] Error:", error);
        return NextResponse.json({
            error: true,
            message: error.message || "Unknown Server Error",
            stack: error.stack?.substring(0, 200)
        }, { status: 500 });
    }
}
