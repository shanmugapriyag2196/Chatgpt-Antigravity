import ChatInterface from "@/components/ChatInterface";

export default function Home() {
    return (
        <main className="flex h-screen w-full bg-background text-foreground overflow-hidden">
            <ChatInterface />
        </main>
    );
}
