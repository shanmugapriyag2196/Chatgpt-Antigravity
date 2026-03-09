"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Send,
    Plus,
    Search,
    Image as ImageIcon,
    LayoutGrid,
    Code2,
    PlusCircle,
    Mic,
    MoreHorizontal,
    CircleUser,
    Settings,
    FileUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
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
    const [showSettings, setShowSettings] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Persistence (History) ---
    useEffect(() => {
        const saved = localStorage.getItem("chat_v24_history");
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
        localStorage.setItem("chat_v24_history", JSON.stringify(updatedChats));
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
            alert(`File Selected: ${file.name}. (Upload integration in progress)`);
        }
    };

    const loadChat = (chat: ChatHistory) => {
        setCurrentChatId(chat.id);
        setMessages(chat.messages);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { id: Math.random().toString(36).substring(7), role: "user", content: input };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInput("");
        setIsLoading(true);

        // Assistant placeholder
        const assistantId = Math.random().toString(36).substring(7);
        const assistantMsg: Message = { id: assistantId, role: "assistant", content: "" };
        setMessages([...updatedMessages, assistantMsg]);

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
                                // Filter out diagnostics from v23 backend
                                if (!text.includes("[HANDSHAKE") && !text.includes("ACTIVE]") && !text.includes("VERIFIER")) {
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

            // Save to history
            const finalAssistantMsg: Message = { id: assistantId, role: "assistant", content: fullAssistantContent };
            const finalMessages = [...updatedMessages, finalAssistantMsg];

            let updatedChats: ChatHistory[];
            if (currentChatId) {
                updatedChats = chats.map(c => c.id === currentChatId ? { ...c, messages: finalMessages } : c);
            } else {
                const newId = Math.random().toString(36).substring(7);
                const newChat: ChatHistory = {
                    id: newId,
                    title: userMsg.content.slice(0, 30) + "...",
                    messages: finalMessages,
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
            {/* --- Sidebar --- */}
            <aside className="w-[260px] bg-[#f9f9f9] border-r border-[#e5e5e5] flex flex-col p-3 overflow-hidden">
                {/* Top Action */}
                <button
                    onClick={startNewChat}
                    className="flex items-center justify-between w-full p-3 h-10 hover:bg-[#ececec] rounded-lg transition-colors group mb-6"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 flex items-center justify-center">
                            <PlusCircle className="w-5 h-5 text-[#0d0d0d]" />
                        </div>
                        <span className="text-[14px] font-medium text-[#0d0d0d]">New chat</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <LayoutGrid className="w-4 h-4 text-zinc-400" />
                    </div>
                </button>

                {/* Secondary Icons */}
                <div className="flex flex-col gap-1 mb-8">
                    {[
                        { icon: Search, label: "Search chats" },
                        { icon: ImageIcon, label: "Images" },
                        { icon: LayoutGrid, label: "Apps" },
                        { icon: Code2, label: "Codex" }
                    ].map((item, idx) => (
                        <button key={idx} className="flex items-center gap-3 w-full p-3 hover:bg-[#ececec] rounded-lg transition-colors">
                            <item.icon className="w-4 h-4 text-[#424242]" />
                            <span className="text-[14px] font-normal text-[#0d0d0d]">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* GPTs Section */}
                <div className="flex-1 overflow-y-auto">
                    <div className="px-3 mb-2">
                        <span className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider">GPTs</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        {[
                            { title: "Standardized Meeting Temp...", img: "📄" },
                            { title: "Prompt Engineer", img: "⚡" },
                            { title: "Python", img: "🐍" },
                            { title: "THOR Log File Reviewer", img: "📊" },
                            { title: "Explore GPTs", img: "🧩" }
                        ].map((gpt, idx) => (
                            <button key={idx} className="flex items-center gap-3 w-full p-3 hover:bg-[#ececec] rounded-lg transition-colors text-left">
                                <span className="w-5 h-5 flex items-center justify-center text-[12px]">{gpt.img}</span>
                                <span className="text-[13px] font-normal text-[#0d0d0d] truncate">{gpt.title}</span>
                            </button>
                        ))}
                    </div>

                    {/* Chat History List */}
                    {chats.length > 0 && (
                        <div className="mt-8">
                            <div className="px-3 mb-2">
                                <span className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider">Recent</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                {chats.map(chat => (
                                    <button
                                        key={chat.id}
                                        onClick={() => loadChat(chat)}
                                        className={cn(
                                            "w-full text-left p-2.5 rounded-lg text-[13px] hover:bg-[#ececec] truncate transition-colors",
                                            currentChatId === chat.id ? "bg-[#ececec]" : "text-[#424242]"
                                        )}
                                    >
                                        {chat.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / User Profile */}
                <div className="mt-auto border-t border-[#e5e5e5] pt-3">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="flex items-center gap-3 w-full p-3 hover:bg-[#ececec] rounded-lg transition-colors relative"
                    >
                        <div className="w-8 h-8 rounded-full bg-[#e5e5e5] flex items-center justify-center text-[#9b9b9b] font-bold text-[10px]">
                            SP
                        </div>
                        <div className="flex flex-col items-start overflow-hidden">
                            <span className="text-[14px] font-medium text-[#0d0d0d] truncate">Shanmuga Priya</span>
                            <span className="text-[12px] text-[#8e8e93]">Free</span>
                        </div>
                    </button>
                    <button className="flex items-center gap-3 w-full p-3 h-10 hover:bg-[#ececec] rounded-lg transition-colors mt-2">
                        <LayoutGrid className="w-4 h-4 text-[#424242]" />
                        <span className="text-[13px] font-medium text-[#0d0d0d]">Claim offer</span>
                    </button>
                </div>
            </aside>

            {/* --- Main Chat --- */}
            <main className="flex-1 flex flex-col relative bg-white">
                {/* Top Nav */}
                <header className="h-14 flex items-center px-6 justify-between border-b border-[#f0f0f0]">
                    <div className="flex items-center gap-1 group cursor-pointer">
                        <span className="text-[18px] font-semibold text-[#424242]">ChatGPT</span>
                        <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-[#f0f2ff] px-3 py-1 rounded-full flex items-center gap-2">
                            <div className="w-2 h-2 bg-[#708dff] rounded-full"></div>
                            <span className="text-[12px] font-medium text-[#708dff]">Free offer</span>
                        </div>
                        <CircleUser className="w-6 h-6 text-zinc-300" />
                    </div>
                </header>

                {/* Messages Container */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-0">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center">
                            <h1 className="text-[28px] font-semibold text-[#0d0d0d] mb-8">What are you working on?</h1>
                        </div>
                    ) : (
                        <div className="max-w-[760px] mx-auto py-10 space-y-10">
                            {messages.map((m) => (
                                <div key={m.id} className="flex gap-4 group">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-[14px]",
                                        m.role === "user" ? "bg-zinc-100 text-zinc-500" : "bg-[#10a37f] text-white"
                                    )}>
                                        {m.role === "user" ? "U" : "A"}
                                    </div>
                                    <div className="flex-1 pt-1">
                                        <div className="text-[16px] leading-[1.6] text-[#2c2c2c] whitespace-pre-wrap">
                                            {m.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-4 animate-pulse">
                                    <div className="w-8 h-8 rounded-full bg-[#10a37f]/50"></div>
                                    <div className="flex-1 bg-zinc-100 h-6 rounded w-[400px]"></div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Settings Overlay (User Info) */}
                {showSettings && (
                    <div className="absolute bottom-[80px] left-6 w-[280px] bg-white border border-[#e5e5e5] rounded-2xl shadow-2xl z-50 p-4 animation-slide-up">
                        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-[#f0f0f0]">
                            <div className="w-10 h-10 rounded-full bg-[#f0f0f0] flex items-center justify-center text-zinc-400 font-bold">SP</div>
                            <div className="flex flex-col">
                                <span className="text-[15px] font-bold text-[#0d0d0d]">Shanmuga Priya</span>
                                <span className="text-[12px] text-zinc-400 truncate">priyag@example.com</span>
                            </div>
                        </div>
                        <button className="flex items-center gap-3 w-full p-2.5 hover:bg-[#f9f9f9] rounded-lg transition-colors text-[14px]">
                            <Settings className="w-4 h-4" /> <span>Settings</span>
                        </button>
                    </div>
                )}

                {/* Input Area */}
                <div className="pb-10 pt-2 bg-gradient-to-t from-white via-white to-transparent">
                    <div className="max-w-[760px] mx-auto relative px-4 md:px-0">
                        <form onSubmit={handleSubmit} className="relative group">
                            <div className="flex items-center w-full min-h-[52px] bg-[#f4f4f4] rounded-[26px] pr-3 pl-1 shadow-sm border border-transparent focus-within:border-[#e5e5e5] transition-all overflow-hidden">
                                {/* Upload Icon (+) */}
                                <button
                                    type="button"
                                    onClick={handleUploadClick}
                                    className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-[#0d0d0d] transition-colors rounded-full"
                                >
                                    <Plus className="w-5 h-5" />
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
                                    placeholder="Ask anything"
                                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-4 px-2 text-[16px] text-[#0d0d0d] placeholder-zinc-400"
                                    rows={1}
                                />

                                <div className="flex items-center gap-1">
                                    <button type="button" className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-[#0d0d0d]">
                                        <Mic className="w-5 h-5" />
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || isLoading}
                                        className={cn(
                                            "w-8 h-8 flex items-center justify-center rounded-full transition-all",
                                            input.trim() ? "bg-[#0d0d0d] text-white" : "bg-[#e5e5e5] text-white cursor-not-allowed"
                                        )}
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </form>
                        <p className="text-center text-[12px] text-zinc-400 mt-4 px-10">
                            ChatGPT can make mistakes. Check important info.
                        </p>
                    </div>
                </div>

                {/* Hidden File Input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />
            </main>
        </div>
    );
}
