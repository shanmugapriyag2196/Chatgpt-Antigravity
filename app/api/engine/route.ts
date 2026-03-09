import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
    const key = process.env.OPENAI_API_KEY || "";
    const hint = key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : "INVALID_LENGTH";
    return new Response(JSON.stringify({
        status: "Engine API Active v15",
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
        // 1. Get and Clean the Key
        let key = process.env.OPENAI_API_KEY || "";
        key = key.trim();
        if (key.startsWith("OPENAI_API_KEY=")) key = key.replace("OPENAI_API_KEY=", "");
        if (key.startsWith("\"") && key.endsWith("\"")) key = key.slice(1, -1);
        if (key.startsWith("'") && key.endsWith("'")) key = key.slice(1, -1);
        key = key.trim();

        if (!key) return new Response(JSON.stringify({ error: "API Key Missing" }), { status: 500 });

        const openai = createOpenAI({ apiKey: key });
        const { messages } = body;

        // Diagnostic Test
        if (body.test === "diagnostic") {
            try {
                const response = await generateText({
                    model: openai("gpt-3.5-turbo") as any,
                    prompt: "Say 'COMPAT_MODE_ACTIVE'",
                });
                return new Response(JSON.stringify({ success: true, text: response.text }), { headers: { "Content-Type": "application/json" } });
            } catch (e: any) {
                return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
            }
        }

        console.log(`>>>> [ENGINE_INIT:${requestId}] Model: gpt-3.5-turbo, Messages: ${messages?.length}`);

        // Phase 1: Stream AI (Switching to 3.5 for maximum compatibility proof)
        const result = streamText({
            model: openai("gpt-3.5-turbo") as any,
            system: "You are a helpful assistant. Provide clear results.",
            messages,
        });

        const originalResponse = (result as any).toDataStreamResponse();
        const originalStream = originalResponse.body;

        if (!originalStream) throw new Error("Stream creation failed");

        const encoder = new TextEncoder();
        let chunkCount = 0;

        const transformStream = new TransformStream({
            start(controller) {
                controller.enqueue(encoder.encode(`0:"[HANDSHAKE: SERVER OK]"\n`));
                controller.enqueue(encoder.encode(`0:"[MODE: COMPATIBILITY ENGAGED]"\n`));
            },
            transform(chunk, controller) {
                chunkCount++;
                // Log every 5 chunks to avoid cluttering but show life
                if (chunkCount % 5 === 1) {
                    controller.enqueue(encoder.encode(`0:"[SYNC: RECEIVING DATA ${chunkCount}]"\n`));
                }
                controller.enqueue(chunk);
            },
            flush(controller) {
                console.log(`>>>> [ENGINE_COMPLETE:${requestId}] Stream finished with ${chunkCount} chunks.`);
                if (chunkCount === 0) {
                    controller.enqueue(encoder.encode(`0:"[ERROR: AI RETURNED ZERO CHUNKS. Check billing or model limits.]"\n`));
                }
            }
        });

        return new Response(originalStream.pipeThrough(transformStream), {
            headers: originalResponse.headers
        });

    } catch (error: any) {
        console.error(">>>> [ENGINE_FATAL_ERROR]", error);
        return new Response(JSON.stringify({ error: true, message: error.message }), { status: 500 });
    }
}
