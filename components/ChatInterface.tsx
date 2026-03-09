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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<File[]>([]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const checkServerStatus = async () => {
        try {
            const res = await fetch('/api/engine');
            const data = await res.json();
            alert(`ENGINE API DIAGNOSTICS (v14):\n\nStatus: ${data.status}\nKey: ${data.keyHint}\n\nModel set to GPT-4. Manual streaming active.`);
        } catch (e) {
            alert(`Failed diagnostics: ${e}`);
        }
    };

    const appendMessage = (role: Message["role"], content: string) => {
        const id = Math.random().toString(36).substring(7);
        setMessages(prev => [...prev, { id, role, content }]);
        return id;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && files.length === 0) || isLoading) return;

        setError(null);
        setIsLoading(true);

        const currentInput = input;
        setInput("");
        appendMessage("user", currentInput);

        // Preparation for assistant response
        const assistantId = appendMessage("assistant", "");

        try {
            const response = await fetch('/api/engine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [...messages, { role: "user", content: currentInput }] })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `Server Error: ${response.status}`);
            }

            const reader = response.body?.getReader();
            const textDecoder = new TextDecoder();

            if (!reader) throw new Error("Stream interrupted");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = textDecoder.decode(value, { stream: true });
                // protocol 0:"text"
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (!line.startsWith('0:')) continue;
                    try {
                        const jsonStr = line.substring(2);
                        const text = JSON.parse(jsonStr);

                        setMessages(prev => {
                            const next = [...prev];
                            const last = next[next.length - 1];
                            if (last && last.id === assistantId) {
                                last.content += text;
                            }
                            return next;
                        });
                    } catch (e) {
                        // ignore malformed protocol lines
                    }
                }
            }
        } catch (err: any) {
            console.error("Manual Stream Error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#0a0a0a]">
            {/* Header */}
            <header className="h-16 border-b border-zinc-800/50 flex items-center px-6 justify-between bg-black/60 backdrop-blur-2xl z-20">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#10a37f] to-[#0d8b6c] rounded-lg flex items-center justify-center text-white shadow-lg">
                        <span className="text-[10px] font-black">AI</span>
                    </div>
                    <h1 className="font-bold text-lg tracking-tight text-white uppercase tracking-widest text-[11px]">Dashboard Controller</h1>
                    <button onClick={checkServerStatus} className="text-[9px] bg-white/5 hover:bg-white/10 text-white/50 px-3 py-1 rounded-full border border-white/10 font-bold transition-all">CONNECTION</button>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">ENGINE v14</span>
                </div>
            </header>

            {/* Content Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-12 space-y-12 scroll-smooth">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center">
                        <div className="text-zinc-800 text-6xl font-black mb-4 select-none">GPT-4</div>
                        <p className="text-zinc-600 text-sm font-medium tracking-widest uppercase">System Standby</p>
                    </div>
                ) : (
                    messages.map((m) => (
                        <div key={m.id} className={cn("flex gap-8 max-w-4xl mx-auto animation-slide-up", m.role === "user" ? "justify-end" : "justify-start")}>
                            <div className={cn("p-8 rounded-3xl max-w-[90%] border shadow-2xl relative transition-all", m.role === "user" ? "bg-zinc-900 border-zinc-800 text-zinc-200" : "bg-[#111] border-zinc-800/50 text-zinc-100")}>
                                {m.role !== "user" && (
                                    <div className="text-[9px] font-black text-[#10a37f] uppercase tracking-[0.3em] mb-6 flex items-center gap-4">
                                        <div className="w-3 h-0.5 bg-[#10a37f]"></div>
                                        Result Response
                                    </div>
                                )}
                                <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-[15px] font-medium opacity-90">
                                    {m.content || (isLoading && m.role !== 'user' ? "Compiling results..." : "")}
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {error && (
                    <div className="max-w-4xl mx-auto p-6 bg-red-950/30 border border-red-500/20 rounded-3xl text-red-500 text-[10px] font-bold tracking-widest uppercase text-center">
                        {error}
                    </div>
                )}
            </div>

            {/* Fixed Footer Badge */}
            <div className="fixed bottom-32 right-8 z-50 pointer-events-none">
                <div className="bg-green-600 px-6 py-2 rounded-full border border-green-400 shadow-[0_0_20px_rgba(22,163,74,0.4)] flex items-center gap-3">
                    <span className="text-[10px] text-white font-black uppercase tracking-[0.3em]">v14 - SUCCESSFUL HANDSHAKE</span>
                </div>
            </div>

            {/* Input Overlay */}
            <div className="p-8 pt-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#10a37f] to-zinc-800 rounded-[2rem] opacity-20 group-focus-within:opacity-40 transition-opacity blur"></div>
                    <div className="relative bg-zinc-900 border border-zinc-800 rounded-[2rem] shadow-2xl flex p-4 items-center gap-4">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                            placeholder="Type query..."
                            className="flex-1 bg-transparent border-none focus:ring-0 resize-none p-4 text-zinc-100 placeholder-zinc-700 font-bold"
                            rows={1}
                        />
                        <button type="submit" disabled={!input.trim() || isLoading} className="w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center hover:bg-zinc-200 transition-all disabled:opacity-20 active:scale-90">
                            <Send className={cn("w-6 h-6", isLoading && "animate-pulse")} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
