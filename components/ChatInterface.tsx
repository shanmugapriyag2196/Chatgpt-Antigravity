"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, Plus } from "lucide-react";
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
                body: JSON.stringify({ messages: [{ role: "user", content: currentInput }] })
            });

            if (!response.ok) throw new Error(`Server Sync Error: ${response.status}`);

            const reader = response.body?.getReader();
            const textDecoder = new TextDecoder();
            if (!reader) throw new Error("Stream Reader Offline");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = textDecoder.decode(value);
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (!line.trim()) continue;

                    // Protocol 0: text
                    if (line.startsWith('0:')) {
                        try {
                            const text = JSON.parse(line.substring(2));
                            setMessages(prev => {
                                const next = [...prev];
                                const last = next[next.length - 1];
                                if (last && last.id === assistantId) {
                                    last.content += text;
                                }
                                return next;
                            });
                        } catch (e) {
                            // quiet error
                        }
                    } else if (line.startsWith('3:') || line.startsWith('e:')) {
                        // Error protocol
                        setError(`AI ENGINE ERROR: ${line.substring(2)}`);
                    }
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#050505] text-zinc-100 font-sans">
            {/* Minimal Header */}
            <header className="h-14 border-b border-zinc-900 flex items-center px-8 justify-between bg-black/40">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-pulse shadow-[0_0_10px_#10a37f]"></div>
                    <span className="font-black text-[10px] tracking-[0.4em] uppercase text-zinc-400">System Dashboard v15</span>
                </div>
            </header>

            {/* Chat Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-16 space-y-12">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                        <Plus className="w-16 h-16 stroke-[1]" />
                        <p className="mt-4 font-bold tracking-[0.2em] uppercase text-[12px]">Initialize Sync</p>
                    </div>
                ) : (
                    messages.map((m) => (
                        <div key={m.id} className={cn("flex gap-8 max-w-5xl mx-auto animation-slide-up", m.role === "user" ? "justify-end" : "justify-start")}>
                            <div className={cn("p-10 rounded-[2.5rem] max-w-[85%] border shadow-2xl relative transition-all", m.role === "user" ? "bg-zinc-900 border-zinc-800" : "bg-black border-zinc-800/80")}>
                                {m.role !== "user" && (
                                    <div className="text-[10px] font-black text-[#10a37f] uppercase tracking-[0.3em] mb-8 flex items-center gap-4">
                                        <div className="w-4 h-0.5 bg-[#10a37f]"></div>
                                        Result Output
                                    </div>
                                )}
                                <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-[16px] font-medium opacity-90">
                                    {m.content || (isLoading && m.role !== 'user' ? "Awaiting stream handshake..." : "")}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {error && (
                    <div className="max-w-4xl mx-auto p-6 bg-red-900/10 border border-red-500/20 rounded-3xl text-red-500 text-center font-black uppercase text-[10px] tracking-widest">
                        {error}
                    </div>
                )}
            </div>

            {/* Version Badge Footer */}
            <div className="fixed bottom-32 right-12 pointer-events-none group">
                <div className="bg-zinc-100 text-black px-8 py-3 rounded-full border border-white shadow-2xl flex items-center gap-4 transition-transform group-hover:scale-110">
                    <Send className="w-3 h-3" />
                    <span className="text-[11px] font-black uppercase tracking-[0.3em]">COMPATIBILITY MODE: v15 ACTIVE</span>
                </div>
            </div>

            {/* Input Overlay */}
            <div className="p-8 pb-12 bg-gradient-to-t from-black via-black to-transparent">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-zinc-700 to-zinc-900 rounded-[3rem] opacity-10 group-focus-within:opacity-30 blur-lg transition-opacity"></div>
                    <div className="relative bg-[#0a0a0a] border border-zinc-800/50 rounded-[3rem] shadow-3xl p-4 flex items-center gap-6">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                            placeholder="INITIALIZE SEARCH..."
                            className="flex-1 bg-transparent border-none focus:ring-0 resize-none p-4 text-zinc-100 placeholder-zinc-800 font-bold uppercase tracking-tighter text-xl"
                            rows={1}
                        />
                        <button type="submit" disabled={!input.trim() || isLoading} className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:bg-[#ccc] transition-all disabled:opacity-5 active:scale-90">
                            <Send className={cn("w-6 h-6", isLoading && "animate-spin")} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
