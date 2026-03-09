export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
    const key = process.env.OPENAI_API_KEY || "";
    const suffix = key.length > 4 ? key.slice(-4) : "NONE";
    return new Response(JSON.stringify({
        status: "Direct Forge API Active v23",
        keySuffix: suffix,
        timestamp: new Date().toISOString()
    }), { headers: { "Content-Type": "application/json" } });
}

export async function POST(req: Request) {
    const requestId = Math.random().toString(36).substring(7);

    try {
        const body = await req.json();
        const { messages, demoMode } = body;

        // 1. DEMO MODE
        if (demoMode) {
            const mockText = "Microsoft Power Apps is a low-code tool from Microsoft used to create business apps quickly without much coding.\\n\\nIt allows you to build apps that run on mobile, tablet, or web and connect to data sources like Microsoft Excel, Microsoft SharePoint, or databases.\\n\\n✅ Example: an app for leave requests, approvals, or data entry.";
            return new Response(`0:${JSON.stringify(mockText)}\n`, {
                headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" }
            });
        }

        // 2. Raw Key Handling
        let key = process.env.OPENAI_API_KEY || "";
        key = key.trim();
        // Remove common wrapper accidental pastes
        if (key.startsWith("OPENAI_API_KEY=")) key = key.replace("OPENAI_API_KEY=", "");
        if (key.startsWith("\"") && key.endsWith("\"")) key = key.slice(1, -1);
        if (key.startsWith("'") && key.endsWith("'")) key = key.slice(1, -1);
        key = key.trim();

        const keySuffix = key.length > 4 ? key.slice(-4) : "INVALID";

        if (!key) return new Response(`0:"[ERROR] API Key Missing."\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" } });

        // Phase 1: The Direct Forge (v23)
        // We use MANUAL FETCH to OpenAI. No SDKs, no helpers.
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                controller.enqueue(encoder.encode(`0:"[HANDSHAKE: SERVER OK]"\n`));
                controller.enqueue(encoder.encode(`0:"[DIRECT FORGE: v23 ACTIVE]"\n`));
                controller.enqueue(encoder.encode(`0:"[VERIFIER: KEY ENDS IN ${keySuffix}]"\n`));

                try {
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${key}`
                        },
                        body: JSON.stringify({
                            model: 'gpt-4o',
                            messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
                            stream: false // Non-streaming for maximum compatibility
                        })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        const errorMsg = data.error?.message || JSON.stringify(data);
                        controller.enqueue(encoder.encode(`0:"\\n[OPENAI DIRECT ERROR: ${errorMsg}]"\\n`));
                    } else if (data.choices && data.choices[0]?.message?.content) {
                        const aiContent = data.choices[0].message.content;
                        controller.enqueue(encoder.encode(`0:${JSON.stringify(aiContent)}\n`));
                    } else {
                        controller.enqueue(encoder.encode(`0:"\\n[EMPTY RESPONSE] OpenAI returned success but no text. Data: ${JSON.stringify(data)}"\n`));
                    }
                } catch (e: any) {
                    controller.enqueue(encoder.encode(`0:"\\n[NETWORK ERROR: ${e.message}]"\\n`));
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "X-Vercel-AI-Data-Stream": "v1",
                "Cache-Control": "no-cache"
            }
        });

    } catch (error: any) {
        return new Response(`0:"[FATAL: ${error.message}]"\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" } });
    }
}
