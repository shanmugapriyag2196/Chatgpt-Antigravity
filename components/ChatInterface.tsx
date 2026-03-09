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
        alert(demoMode ? "DEMO MODE DISABLED" : "DEMO MODE ENABLED: AI results will now be simulated.");
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

        try {
            const response = await fetch('/api/engine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: "user", content: currentInput }],
                    demoMode: demoMode
                })
            });

            if (!response.ok) throw new Error(`Network Sync Failed: ${response.status}`);

            const reader = response.body?.getReader();
            const textDecoder = new TextDecoder();
            if (!reader) throw new Error("Stream Reader Not Available");

            let hasContent = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = textDecoder.decode(value);
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (!line.startsWith('0:')) continue;
                    try {
                        const jsonStr = line.substring(2);
                        const text = JSON.parse(jsonStr);

                        hasContent = true;
                        setMessages(prev => {
                            const next = [...prev];
                            const last = next[next.length - 1];
                            if (last && last.id === assistantId) {
                                last.content += text;
                            }
                            return next;
                        });
                    } catch (e) {
                        // ignore malformed lines
                    }
                }
            }

            if (!hasContent) {
                throw new Error("AI Engine returned an empty result stream.");
            }

        } catch (err: any) {
            console.error("Sync Error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#020202] text-zinc-100 font-sans">
            {/* Header */}
            <header className="h-16 border-b border-zinc-900 flex items-center px-8 justify-between bg-black/80 backdrop-blur-3xl z-30">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black shadow-lg">
                        <Zap className="w-4 h-4 fill-current" />
                    </div>
                    <span className="font-black text-[10px] tracking-[0.5em] uppercase text-white">System Console v16</span>

                    <button
                        onClick={toggleDemo}
                        className={cn(
                            "px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
                            demoMode
                                ? "bg-amber-500/20 text-amber-500 border-amber-500/50 animate-pulse"
                                : "bg-zinc-900 text-zinc-600 border-zinc-800 hover:text-white"
                        )}
                    >
                        {demoMode ? "DEMO MODE ACTIVE" : "ENABLE DEMO MODE"}
                    </button>
                </div>

                <div className="flex items-center gap-3 bg-zinc-900/50 px-4 py-1 rounded-full border border-zinc-800">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Core Online</span>
                </div>
            </header>

            {/* Chat Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-20 space-y-16 selection:bg-emerald-500/30">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-8 opacity-30">
                        <div className="w-24 h-24 border-2 border-dashed border-zinc-800 rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]">
                            <Plus className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-black text-white uppercase tracking-[0.3em]">Ready for Query</h2>
                            <p className="text-zinc-600 text-[10px] font-bold mt-2 tracking-[0.2em] uppercase">Vercel Edge Runtime Active</p>
                        </div>
                    </div>
                ) : (
                    messages.map((m) => (
                        <div key={m.id} className={cn("flex gap-10 max-w-5xl mx-auto animation-slide-up", m.role === "user" ? "justify-end" : "justify-start")}>
                            <div className={cn(
                                "p-12 rounded-[3.5rem] max-w-[90%] border shadow-[0_0_50px_rgba(0,0,0,0.5)] relative group transition-all duration-500",
                                m.role === "user"
                                    ? "bg-zinc-900/80 border-zinc-800 text-zinc-200"
                                    : "bg-surface border-zinc-800/50 text-white"
                            )}>
                                {m.role === "assistant" && (
                                    <div className="flex items-center gap-4 mb-10">
                                        <div className="w-1.5 h-8 bg-emerald-500 rounded-full shadow-[0_0_15px_#10a37f]"></div>
                                        <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.4em]">Dashboard Analysis</span>
                                    </div>
                                )}
                                <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-[1.8] text-[17px] font-medium tracking-tight">
                                    {m.content || (isLoading && m.role !== 'user' ? "Accessing neural cores..." : "")}
                                </div>
                                {m.role === "assistant" && (
                                    <div className="absolute -bottom-4 right-12 bg-zinc-950 px-4 py-1 rounded-full border border-zinc-800 text-[9px] font-bold text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
                                        Verified Result
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                {error && (
                    <div className="max-w-4xl mx-auto p-8 bg-red-950/20 border border-red-500/30 rounded-[2rem] flex flex-col items-center gap-4 text-center">
                        <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                        <p className="text-red-500 font-black uppercase text-[12px] tracking-[0.2em]">Sync Interrupted</p>
                        <p className="text-red-400/80 text-sm font-medium leading-relaxed max-w-md">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/30 rounded-full transition-all"
                        >
                            Reset Connection
                        </button>
                    </div>
                )}
            </div>

            {/* Input Dashboard */}
            <div className="p-8 pb-16 bg-gradient-to-t from-black via-black/80 to-transparent backdrop-blur-md">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-zinc-800 rounded-[3rem] opacity-0 group-focus-within:opacity-20 blur-xl transition-opacity"></div>
                    <div className="relative bg-[#080808] border border-zinc-800 rounded-[3rem] shadow-3xl p-4 flex items-center gap-6 focus-within:border-zinc-700/50 transition-colors">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                            placeholder="INPUT QUERY PARAMETERS..."
                            className="flex-1 bg-transparent border-none focus:ring-0 resize-none p-5 text-white placeholder-zinc-800 font-black uppercase tracking-widest text-lg"
                            rows={1}
                        />
                        <button type="submit" disabled={!input.trim() || isLoading} className="w-20 h-20 bg-emerald-500 text-black rounded-full flex items-center justify-center hover:bg-emerald-400 transition-all disabled:opacity-5 disabled:grayscale active:scale-95 shadow-2xl shadow-emerald-500/20">
                            <Send className={cn("w-7 h-7", isLoading && "animate-pulse")} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
