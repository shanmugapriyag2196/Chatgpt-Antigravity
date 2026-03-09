export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
    const key = process.env.OPENAI_API_KEY || "";
    const suffix = key.length > 4 ? key.slice(-4) : "NONE";
    return new Response(JSON.stringify({
        status: "Resume Transformer API Active v27",
        keySuffix: suffix,
        timestamp: new Date().toISOString()
    }), { headers: { "Content-Type": "application/json" } });
}

const RESUME_SYSTEM_PROMPT = `
You are a professional Resume Transformation Expert for "Value Global".
Your goal is to take a user's resume (text or file content) and transform it into the "Value Global Standard Structure".

FORMATTING RULES:
1. HEADER: Start with the Header: "Value Global - Professional Profile".
2. PROFILE SUMMARY: A concise bulleted section summarizing years of experience (e.g., "Over 21 years of experience..."). Focus on architecting and delivering solutions.
3. TECHNICAL EXPERTISE: Use a Markdown Table with TWO columns: "Tool / Technology" and "Area of Exposure".
   Example:
   | Tool / Technology | Area of Exposure |
   | --- | --- |
   | Database | Oracle, SQL Server, Neo4J, MySQL |
   | CRM | Salesforce, Microsoft Dynamics |
4. PRIMARY TECHNOLOGY: A bulleted list of core tech stacks.
5. PROFESSIONAL EXPERIENCE: 
   - Each project MUST have: "Title: [Project Title]", "[Period]", and "Responsibilities" (bulleted).
   - Format: "Title: SAP Data Migration and API enablement [2019 - Present]"
6. CERTIFICATIONS: A bulleted list of official certifications at the end.

TONAL RULES:
- Use professional, high-impact language (e.g., "Seasoned Architect", "Proven expertise", "Mentored teams").
- Ensure the layout is clean and easy to read.
`;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages, demoMode } = body;

        // 1. DEMO MODE
        if (demoMode) {
            const mockText = "Value Global - Professional Profile\\n\\n### Profile Summary:\\n- Seasoned Integration Architect with over 21 years of experience...\\n\\n### Technical Expertise:\\n| Tool / Technology | Area of Exposure |\\n| --- | --- |\\n| Database | Oracle, SQL Server |\\n| CRM | Salesforce |\\n\\n### Professional Experience:\\n**Title: SAP Data Migration [2019 - Present]**\\n- Architected and delivered large-scale solutions...";
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

        // Phase 1: The Direct Forge (v27)
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
                                { role: 'system', content: RESUME_SYSTEM_PROMPT },
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
                        controller.enqueue(encoder.encode(`0:"\\n[EMPTY RESPONSE] Received empty results from AI."\n`));
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
