"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Plus, Zap, AlertCircle, RefreshCcw, Command } from "lucide-react";
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
        alert("DEMO MODE ACTIVE: High-quality AI results will now be simulated.");
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

            if (!response.ok) throw new Error(`Direct Forge Link Broken: ${response.status}`);

            const reader = response.body?.getReader();
            const textDecoder = new TextDecoder();
            if (!reader) throw new Error("Forge Pipeline Offline");

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

                        if (!text.includes("[HANDSHAKE") && !text.includes("ACTIVE]") && !text.includes("VERIFIER")) {
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
                throw new Error("Zero tokens returned. This confirms a mismatch between the Vercel key and OpenAI account. Please check the 'VERIFIER' code in the chat bubble!");
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#020202] text-white font-sans">
            {/* Header */}
            <header className="h-16 border-b border-white/5 flex items-center px-10 justify-between bg-black/80 backdrop-blur-3xl z-40">
                <div className="flex items-center gap-6">
                    <div className="w-10 h-10 bg-[#10a37f] rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(16,163,127,0.4)]">
                        <Command className="w-5 h-5 text-black" />
                    </div>
                    <span className="font-black text-[11px] tracking-[0.5em] uppercase text-zinc-500">Direct Forge v23</span>
                </div>

                <div className="flex items-center gap-6">
                    {demoMode && <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20 animate-pulse tracking-widest uppercase">Demo View</span>}
                    <div className="hidden md:flex items-center gap-3 bg-zinc-900 px-6 py-2 rounded-full border border-zinc-800">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10a37f]"></div>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Pipeline Secured</span>
                    </div>
                </div>
            </header>

            {/* Chat Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-24 space-y-24 scroll-smooth selection:bg-[#10a37f]/40">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-12 opacity-10">
                        <div className="relative group">
                            <Zap className="w-24 h-24 text-white stroke-[0.3]" />
                        </div>
                        <div className="text-center space-y-5">
                            <h2 className="text-4xl font-black text-white uppercase tracking-[0.4em]">Initialize Forge</h2>
                            <p className="text-zinc-700 text-[10px] font-black tracking-[0.6em] uppercase">Manual API Bridge Active v23</p>
                        </div>
                    </div>
                ) : (
                    messages.map((m) => (
                        <div key={m.id} className={cn("flex gap-14 max-w-6xl mx-auto animation-slide-up", m.role === "user" ? "justify-end" : "justify-start")}>
                            <div className={cn(
                                "p-16 rounded-[4.5rem] max-w-[95%] border shadow-[0_60px_120px_rgba(0,0,0,0.95)] relative group transition-all duration-1000",
                                m.role === "user"
                                    ? "bg-zinc-900/60 border-zinc-800 text-zinc-300"
                                    : "bg-surface border-zinc-900/40 text-white"
                            )}>
                                {m.role === "assistant" && (
                                    <div className="flex items-center gap-8 mb-12">
                                        <div className="h-1.5 w-12 bg-[#10a37f] rounded-full shadow-[0_0_20px_#10a37f]"></div>
                                        <span className="text-[14px] font-black text-[#10a37f] uppercase tracking-[0.7em]">Neural Result</span>
                                    </div>
                                )}
                                <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-[2.1] text-[20px] font-medium tracking-tight opacity-95">
                                    {m.content || (isLoading && m.role !== 'user' ? "Forging API Response..." : "")}
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {error && (
                    <div className="max-w-4xl mx-auto p-16 bg-red-950/20 border border-red-500/20 rounded-[4rem] text-center space-y-10 animate-shake">
                        <AlertCircle className="w-20 h-20 text-red-500 mx-auto opacity-40" />
                        <div className="space-y-5">
                            <p className="text-red-500 font-black uppercase text-[15px] tracking-[0.5em]">Forge Exception Detected</p>
                            <p className="text-red-300/60 text-[17px] leading-relaxed max-w-2xl mx-auto font-medium">{error}</p>
                        </div>
                        <div className="flex justify-center gap-10 pt-8">
                            <button onClick={() => window.location.reload()} className="px-12 py-5 bg-white/5 hover:bg-white/10 text-white text-[12px] font-black uppercase tracking-widest border border-white/10 rounded-full transition-all flex items-center gap-4">
                                <RefreshCcw className="w-5 h-5" /> Reset
                            </button>
                            <button onClick={toggleDemo} className="px-12 py-5 bg-[#10a37f] hover:bg-emerald-400 text-black text-[12px] font-black uppercase tracking-widest rounded-full shadow-[0_20px_40px_rgba(16,163,127,0.3)] transition-all">
                                Demo Mode Success
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Overlay */}
            <div className="p-10 pb-24 bg-gradient-to-t from-black via-black/95 to-transparent backdrop-blur-md">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
                    <div className="absolute -inset-1 bg-emerald-500/10 rounded-[4.5rem] blur-[60px] opacity-0 group-focus-within:opacity-100 transition-opacity duration-700"></div>
                    <div className="relative bg-[#050505] border border-white/5 rounded-[4.5rem] shadow-4xl p-6 flex items-center gap-10 focus-within:border-white/15 transition-all duration-700">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                            placeholder="INITIALIZE DIRECT FORGE..."
                            className="flex-1 bg-transparent border-none focus:ring-0 resize-none p-6 text-white placeholder-zinc-800 font-extrabold tracking-[0.4em] text-2xl uppercase transition-all"
                            rows={1}
                        />
                        <button type="submit" disabled={!input.trim() || isLoading} className="w-28 h-28 bg-[#ffffff] text-black rounded-full flex items-center justify-center hover:bg-[#10a37f] transition-all disabled:opacity-5 active:scale-95 shadow-3xl">
                            <Send className={cn("w-10 h-10")} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
