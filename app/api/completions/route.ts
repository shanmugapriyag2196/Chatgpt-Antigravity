export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    console.log(">>>> [COMPLETIONS_TEST] POST received");
    try {
        const body = await req.json();
        return new Response(JSON.stringify({
            message: "COMPLETIONS_PATH_IS_WORKING",
            received: body ? "YES" : "NO",
            timestamp: new Date().toISOString()
        }), { headers: { "Content-Type": "application/json" } });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function GET() {
    return new Response("Completions endpoint active (GET)");
}
