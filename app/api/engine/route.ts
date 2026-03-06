import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
    const key = process.env.OPENAI_API_KEY || "";
    const hint = key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : "INVALID_LENGTH";
    return new Response(JSON.stringify({
        status: "Engine API Active v13",
        keyLength: key.length,
        keyHint: hint,
        provider: "openai",
        timestamp: new Date().toISOString()
    }), { headers: { "Content-Type": "application/json" } });
}

export async function POST(req: Request) {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`>>>> [ENGINE_RECV:${requestId}] POST Request started`);

    try {
        const body = await req.json();
        console.log(`>>>> [ENGINE_BODY:${requestId}] Payload received:`, JSON.stringify(body).substring(0, 100));

        // 1. Get and Clean the Key
        let key = process.env.OPENAI_API_KEY || "";

        // Clean common pasting errors
        key = key.trim();
        if (key.startsWith("OPENAI_API_KEY=")) key = key.replace("OPENAI_API_KEY=", "");
        if (key.startsWith("\"") && key.endsWith("\"")) key = key.slice(1, -1);
        if (key.startsWith("'") && key.endsWith("'")) key = key.slice(1, -1);
        key = key.trim();

        const openai = createOpenAI({ apiKey: key });

        // Connectivity Pong
        if (body.test === "pong") {
            return new Response(JSON.stringify({ message: "PONG_READY", id: requestId, keyLen: key.length }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // Diagnostic (Permission Check)
        if (body.test === "diagnostic") {
            if (!key) return new Response("Key Missing", { status: 500 });
            try {
                const response = await generateText({
                    model: openai("gpt-4o-mini") as any,
                    prompt: "Say 'SUPER_READY'",
                });
                return new Response(JSON.stringify({
                    success: true,
                    text: response.text || "EMPTY",
                    modelUsed: "gpt-4o-mini"
                }), { headers: { "Content-Type": "application/json" } });
            } catch (e: any) {
                return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
            }
        }

        if (!key) return new Response("Key Missing", { status: 500 });

        const { messages } = body;

        // Attempt streamText
        try {
            const result = streamText({
                model: openai("gpt-4o") as any, // Trying 4o first as requested
                system: "You are a helpful assistant. Always provide a clear response.",
                messages,
            });

            // Convert to a transform stream to inject a handshake
            const originalResponse = (result as any).toDataStreamResponse();
            const originalStream = originalResponse.body;

            if (!originalStream) throw new Error("Stream creation failed");

            // We'll wrap the stream to ensure it's not empty
            const encoder = new TextEncoder();
            const transformStream = new TransformStream({
                start(controller) {
                    console.log(`>>>> [ENGINE_STREAM:${requestId}] Sending Handshake...`);
                    controller.enqueue(encoder.encode(`0:"[HANDSHAKE: SERVER REACHED]"\n`));
                },
                transform(chunk, controller) {
                    controller.enqueue(chunk);
                }
            });

            return new Response(originalStream.pipeThrough(transformStream), {
                headers: originalResponse.headers
            });

        } catch (streamError: any) {
            console.error(`>>>> [ENGINE_STREAM_ERR:${requestId}]`, streamError);
            // Fallback to non-streaming if stream fails to even start
            const fallback = await generateText({
                model: openai("gpt-4o-mini") as any,
                prompt: "Server encountered a stream error, but I am still here. How can I help?",
            });
            return new Response(`0:${JSON.stringify(fallback.text)}\n`, {
                headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" }
            });
        }

    } catch (error: any) {
        console.error(">>>> [ENGINE_ERROR]", error);
        return new Response(JSON.stringify({ error: true, message: error.message }), { status: 500 });
    }
}
