import Sidebar from "@/components/Sidebar";
import ChatInterface from "@/components/ChatInterface";

export default function Home() {
    return (
        <main className="flex h-screen w-full bg-background text-foreground overflow-hidden">
            <Sidebar />
            <ChatInterface />
        </main>
    );
}
