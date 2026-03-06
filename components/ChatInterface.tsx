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

    const checkServerStatus = async () => {
        try {
            const res = await fetch('/api/engine');
            const data = await res.json();
            alert(`ENGINE API DIAGNOSTICS (v13):\n\nStatus: ${data.status}\nKey: ${data.keyHint}\n\nConnection is LIVE. If chat fails, check browser console for stream errors.`);
        } catch (e) {
            alert(`Failed diagnostics: ${e}`);
        }
    };

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<File[]>([]);

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

    const updateLastMessage = (content: string) => {
        setMessages(prev => {
            const last = prev[prev.length - 1];
            if (!last || last.role !== "assistant") return prev;
            return [...prev.slice(0, -1), { ...last, content: last.content + content }];
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && files.length === 0) || isLoading) return;

        setError(null);
        setIsLoading(true);

        const currentInput = input;
        setInput("");
        appendMessage("user", currentInput);

        // Assistant placeholder
        const assistantId = appendMessage("assistant", "");

        try {
            const response = await fetch('/api/engine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [...messages, { role: "user", content: currentInput }] })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `Server responded with ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextEncoder();
            const textDecoder = new TextDecoder();

            if (!reader) throw new Error("No stream reader available");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = textDecoder.decode(value);
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (!line.trim()) continue;
                    // Vercel AI Data Stream Protocol: 0:"text"
                    if (line.startsWith('0:')) {
                        try {
                            const text = JSON.parse(line.substring(2));
                            setMessages(prev => {
                                const newMessages = [...prev];
                                const last = newMessages[newMessages.length - 1];
                                if (last.id === assistantId) {
                                    last.content += text;
                                }
                                return newMessages;
                            });
                        } catch (e) {
                            console.error("Failed to parse chunk:", line);
                            // Fallback: just append the raw text if JSON parse fails
                            updateLastMessage(line.substring(2).replace(/"/g, ''));
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error("Chat Error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#111]">
            <header className="h-16 border-b border-[#2f2f2f] flex items-center px-6 justify-between bg-black/50 backdrop-blur-xl z-20">
                <div className="flex items-center gap-4">
                    <h1 className="font-bold text-xl tracking-tight text-white">Result Dashboard v13</h1>
                    <button onClick={checkServerStatus} className="text-[10px] bg-red-500/10 text-red-500 px-3 py-1 rounded-full border border-red-500/20 font-black uppercase tracking-tighter">Check Connection</button>
                </div>
                <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">MANUAL STREAMING ACTIVE</span>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-12 space-y-8 scroll-smooth">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                        <Plus className="w-12 h-12 opacity-50 mb-4" />
                        <p className="text-xl font-light">Enter your query below</p>
                    </div>
                ) : (
                    messages.map((m) => (
                        <div key={m.id} className={cn("flex gap-6 max-w-4xl mx-auto items-start group animation-slide-up", m.role === "user" ? "justify-end" : "justify-start")}>
                            {m.role !== "user" && <div className="w-10 h-10 rounded-xl bg-[#10a37f] flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#10a37f]/20 font-bold text-[10px]">AI</div>}
                            <div className={cn("p-6 rounded-2xl max-w-[90%] border shadow-xl relative transition-all", m.role === "user" ? "bg-zinc-800 text-zinc-100 border-zinc-700" : "bg-zinc-900/50 text-zinc-100 border-zinc-800 backdrop-blur-sm")}>
                                {m.role !== "user" && (
                                    <div className="text-[10px] font-black text-[#10a37f] uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                        <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-pulse shadow-[0_0_8px_#10a37f]"></div>
                                        Result Response:
                                    </div>
                                )}
                                <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed font-medium">
                                    {m.content || (isLoading && m.role !== 'user' ? "Awaiting stream..." : "")}
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {error && (
                    <div className="max-w-4xl mx-auto p-6 bg-red-950/20 border border-red-900/50 rounded-2xl text-red-500 text-xs">
                        <p className="font-bold uppercase mb-2">SYSTEM ERROR</p>
                        <p className="opacity-80">{error}</p>
                    </div>
                )}
            </div>

            <div className="fixed bottom-24 right-6 pointer-events-none">
                <div className="bg-red-600/90 px-4 py-1.5 rounded-full border border-red-400/30 shadow-2xl flex items-center gap-3">
                    <span className="text-[9px] text-white font-black uppercase tracking-[0.2em]">MANUAL SYNC: v13 - 9:30 PM</span>
                </div>
            </div>

            <div className="p-4 md:p-8 pt-0 bg-gradient-to-t from-[#111] via-[#111] to-transparent">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex p-3">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                        placeholder="Enter your dashboard query..."
                        className="flex-1 bg-transparent border-none focus:ring-0 resize-none p-4 text-zinc-100"
                        rows={1}
                    />
                    <button type="submit" disabled={!input.trim() || isLoading} className="p-4 bg-white text-black rounded-2xl hover:bg-zinc-200 disabled:opacity-50">
                        <Send className={cn("w-5 h-5", isLoading && "animate-pulse")} />
                    </button>
                </form>
            </div>
        </div>
    );
}
