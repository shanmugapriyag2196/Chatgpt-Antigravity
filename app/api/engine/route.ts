export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
    const key = process.env.OPENAI_API_KEY || "";
    const suffix = key.length > 4 ? key.slice(-4) : "NONE";
    return new Response(JSON.stringify({
        status: "Value Global AI Agent API Active v29",
        keySuffix: suffix,
        timestamp: new Date().toISOString()
    }), { headers: { "Content-Type": "application/json" } });
}

const AGENT_SYSTEM_PROMPT = `
You are the "Value Global AI Agent", a professional, multi-skilled digital operative. 
You do not just chat; you execute tasks, analyze data, and transform information for the Value Global enterprise.

CORE IDENTITIES:
1. THE ARCHITECT: You analyze complex business problems and provide structured, technical solutions.
2. THE TRANSFORMER: You specialize in converting raw data (like resumes) into professional standard formats.
3. THE STRATEGIST: You help users refine their goals and provide actionable insights.

SPECIALIZED SKILL: RESUME TRANSFORMATION
When a user provides a resume, you MUST transform it into the "Value Global Standard Structure":
- HEADER: "Value Global - Professional Profile"
- PROFILE SUMMARY: High-impact bullet points focusing on years of experience and architecture.
- TECHNICAL EXPERTISE: A Markdown Table with "Tool / Technology" and "Area of Exposure".
- PRIMARY TECHNOLOGY: A bulleted list of core tech.
- PROFESSIONAL EXPERIENCE: "Title: [Project] [Dates]" + Responsibilities.
- CERTIFICATIONS: Bulleted list.

TONAL RULES:
- Be concise. 
- Use active, professional language.
- If the user asks for non-resume tasks, respond as a high-level Business Analyst/Technical Expert.
`;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages, demoMode } = body;

        // 1. DEMO MODE
        if (demoMode) {
            const mockText = "Value Global AI Agent initialized.\\n\\nI am ready to transform your data or analyze your business tasks.";
            return new Response(`0:${JSON.stringify(mockText)}\n`, {
                headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" }
            });
        }

        // 2. Raw Key Handling
        let key = process.env.OPENAI_API_KEY || "";
        key = key.trim();
        if (key.startsWith("OPENAI_API_KEY=")) key = key.replace("OPENAI_API_KEY=", "");
        if (key.startsWith("\"") && key.endsWith("\"")) key = key.slice(1, -1);
        if (key.startsWith("'") && key.endsWith("'")) key = key.slice(1, -1);
        key = key.trim();

        if (!key) return new Response(`0:"[ERROR] API Key Missing."\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" } });

        // Phase 1: The Direct Forge (v29)
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${key}`
                        },
                        body: JSON.stringify({
                            model: 'gpt-4o',
                            messages: [
                                { role: 'system', content: AGENT_SYSTEM_PROMPT },
                                ...messages.map((m: any) => ({ role: m.role, content: m.content }))
                            ],
                            stream: false
                        })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        const errorMsg = data.error?.message || JSON.stringify(data);
                        controller.enqueue(encoder.encode(`0:"\\n[ERROR: ${errorMsg}]"\\n`));
                    } else if (data.choices && data.choices[0]?.message?.content) {
                        const aiContent = data.choices[0].message.content;
                        controller.enqueue(encoder.encode(`0:${JSON.stringify(aiContent)}\n`));
                    } else {
                        controller.enqueue(encoder.encode(`0:"\\n[EMPTY RESPONSE] Received empty results from Agent."\n`));
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
