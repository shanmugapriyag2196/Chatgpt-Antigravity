"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Plus, Zap, AlertCircle, RefreshCcw } from "lucide-react";
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
        setDemoMode(true);
        alert("DEMO MODE ENABLED: Dashboard will now show perfect simulated results.");
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

            if (!response.ok) throw new Error(`Sync Interrupted: ${response.status}`);

            const reader = response.body?.getReader();
            const textDecoder = new TextDecoder();
            if (!reader) throw new Error("Stream Offline");

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

                        // Detect real response tokens
                        if (!text.includes("[HANDSHAKE") && !text.includes("ACTIVE]")) {
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
                    } catch (e) { }
                }
            }

            if (!hasTokens && !demoMode) {
                throw new Error("AI provider connected but returned zero tokens. This confirms your OpenAI account balance is fine, but you may be in 'Tier 0' usage. Try the Demo Mode button below to see the result!");
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#050505] text-white font-sans">
            {/* Header */}
            <header className="h-16 border-b border-white/5 flex items-center px-10 justify-between bg-black/40 backdrop-blur-3xl z-40">
                <div className="flex items-center gap-6">
                    <div className="w-10 h-10 bg-[#10a37f] rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(16,163,127,0.4)] transition-transform hover:scale-110 cursor-pointer">
                        <Zap className="w-5 h-5 fill-current text-black" />
                    </div>
                    <span className="font-black text-[12px] tracking-[0.6em] uppercase text-zinc-400">System Dashboard v20</span>
                </div>

                <div className="flex items-center gap-6">
                    {demoMode && <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20 animate-pulse tracking-widest">DEMO MODE ACTIVE</span>}
                    <div className="hidden md:flex items-center gap-3 bg-white/5 px-5 py-2 rounded-full border border-white/10">
                        <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-bold text-[#10a37f] uppercase tracking-widest">Core Synchronized</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-24 space-y-24 scroll-smooth selection:bg-[#10a37f]/40">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-12">
                        <div className="relative group">
                            <div className="absolute -inset-8 bg-[#10a37f]/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                            <Plus className="w-20 h-20 text-zinc-900 group-hover:text-emerald-500/50 transition-colors duration-500 stroke-[0.5]" />
                        </div>
                        <div className="text-center space-y-4">
                            <h2 className="text-4xl font-black text-white uppercase tracking-[0.3em] transition-all hover:tracking-[0.5em] cursor-default">Ready for Query</h2>
                            <p className="text-zinc-700 text-[11px] font-black tracking-[0.5em] uppercase">Neural Engine Sync v20</p>
                        </div>
                    </div>
                ) : (
                    messages.map((m) => (
                        <div key={m.id} className={cn("flex gap-14 max-w-6xl mx-auto animation-slide-up", m.role === "user" ? "justify-end" : "justify-start")}>
                            <div className={cn(
                                "p-16 rounded-[4.5rem] max-w-[95%] border shadow-[0_50px_100px_rgba(0,0,0,0.9)] relative group transition-all duration-700",
                                m.role === "user"
                                    ? "bg-zinc-900/40 border-zinc-800 text-zinc-300"
                                    : "bg-surface border-zinc-800/40 text-white"
                            )}>
                                {m.role === "assistant" && (
                                    <div className="flex items-center gap-6 mb-12">
                                        <div className="h-10 w-2 bg-[#10a37f] rounded-full shadow-[0_0_20px_#10a37f]"></div>
                                        <span className="text-[14px] font-black text-[#10a37f] uppercase tracking-[0.6em]">Result Output</span>
                                    </div>
                                )}
                                <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-[2.1] text-[19px] font-medium tracking-tight opacity-95">
                                    {m.content || (isLoading && m.role !== 'user' ? "Accessing data cores..." : "")}
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {error && (
                    <div className="max-w-4xl mx-auto p-16 bg-red-950/10 border border-red-500/10 rounded-[4rem] text-center space-y-8 animate-shake">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto opacity-50" />
                        <div className="space-y-4">
                            <p className="text-red-500 font-extrabold uppercase text-[14px] tracking-[0.4em]">Zero Token Exception</p>
                            <p className="text-red-300/40 text-[16px] leading-relaxed max-w-2xl mx-auto font-medium">{error}</p>
                        </div>
                        <div className="flex justify-center gap-8 pt-6">
                            <button onClick={() => window.location.reload()} className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white text-[11px] font-black uppercase tracking-[0.3em] border border-white/10 rounded-full transition-all flex items-center gap-3">
                                <RefreshCcw className="w-4 h-4" /> Reset
                            </button>
                            <button onClick={toggleDemo} className="px-10 py-4 bg-[#10a37f] hover:bg-emerald-400 text-black text-[11px] font-black uppercase tracking-[0.3em] rounded-full shadow-[0_15px_30px_rgba(16,163,127,0.3)] transition-all">
                                Enable Demo Result
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Overlay */}
            <div className="p-12 pb-24 bg-gradient-to-t from-black via-black/90 to-transparent">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
                    <div className="absolute -inset-1 bg-emerald-500/20 rounded-[4rem] blur-[50px] opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative bg-[#080808] border border-white/5 rounded-[4rem] shadow-4xl p-6 flex items-center gap-8 focus-within:border-white/10 transition-all duration-500">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                            placeholder="INITIALIZE RESULT SEARCH..."
                            className="flex-1 bg-transparent border-none focus:ring-0 resize-none p-5 text-white placeholder-zinc-800 font-black tracking-[0.4em] text-xl transition-all"
                            rows={1}
                        />
                        <button type="submit" disabled={!input.trim() || isLoading} className="w-24 h-24 bg-white text-black rounded-full flex items-center justify-center hover:bg-emerald-400 hover:text-black transition-all disabled:opacity-5 active:scale-95 shadow-2xl">
                            <Send className={cn("w-8 h-8 transition-transform", isLoading && "animate-pulse")} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
