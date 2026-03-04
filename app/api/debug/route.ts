export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const key = process.env.OPENAI_API_KEY;
    return new Response(JSON.stringify({
        status: "Debug Endpoint Active",
        keyPresent: !!key,
        keyLength: key ? key.length : 0,
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    }), { headers: { "Content-Type": "application/json" } });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        return new Response(JSON.stringify({
            message: "PONG",
            method: "POST",
            receivedPayload: body ? "YES" : "NO",
            timestamp: new Date().toISOString()
        }), { headers: { "Content-Type": "application/json" } });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
