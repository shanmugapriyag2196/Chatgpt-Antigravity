"use client";

import { Plus, History, Settings, ExternalLink } from "lucide-react";

export default function Sidebar() {
    return (
        <div className="hidden md:flex flex-col w-64 bg-[#171717] h-full p-3 border-r border-[#2f2f2f]">
            <button className="flex items-center gap-2 p-3 hover:bg-[#212121] rounded-lg transition-colors mb-4">
                <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center">
                    <History className="w-5 h-5 text-background" />
                </div>
                <span className="font-medium">New Chat</span>
                <Plus className="w-4 h-4 ml-auto text-[#b4b4b4]" />
            </button>

            <div className="flex-1 overflow-y-auto space-y-1">
                <div className="px-3 py-2 text-xs font-semibold text-[#b4b4b4] uppercase">Yesterday</div>
                {[1, 2, 3].map((i) => (
                    <button key={i} className="w-full text-left p-3 hover:bg-[#212121] rounded-lg text-sm text-[#ececec] truncate">
                        Implementing Next.js App
                    </button>
                ))}
            </div>

            <div className="mt-auto pt-4 border-t border-[#2f2f2f] space-y-1">
                <button className="flex items-center gap-3 w-full p-2 hover:bg-[#212121] rounded-lg text-sm transition-colors">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                </button>
                <button className="flex items-center gap-3 w-full p-2 hover:bg-[#212121] rounded-lg text-sm transition-colors">
                    <ExternalLink className="w-4 h-4" />
                    <span>Help & Feedback</span>
                </button>
            </div>
        </div>
    );
}
