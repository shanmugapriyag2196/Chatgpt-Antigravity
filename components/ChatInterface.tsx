"use client";

import { useChat, type Message } from "ai/react";
import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChatInterface() {
    const { messages, input, setInput, handleInputChange, handleSubmit, append, isLoading, error } = useChat({
        api: '/api/engine',
        onResponse: (response) => {
            console.log(">>>> [CLIENT] Response received:", response.status);
        },
        onFinish: (message) => {
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
                    aiStatus = `SUCCESS (${aiData.text}) | Reason: ${aiData.finishReason} | Usage: ${aiData.usage?.totalTokens || 0}`;
                } else {
                    aiStatus = `FAILED: ${aiData.error}`;
                }
            } catch (e) {
                aiStatus = `AI ERROR: ${e}`;
            }

            alert(`ENGINE API DIAGNOSTICS (v7):\n\n1. GET: ${data.keyLength} chars (HINT: ${data.keyHint})\n2. POST PONG: ${pongStatus}\n3. MOCK STREAM: ${mockStatus}\n4. POST AI: ${aiStatus}\n\nNOTE: If keyHint starts with "sk-p" it is likely correct. If it starts with "OPEN", you pasted the wrong text into Vercel.`);
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
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Header */}
            <header className="h-14 border-b border-[#2f2f2f] flex items-center px-4 justify-between bg-background/50 backdrop-blur-md z-10">
                <div className="flex items-center gap-4">
                    <h1 className="font-semibold text-lg">ChatGPT Clone</h1>
                    <button
                        onClick={checkServerStatus}
                        className="text-[10px] bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 px-2 py-1 rounded border border-blue-500/30 transition-all font-bold"
                    >
                        DEBUG: Check Connection
                    </button>
                </div>
            </header>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth"
            >
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-[#b4b4b4]">
                        <div className="w-12 h-12 bg-[#3c3c3c] rounded-full flex items-center justify-center mb-4">
                            <Plus className="w-6 h-6" />
                        </div>
                        <p className="text-xl font-medium text-foreground">How can I help you today?</p>
                    </div>
                ) : (
                    messages.map((m: Message) => (
                        <div
                            key={m.id}
                            className={cn(
                                "flex gap-4 max-w-3xl mx-auto items-start group animation-slide-up",
                                m.role === "user" ? "justify-end" : "justify-start"
                            )}
                        >
                            {m.role !== "user" && (
                                <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center text-white shrink-0">
                                    <span className="text-xs">AI</span>
                                </div>
                            )}
                            <div
                                className={cn(
                                    "p-4 rounded-2xl max-w-[85%]",
                                    m.role === "user"
                                        ? "bg-[#3c3c3c] text-[#ececec]"
                                        : "bg-transparent text-[#ececec]"
                                )}
                            >
                                <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
                                    {m.content}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {error && (
                    <div className="max-w-3xl mx-auto p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">⚠️ SERVER ERROR DETECTED</span>
                        </div>
                        <div className="bg-black/40 p-3 rounded-lg border border-red-500/10 font-mono text-xs overflow-x-auto">
                            <p className="font-semibold text-red-500 mb-1">Server Message:</p>
                            <p className="text-white">
                                {(() => {
                                    try {
                                        const parsed = JSON.parse(error.message);
                                        return parsed.details?.message || parsed.message || error.message;
                                    } catch (e) {
                                        return error.message || "The server failed to respond with a message.";
                                    }
                                })()}
                            </p>
                            <p className="mt-4 font-semibold text-yellow-500 mb-1">Raw Technical Data:</p>
                            <pre className="whitespace-pre-wrap opacity-60">
                                {JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}
                            </pre>
                        </div>

                        <p className="font-semibold text-yellow-500 underline mb-0 uppercase tracking-widest text-[10px]">Action: Check Vercel Logs or Redeploy</p>

                        <div className="pt-2">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors text-xs font-semibold"
                            >
                                Refresh Page & Try Again
                            </button>
                        </div>
                    </div>
                )}
                {isLoading && (
                    <div className="flex gap-4 max-w-3xl mx-auto items-start group animation-pulse">
                        <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center text-white shrink-0">
                            <span className="text-xs">AI</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-transparent text-[#ececec]">
                            <div className="flex gap-1 items-center h-6">
                                <div className="w-1.5 h-1.5 bg-[#b4b4b4] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-1.5 h-1.5 bg-[#b4b4b4] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-1.5 h-1.5 bg-[#b4b4b4] rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div className="text-center py-4 opacity-100">
                    <span className="text-[10px] text-white font-bold uppercase tracking-widest bg-red-600 px-3 py-1 rounded-full animate-pulse">
                        LATEST BUILD: March 6, 2026 - 6:45 PM
                    </span>
                </div>
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-8 pt-0">
                <div className="max-w-3xl mx-auto relative bg-[#2f2f2f] rounded-2xl border border-[#3e3e3e] shadow-xl">
                    {/* File Previews */}
                    {files.length > 0 && (
                        <div className="p-3 flex flex-wrap gap-2 border-b border-[#3e3e3e]">
                            {files.map((file, i) => (
                                <div key={i} className="bg-[#3c3c3c] p-2 rounded-lg flex items-center gap-2 text-sm">
                                    <span className="truncate max-w-[150px]">{file.name}</span>
                                    <button onClick={() => removeFile(i)} className="hover:text-red-400">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmitWithFiles}
                        className="flex items-end p-2"
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple
                            onChange={onFileChange}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 hover:bg-[#3c3c3c] rounded-xl text-[#b4b4b4] transition-colors"
                        >
                            <Paperclip className="w-5 h-5" />
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
                            placeholder="Message ChatGPT..."
                            className="flex-1 bg-transparent border-none focus:ring-0 resize-none p-3 max-h-48 scrollbar-hide text-[#ececec] placeholder-[#b4b4b4]"
                            rows={1}
                        />
                        <button
                            type="submit"
                            disabled={(!input.trim() && files.length === 0) || isUploading}
                            className="p-3 bg-foreground text-background rounded-xl disabled:opacity-30 disabled:hover:bg-foreground hover:bg-[#d1d1d1] transition-all"
                        >
                            <Send className={cn("w-5 h-5", (isUploading || isLoading) && "animate-pulse")} />
                        </button>
                    </form>
                    <div className="text-[10px] text-center text-[#b4b4b4] pb-2">
                        ChatGPT can make mistakes. Check important info.
                    </div>
                </div>
            </div>
        </div>
    );
}
