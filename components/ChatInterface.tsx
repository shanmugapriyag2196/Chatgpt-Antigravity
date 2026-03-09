"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Send,
    Plus,
    PlusCircle,
    Mic,
    MoreHorizontal,
    Settings,
    FileUp,
    Paperclip,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    isUpload?: boolean;
    fileName?: string;
}

interface ChatHistory {
    id: string;
    title: string;
    messages: Message[];
    timestamp: number;
}

export default function ChatInterface() {
    // --- State ---
    const [chats, setChats] = useState<ChatHistory[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Persistence (History) ---
    useEffect(() => {
        const saved = localStorage.getItem("chat_v27_history");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setChats(parsed);
            } catch (e) {
                console.error("Failed to load history", e);
            }
        }
    }, []);

    const saveHistory = useCallback((updatedChats: ChatHistory[]) => {
        setChats(updatedChats);
        localStorage.setItem("chat_v27_history", JSON.stringify(updatedChats));
    }, []);

    // --- Scroll Control ---
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // --- Actions ---
    const startNewChat = () => {
        setMessages([]);
        setCurrentChatId(null);
        setInput("");
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                // Add upload bubble
                const uploadMsg: Message = {
                    id: Math.random().toString(36).substring(7),
                    role: "user",
                    content: `[FILE UPLOADED: ${file.name}]\\n\\nPlease transform this resume into the Value Global Standard Format.`,
                    isUpload: true,
                    fileName: file.name
                };
                setMessages(prev => [...prev, uploadMsg]);
                // Automatically submit for transformation
                triggerTransformation(content, file.name);
            };
            reader.readAsText(file);
        }
    };

    const triggerTransformation = async (fileContent: string, fileName: string) => {
        setIsAnalyzing(true);
        setIsLoading(true);

        const assistantId = Math.random().toString(36).substring(7);
        const assistantMsg: Message = { id: assistantId, role: "assistant", content: "" };
        setMessages(prev => [...prev, assistantMsg]);

        try {
            const response = await fetch('/api/engine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: "user", content: `Here is the resume content for ${fileName}:\\n\\n${fileContent}\\n\\nPlease format it according to Value Global standards.` }
                    ]
                })
            });

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullAssistantContent = "";

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split("\n");

                    for (const line of lines) {
                        if (line.startsWith('0:')) {
                            try {
                                const text = JSON.parse(line.substring(2));
                                if (!text.includes("[HANDSHAKE") && !text.includes("ACTIVE]") && !text.includes("FORGE") && !text.includes("VERIFIER")) {
                                    fullAssistantContent += text;
                                    setMessages(prev => {
                                        const next = [...prev];
                                        const last = next[next.length - 1];
                                        if (last && last.id === assistantId) {
                                            last.content = fullAssistantContent;
                                        }
                                        return next;
                                    });
                                }
                            } catch (e) { }
                        }
                    }
                }
            }

            // Auto-save history after successful transformation
            const finalAssistantMsg: Message = { id: assistantId, role: "assistant", content: fullAssistantContent };
            const newId = Math.random().toString(36).substring(7);
            const newChat: ChatHistory = {
                id: newId,
                title: `Resume: ${fileName}`,
                messages: [...messages, finalAssistantMsg],
                timestamp: Date.now()
            };
            saveHistory([newChat, ...chats]);
            setCurrentChatId(newId);

        } catch (err) {
            console.error("Transformation Error", err);
        } finally {
            setIsLoading(false);
            setIsAnalyzing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { id: Math.random().toString(36).substring(7), role: "user", content: input };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInput("");
        setIsLoading(true);

        const assistantId = Math.random().toString(36).substring(7);
        setMessages([...updatedMessages, { id: assistantId, role: "assistant", content: "" }]);

        try {
            const response = await fetch('/api/engine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: updatedMessages })
            });

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullAssistantContent = "";

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split("\n");

                    for (const line of lines) {
                        if (line.startsWith('0:')) {
                            try {
                                const text = JSON.parse(line.substring(2));
                                if (!text.includes("[HANDSHAKE") && !text.includes("ACTIVE]") && !text.includes("FORGE") && !text.includes("VERIFIER")) {
                                    fullAssistantContent += text;
                                    setMessages(prev => {
                                        const next = [...prev];
                                        const last = next[next.length - 1];
                                        if (last && last.id === assistantId) {
                                            last.content = fullAssistantContent;
                                        }
                                        return next;
                                    });
                                }
                            } catch (e) { }
                        }
                    }
                }
            }

            // Save history
            const finalAssistantMsg: Message = { id: assistantId, role: "assistant", content: fullAssistantContent };
            const finalHistory = [...updatedMessages, finalAssistantMsg];

            let updatedChats: ChatHistory[];
            if (currentChatId) {
                updatedChats = chats.map(c => c.id === currentChatId ? { ...c, messages: finalHistory } : c);
            } else {
                const newId = Math.random().toString(36).substring(7);
                const newChat: ChatHistory = {
                    id: newId,
                    title: userMsg.content.slice(0, 30) + "...",
                    messages: finalHistory,
                    timestamp: Date.now()
                };
                updatedChats = [newChat, ...chats];
                setCurrentChatId(newId);
            }
            saveHistory(updatedChats);

        } catch (err) {
            console.error("Chat Error", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full bg-white text-[#0d0d0d] font-sans selection:bg-[#10a37f]/20">
            {/* --- Sidebar (Refined v27) --- */}
            <aside className="w-[260px] bg-[#f9f9f9] border-r border-[#e5e5e5] flex flex-col p-3 overflow-hidden">
                <button
                    onClick={startNewChat}
                    className="flex items-center justify-between w-full p-3 h-12 hover:bg-[#ececec] rounded-xl transition-colors group mb-4"
                >
                    <div className="flex items-center gap-3">
                        <PlusCircle className="w-5 h-5 text-[#0d0d0d]" />
                        <span className="text-[14px] font-semibold text-[#0d0d0d]">New Agent Task</span>
                    </div>
                </button>

                <div className="flex-1 overflow-y-auto mt-2">
                    {chats.length > 0 && (
                        <div className="space-y-4">
                            <div className="px-3">
                                <span className="text-[11px] font-bold text-[#8e8e93] uppercase tracking-widest">Recent history</span>
                            </div>
                            <div className="flex flex-col gap-0.5 px-1">
                                {chats.map(chat => (
                                    <button
                                        key={chat.id}
                                        onClick={() => { setCurrentChatId(chat.id); setMessages(chat.messages); }}
                                        className={cn(
                                            "w-full text-left p-3 rounded-lg text-[13px] hover:bg-[#ececec] truncate transition-all",
                                            currentChatId === chat.id ? "bg-[#ececec] font-medium" : "text-[#424242]"
                                        )}
                                    >
                                        {chat.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-auto border-t border-[#e5e5e5] pt-4 pb-2">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="flex items-center gap-3 w-full p-3 hover:bg-[#ececec] rounded-xl transition-colors relative"
                    >
                        <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center text-white font-black text-[10px] shadow-sm">
                            SP
                        </div>
                        <div className="flex flex-col items-start overflow-hidden">
                            <span className="text-[14px] font-bold text-[#0d0d0d] truncate">Shanmuga Priya</span>
                            <span className="text-[12px] text-[#8e8e93]">Free account</span>
                        </div>
                    </button>

                    {showSettings && (
                        <div className="absolute bottom-[84px] left-3 w-[236px] bg-white border border-[#e5e5e5] rounded-2xl shadow-2xl z-50 p-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <div className="flex items-center gap-3 mb-3 p-2">
                                <div className="w-10 h-10 rounded-full bg-[#f0f0f0] flex items-center justify-center text-zinc-400 font-bold">SP</div>
                                <div className="flex flex-col">
                                    <span className="text-[14px] font-bold text-[#0d0d0d]">Shanmuga Priya</span>
                                    <span className="text-[11px] text-zinc-400 truncate">Settings & Profile</span>
                                </div>
                            </div>
                            <button className="flex items-center gap-3 w-full p-2.5 hover:bg-[#f9f9f9] rounded-lg transition-colors text-[13px]">
                                <Settings className="w-4 h-4 text-zinc-500" /> <span>Settings</span>
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* --- Main Chat --- */}
            <main className="flex-1 flex flex-col relative bg-white">
                <header className="h-14 flex items-center px-6 justify-between border-b border-[#f9f9f9]/10">
                    <div className="flex items-center gap-2 group cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
                        <span className="text-[16px] font-bold text-[#424242]">Value Global AI Agent</span>
                        <MoreHorizontal className="w-4 h-4 text-zinc-300" />
                    </div>
                </header>

                <div ref={scrollRef} className="flex-1 overflow-y-auto w-full">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center -mt-20">
                            <h1 className="text-[32px] font-bold text-[#0d0d0d] mb-12 tracking-tight">How can I assist you today?</h1>
                            {isAnalyzing && (
                                <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-700">
                                    <Loader2 className="w-12 h-12 text-[#10a37f] animate-spin" />
                                    <span className="text-[14px] font-bold text-[#10a37f] uppercase tracking-widest animate-pulse">Executing Agent Task...</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="max-w-[720px] mx-auto py-12 space-y-12">
                            {messages.map((m) => (
                                <div key={m.id} className="flex gap-5 group animate-in slide-in-from-bottom-4 duration-500">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-[13px] border shrink-0 shadow-sm",
                                        m.role === "user" ? "bg-white border-zinc-200 text-zinc-400" : "bg-[#10a37f] border-[#10a37f] text-white"
                                    )}>
                                        {m.role === "user" ? "User" : "Agent"}
                                    </div>
                                    <div className="flex-1 pt-1">
                                        {m.isUpload ? (
                                            <div className="bg-[#f9f9f9] border border-[#e5e5e5] rounded-3xl p-6 flex items-center gap-5 w-fit shadow-sm relative overflow-hidden group/upload">
                                                <div className="absolute inset-0 bg-gradient-to-r from-[#10a37f]/5 to-transparent opacity-0 group-hover/upload:opacity-100 transition-opacity duration-700"></div>
                                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-zinc-100 shadow-sm relative">
                                                    <FileUp className="w-6 h-6 text-[#10a37f]" />
                                                </div>
                                                <div className="flex flex-col relative">
                                                    <span className="text-[14px] font-bold text-[#0d0d0d]">{m.fileName}</span>
                                                    <span className="text-[11px] text-[#10a37f] font-bold uppercase tracking-wider">Task Context Attached</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-[16px] leading-[1.8] text-[#0d0d0d] whitespace-pre-wrap font-regular markdown-custom">
                                                {m.content}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && !isAnalyzing && (
                                <div className="flex gap-5 animate-pulse">
                                    <div className="w-8 h-8 rounded-full bg-[#10a37f]/80 flex items-center justify-center text-white text-[11px]">Agent</div>
                                    <div className="flex-1 pt-3 space-y-3">
                                        <div className="h-4 bg-zinc-100 rounded-full w-[90%]"></div>
                                        <div className="h-4 bg-zinc-100 rounded-full w-[70%]"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="pb-10 pt-4 bg-white">
                    <div className="max-w-[760px] mx-auto relative px-4">
                        <form onSubmit={handleSubmit} className="relative group">
                            <div className="flex items-center w-full min-h-[60px] bg-[#f4f4f4] rounded-[30px] pr-4 pl-3 border border-transparent focus-within:ring-2 focus-within:ring-[#10a37f]/10 focus-within:border-[#e5e5e5] transition-all duration-300">
                                <button
                                    type="button"
                                    onClick={startNewChat}
                                    title="New Chat"
                                    className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-[#0d0d0d] hover:bg-white rounded-full transition-all"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>

                                <button
                                    type="button"
                                    onClick={handleUploadClick}
                                    title="Upload & Transform Resume"
                                    className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-[#10a37f] hover:bg-white rounded-full transition-all"
                                >
                                    <Paperclip className="w-5 h-5" />
                                </button>

                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit(e);
                                        }
                                    }}
                                    placeholder="Command the AI Agent or Upload Task..."
                                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-4 px-3 text-[16px] text-[#0d0d0d] placeholder-zinc-500 font-medium"
                                    rows={1}
                                />

                                <div className="flex items-center gap-2">
                                    <button type="button" className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-[#0d0d0d] rounded-full transition-colors">
                                        <Mic className="w-5 h-5" />
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || isLoading}
                                        className={cn(
                                            "w-10 h-10 flex items-center justify-center rounded-full transition-all shadow-md",
                                            input.trim() ? "bg-[#0d0d0d] text-white hover:bg-[#10a37f]" : "bg-[#e5e5e5] text-white cursor-not-allowed"
                                        )}
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </form>
                        <p className="text-center text-[12px] text-zinc-400 mt-4 font-bold opacity-40 uppercase tracking-widest">
                            Value Global Intelligence v29
                        </p>
                    </div>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".txt,.docx,.pdf,.md"
                />
            </main>
        </div>
    );
}
