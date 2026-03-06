import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
    const key = process.env.OPENAI_API_KEY || "";
    const hint = key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : "INVALID_LENGTH";
    return new Response(JSON.stringify({
        status: "Engine API Active v10",
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

        // 2. Connectivity Pong
        if (body.test === "pong") {
            return new Response(JSON.stringify({ message: "PONG_READY", id: requestId, keyLen: key.length }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // 3. Mock Stream Test (Baseline)
        if (body.test === "mock") {
            console.log(`>>>> [ENGINE_MOCK:${requestId}] Delivering mock stream...`);
            const mockStream = `0:"Server streaming is WORKING. This text is not from AI."\nd:{"finishReason":"stop"}\n`;
            return new Response(mockStream, {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "X-Vercel-AI-Data-Stream": "v1"
                }
            });
        }

        // 4. Super Diagnostic (Permission Check)
        if (body.test === "diagnostic") {
            if (!key) return new Response("Key Missing", { status: 500 });

            try {
                console.log(`>>>> [ENGINE_DIAG:${requestId}] Checking OpenAI Permissions...`);
                // Test 1: List Models
                const listRes = await fetch("https://api.openai.com/v1/models", {
                    headers: { "Authorization": `Bearer ${key}` }
                });
                const listData = await listRes.json();

                if (!listRes.ok) {
                    return new Response(JSON.stringify({
                        success: false,
                        error: `Auth Failed: ${JSON.stringify(listData.error)}`
                    }), { status: 500 });
                }

                const modelNames = listData.data?.map((m: any) => m.id) || [];
                const has4o = modelNames.includes("gpt-4o");
                const has4oMini = modelNames.includes("gpt-4o-mini");

                // Test 2: Generate with first available
                const targetModel = has4o ? "gpt-4o" : (has4oMini ? "gpt-4o-mini" : modelNames[0]);

                if (!targetModel) {
                    return new Response(JSON.stringify({ success: false, error: "No models available for this key" }), { status: 500 });
                }

                const response = await generateText({
                    model: openai(targetModel) as any,
                    prompt: "Say 'SUPER_READY'",
                });

                return new Response(JSON.stringify({
                    success: true,
                    text: response.text || "EMPTY",
                    modelUsed: targetModel,
                    available: modelNames.slice(0, 10),
                    hasStandardModels: has4o || has4oMini
                }), { headers: { "Content-Type": "application/json" } });

            } catch (e: any) {
                return new Response(JSON.stringify({
                    success: false,
                    error: e.message,
                    full: JSON.stringify(e, Object.getOwnPropertyNames(e))
                }), { status: 500, headers: { "Content-Type": "application/json" } });
            }
        }

        if (!key) {
            console.error(`>>>> [ENGINE_ERROR:${requestId}] API Key missing!`);
            return new Response("Key Missing", { status: 500 });
        }

        const { messages } = body;
        console.log(`>>>> [ENGINE_INIT:${requestId}] Model: gpt-4o, Messages: ${messages?.length}`);

        const result = streamText({
            model: openai("gpt-4o") as any,
            system: "You are a helpful assistant. Always provide a clear response.",
            messages,
        });

        console.log(`>>>> [ENGINE_SUCCESS:${requestId}] Releasing stream response...`);
        return (result as any).toDataStreamResponse();

    } catch (error: any) {
        console.error(">>>> [ENGINE_ERROR]", error);
        return new Response(JSON.stringify({
            error: true,
            message: error.message || "Unknown Error",
            stack: error.stack?.substring(0, 200)
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
