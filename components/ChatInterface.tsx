"use client";

import { useChat, type Message } from "ai/react";
import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChatInterface() {
    const { messages, input, setInput, handleInputChange, handleSubmit, append, isLoading, error } = useChat({
        api: '/api/engine',
        onResponse: (response: Response) => {
            console.log(">>>> [CLIENT] Response received:", response.status);
        },
        onFinish: (message: Message) => {
            console.log(">>>> [CLIENT] Stream finished:", message.content.substring(0, 50));
        },
        onError: (err: any) => {
            console.error("CRITICAL Chat Error Trace:", err);
            // @ts-ignore
            window.LAST_ERROR = err;
        }
    });

    const checkServerStatus = async () => {
        try {
            // Test 1: GET
            const res = await fetch('/api/engine');
            const data = await res.json();

            // Test 2: POST (Pong)
            let pongStatus = "Checking...";
            try {
                const postRes = await fetch('/api/engine', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ test: 'pong' })
                });
                const postData = await postRes.json();
                pongStatus = postRes.ok ? `SUCCESS (${postData.message})` : `FAILED (${postRes.status})`;
            } catch (e) {
                pongStatus = `ERROR: ${e}`;
            }

            // Test 3: MOCK STREAM (POST)
            let mockStatus = "Checking...";
            try {
                const mockRes = await fetch('/api/engine', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ test: 'mock' })
                });
                const mockText = await mockRes.text();
                mockStatus = mockRes.ok ? `SUCCESS (${mockText.length} bytes)` : `FAILED (${mockRes.status})`;
            } catch (e) {
                mockStatus = `MOCK ERROR: ${e}`;
            }

            // Test 4: REAL AI (POST)
            let aiStatus = "Checking...";
            try {
                const aiRes = await fetch('/api/engine', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ test: 'diagnostic' })
                });
                const aiData = await aiRes.json();
                if (aiData.success) {
                    aiStatus = `SUCCESS (${aiData.text}) | Model: ${aiData.modelUsed} | Models: ${aiData.available?.join(', ')}`;
                } else {
                    aiStatus = `FAILED: ${aiData.error}`;
                }
            } catch (e) {
                aiStatus = `AI ERROR: ${e}`;
            }

            alert(`ENGINE API DIAGNOSTICS (v12):\n\n1. GET: ${data.keyLength} chars (HINT: ${data.keyHint})\n2. POST PONG: ${pongStatus}\n3. MOCK STREAM: ${mockStatus}\n4. POST AI: ${aiStatus}\n\nNOTE: If keyHint starts with "sk-p" it is likely correct. If it starts with "OPEN", you pasted the wrong text into Vercel.`);
        } catch (e) {
            alert(`Failed diagnostics: ${e}`);
        }
    };

    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (error) {
            console.error("DEBUG - Caught error in useEffect:", error);
            // @ts-ignore
            window.LAST_ERROR = error;
        }
    }, [error]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles([...files, ...Array.from(e.target.files)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleSubmitWithFiles = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim() && files.length === 0) return;

        let finalInput = input;

        if (files.length > 0) {
            setIsUploading(true);
            try {
                const uploadedFiles = await Promise.all(
                    files.map(async (file) => {
                        const response = await fetch(`/api/upload?filename=${file.name}`, {
                            method: 'POST',
                            body: file,
                        });
                        const blob = await response.json();
                        return blob.url;
                    })
                );

                const fileLinks = uploadedFiles.map(url => `[File Attachment](${url})`).join('\n');
                finalInput = `${input}\n\nAttachments:\n${fileLinks}`;
            } catch (error) {
                console.error("Upload failed:", error);
            } finally {
                setIsUploading(false);
            }
        }

        append({ role: 'user', content: finalInput });
        setInput("");
        setFiles([]);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#111]">
            {/* Header */}
            <header className="h-16 border-b border-[#2f2f2f] flex items-center px-6 justify-between bg-black/50 backdrop-blur-xl z-20">
                <div className="flex items-center gap-4">
                    <h1 className="font-bold text-xl tracking-tight text-white">Result Dashboard</h1>
                    <button
                        onClick={checkServerStatus}
                        className="text-[9px] bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1 rounded-full border border-red-500/20 transition-all font-black uppercase tracking-tighter"
                    >
                        Check Core Connection
                    </button>
                </div>
                <div className="text-right">
                    <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">SYSTEM ACTIVE v12</span>
                </div>
            </header>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 md:p-12 space-y-8 scroll-smooth"
            >
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                        <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
                            <Plus className="w-8 h-8 opacity-50" />
                        </div>
                        <p className="text-2xl font-light text-zinc-400">Launch a new query</p>
                    </div>
                ) : (
                    messages.map((m: Message) => (
                        <div
                            key={m.id}
                            className={cn(
                                "flex gap-6 max-w-4xl mx-auto items-start group animation-slide-up",
                                m.role === "user" ? "justify-end" : "justify-start"
                            )}
                        >
                            {m.role !== "user" && (
                                <div className="w-10 h-10 rounded-xl bg-[#10a37f] flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#10a37f]/20">
                                    <span className="text-[10px] font-bold">AI</span>
                                </div>
                            )}
                            <div
                                className={cn(
                                    "p-6 rounded-2xl max-w-[90%] border shadow-xl relative transition-all",
                                    m.role === "user"
                                        ? "bg-zinc-800 text-zinc-100 border-zinc-700"
                                        : "bg-zinc-900/50 text-zinc-100 border-zinc-800 backdrop-blur-sm"
                                )}
                            >
                                {m.role !== "user" && (
                                    <div className="text-[10px] font-black text-[#10a37f] uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                        <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-pulse shadow-[0_0_8px_#10a37f]"></div>
                                        Result Response:
                                    </div>
                                )}
                                <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed font-medium">
                                    {m.content || (isLoading && m.role !== 'user' ? "Generating dashboard results..." : "Waiting for response...")}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {error && (
                    <div className="max-w-4xl mx-auto p-6 bg-red-950/20 border border-red-900/50 rounded-2xl text-red-400 text-sm space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                            <span className="font-bold tracking-widest uppercase">Critical Analysis Error</span>
                        </div>
                        <div className="bg-black/60 p-4 rounded-xl border border-red-900/30 font-mono text-xs overflow-x-auto leading-loose">
                            {error.message}
                        </div>
                        <button onClick={() => window.location.reload()} className="text-[10px] font-bold underline uppercase tracking-tighter opacity-50 hover:opacity-100 transition-opacity">Reset Engine</button>
                    </div>
                )}

                {/* Spacer for build footer */}
                <div className="h-20"></div>
            </div>

            {/* Persistent Build Badge (Fixed at bottom right) */}
            <div className="fixed bottom-24 right-6 z-50 pointer-events-none">
                <div className="bg-blue-600/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-blue-400/30 shadow-2xl flex items-center gap-3">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-[9px] text-white font-black uppercase tracking-[0.2em] whitespace-nowrap">
                        Final Sync: March 6, 2026 - 9:00 PM
                    </span>
                </div>
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-8 pt-0 bg-gradient-to-t from-[#111] via-[#111] to-transparent z-10">
                <div className="max-w-4xl mx-auto relative bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl transition-all focus-within:border-zinc-700">
                    {files.length > 0 && (
                        <div className="p-4 flex flex-wrap gap-2 border-b border-zinc-800 bg-zinc-900/50 rounded-t-3xl">
                            {files.map((file, i) => (
                                <div key={i} className="bg-zinc-800 p-2 rounded-xl flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border border-zinc-700/50">
                                    <span className="truncate max-w-[120px]">{file.name}</span>
                                    <button onClick={() => removeFile(i)} className="hover:text-red-400 transition-colors">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleSubmitWithFiles} className="flex items-center p-3">
                        <input type="file" ref={fileInputRef} className="hidden" multiple onChange={onFileChange} />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-4 hover:bg-zinc-800 rounded-2xl text-zinc-500 transition-all hover:text-white group"
                            title="Attach data source"
                        >
                            <Paperclip className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        </button>
                        <textarea
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    if (input.trim() || files.length > 0) {
                                        const form = e.currentTarget.form;
                                        if (form) form.requestSubmit();
                                    }
                                }
                            }}
                            placeholder="Input your dashboard query..."
                            className="flex-1 bg-transparent border-none focus:ring-0 resize-none p-4 max-h-48 scrollbar-hide text-zinc-100 placeholder-zinc-600 font-medium"
                            rows={1}
                        />
                        <button
                            type="submit"
                            disabled={(!input.trim() && files.length === 0) || isUploading || isLoading}
                            className="p-4 bg-white text-black rounded-2xl disabled:opacity-10 hover:bg-zinc-200 transition-all shadow-lg active:scale-95"
                        >
                            <Send className={cn("w-5 h-5", (isUploading || isLoading) && "animate-pulse")} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
