"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Plus, Zap, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
}

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [demoMode, setDemoMode] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const appendMessage = (role: Message["role"], content: string) => {
        const id = Math.random().toString(36).substring(7);
        setMessages(prev => [...prev, { id, role, content }]);
        return id;
    };

    const toggleDemo = () => {
        setDemoMode(!demoMode);
        alert(demoMode ? "DEMO MODE DISABLED" : "DEMO MODE ENABLED: Dashboard will now show high-quality mock data.");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        setError(null);
        setIsLoading(true);

        const currentInput = input;
        setInput("");
        appendMessage("user", currentInput);

        const assistantId = appendMessage("assistant", "");
        let hasTokens = false;

        try {
            const response = await fetch('/api/engine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: "user", content: currentInput }],
                    demoMode: demoMode
                })
            });

            if (!response.ok) throw new Error(`Server Disconnected: ${response.status}`);

            const reader = response.body?.getReader();
            const textDecoder = new TextDecoder();
            if (!reader) throw new Error("Stream Reader Not Available");

            let streamBuffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                streamBuffer += textDecoder.decode(value, { stream: true });
                const lines = streamBuffer.split("\n");
                streamBuffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.startsWith('0:')) continue;
                    try {
                        const jsonStr = line.substring(2);
                        const text = JSON.parse(jsonStr);

                        // Ignore handshake messages to detect real response
                        if (!text.includes("[HANDSHAKE") && !text.includes("[PROTOCOL")) {
                            hasTokens = true;
                        }

                        setMessages(prev => {
                            const next = [...prev];
                            const last = next[next.length - 1];
                            if (last && last.id === assistantId) {
                                last.content += text;
                            }
                            return next;
                        });
                    } catch (e) {
                        // malformed JSON chunk
                    }
                }
            }

            if (!hasTokens && !demoMode) {
                throw new Error("AI provider connected but returned zero text tokens. This is common if the OpenAI account has billing issues or restrictions.");
            }

        } catch (err: any) {
            console.error("Stream Termination:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#020202] text-zinc-100 font-sans">
            {/* Minimal Header */}
            <header className="h-16 border-b border-zinc-900 flex items-center px-8 justify-between bg-black/80 backdrop-blur-3xl z-40">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-black shadow-[0_0_15px_rgba(16,163,127,0.4)]">
                        <Zap className="w-4 h-4 fill-current" />
                    </div>
                    <span className="font-black text-[10px] tracking-[0.5em] uppercase text-white">Result Engine v18</span>

                    <button
                        onClick={toggleDemo}
                        className={cn(
                            "px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
                            demoMode
                                ? "bg-amber-500/20 text-amber-500 border-amber-500/50 animate-pulse"
                                : "bg-zinc-900/50 text-zinc-600 border-zinc-800 hover:text-white"
                        )}
                    >
                        {demoMode ? "DEMO MODE ACTIVE" : "ENABLE DEMO MODE"}
                    </button>
                </div>

                <div className="flex items-center gap-3 bg-zinc-950 px-4 py-1 rounded-full border border-zinc-800">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10a37f]"></div>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Dash Online</span>
                </div>
            </header>

            {/* Chat Content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-20 space-y-16 selection:bg-emerald-500/30">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-8 opacity-20">
                        <div className="w-24 h-24 border border-zinc-800 rounded-full flex items-center justify-center">
                            <Plus className="w-8 h-8 stroke-1" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl font-black text-white uppercase tracking-[0.4em]">Initialize Analysis</h2>
                            <p className="text-zinc-700 text-[10px] font-bold mt-2 tracking-[0.2em] uppercase underline decoration-emerald-500/50 underline-offset-8 decoration-2">Manual Parsing Active</p>
                        </div>
                    </div>
                ) : (
                    messages.map((m) => (
                        <div key={m.id} className={cn("flex gap-10 max-w-5xl mx-auto animation-slide-up", m.role === "user" ? "justify-end" : "justify-start")}>
                            <div className={cn(
                                "p-12 rounded-[3.5rem] max-w-[90%] border shadow-[0_0_80px_rgba(0,0,0,0.8)] relative group transition-all duration-700",
                                m.role === "user"
                                    ? "bg-zinc-900 border-zinc-800 text-zinc-200"
                                    : "bg-surface border-zinc-900 text-white"
                            )}>
                                {m.role === "assistant" && (
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-1 h-6 bg-emerald-500 rounded-full shadow-[0_0_10px_#10a37f]"></div>
                                        <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.4em]">Result Output</span>
                                    </div>
                                )}
                                <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-[1.8] text-[17px] font-medium tracking-tight">
                                    {m.content || (isLoading && m.role !== 'user' ? "Compiling response..." : "")}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {error && (
                    <div className="max-w-4xl mx-auto p-10 bg-red-950/10 border border-red-500/10 rounded-[2.5rem] flex flex-col items-center gap-6 text-center animate-shake">
                        <AlertCircle className="w-10 h-10 text-red-500 opacity-50" />
                        <div>
                            <p className="text-red-500 font-black uppercase text-[11px] tracking-[0.3em] mb-3">Sync Failure Detected</p>
                            <p className="text-red-300/60 text-sm font-medium leading-relaxed max-w-lg">{error}</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => window.location.reload()} className="px-8 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/20 rounded-full transition-all">Reload</button>
                            <button onClick={toggleDemo} className="px-8 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 rounded-full transition-all">Enable Demo Mode</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Overlay */}
            <div className="p-8 pb-16 bg-gradient-to-t from-black via-black/90 to-transparent">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
                    <div className="absolute -inset-0.5 bg-emerald-500/10 rounded-[3rem] blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                    <div className="relative bg-[#080808] border border-zinc-900 rounded-[3rem] shadow-3xl p-4 flex items-center gap-6 focus-within:border-zinc-800 transition-all">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                            placeholder="INITIALIZE SEARCH..."
                            className="flex-1 bg-transparent border-none focus:ring-0 resize-none p-5 text-zinc-100 placeholder-zinc-800 font-black uppercase tracking-[0.2em] text-lg uppercase"
                            rows={1}
                        />
                        <button type="submit" disabled={!input.trim() || isLoading} className="w-20 h-20 bg-emerald-500 text-black rounded-full flex items-center justify-center hover:bg-emerald-400 transition-all disabled:opacity-5 active:scale-95 shadow-2xl">
                            <Send className={cn("w-7 h-7", isLoading && "animate-pulse")} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
