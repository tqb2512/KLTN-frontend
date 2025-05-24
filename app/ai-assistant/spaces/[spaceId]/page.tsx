"use client";
import FlashCardDialog from "@/components/flash-card";import MindMapDialog from "@/components/mind-map";import MarkdownDialog from "@/components/markdown";import AIMessage from "@/components/ai-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { getAccessToken, getCurrentUser } from "@/utils/local_user";
import { createClient } from "@/utils/supabase/client";
import { EllipsisVertical, Map, MessageSquareText, MessageSquare, Plus, Search, Send, SquareArrowOutUpRight, Loader2, Bot, User } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import Link from "next/link";
import { use, useEffect, useState, useRef } from "react";

type Space = {
    id: string;
    title: string;
    space_sources: {
        id: string;
        document_info: {
            id: string;
            title: string;
        }
    }[]
    created_at: string;
    space_notes: {
        id: string;
        title: string;
        type: string;
        created_at: string;
    }[]
}

type ChatMessage = {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: string;
}

type ChatSession = {
    id: string;
    session_id: string;
    created_at: string;
    messages: JSON;
}

type DiscoverSource = {
    title: string;
    url: string;
}

export default function SpaceDetails({ params }: { params: Promise<{ spaceId: string }> }) {
    const { spaceId } = use(params);
    const [space, setSpace] = useState<Space | null>(null);
    const [sources, setSources] = useState<Space['space_sources']>([]);
    const [selected_sources, setSelectedSources] = useState<string[]>([]);
    const [session_id, setSessionId] = useState<string | null>(uuidv4());
    const [chat_session, setChatSession] = useState<ChatSession | null>(null);
    const [chat_message, setChatMessage] = useState<string>("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [discover_prompt, setDiscoverPrompt] = useState<string>("");
    const [discover_sources, setDiscoverSources] = useState<DiscoverSource[]>([]);
    const [discover_state, setDiscoverState] = useState<"prompt" | "loading" | "success" | "importing" | "error">("prompt");
    const [import_sources, setImportSources] = useState<string[]>([]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchSpace = async () => {
        const supabase = createClient(await getAccessToken());
        const { data, error } = await supabase
            .from('spaces')
            .select('*, space_sources(*, document_info:documents(*)), space_notes(id, title, type, created_at)')
            .eq('id', spaceId)
            .single();

        if (error) {
            console.error(error);
        } else {
            setSpace(data);
            setSources(data.space_sources);
        }
    };

    const discoverSources = async () => {
        setDiscoverState("loading");

        const response = await fetch("/n8n/webhook/sources-discover", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_input: discover_prompt,
                user_id: "1"
            })
        })

        const data = await response.json();
        if (response.ok) {
            setDiscoverSources(data);
            setDiscoverState("success");
        } else {
            setDiscoverState("error");
        }
        setDiscoverPrompt("");
    }

    const importSources = async () => {
        setDiscoverState("importing");
        const user = await getCurrentUser();

        if (user) {
            const response = await fetch("/n8n/webhook/import-sources-to-space", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    space_id: spaceId,
                    urls: import_sources,
                    user_id: user.id
                })
            })

            if (response.ok) {
                setImportSources([]);
                setDiscoverState("prompt");
                fetchSpace();
            } else {
                console.error("Failed to import sources");
            }
        }
    }

    const sendMessage = async () => {
        if (!chat_message.trim() || isLoading) return;

        const user = await getCurrentUser();
        if (!user) return;

        const userMessage: ChatMessage = {
            id: uuidv4(),
            content: chat_message,
            role: 'user',
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setChatMessage("");
        setIsLoading(true);

        try {
            const response = await fetch("/n8n/webhook/chat", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: session_id,
                    user_id: user.id,
                    chat_input: userMessage.content,
                    sources: selected_sources
                })
            });

            if (response.ok) {
                const data = await response.json();
                const assistantMessage: ChatMessage = {
                    id: uuidv4(),
                    content: data.output || "I apologize, but I couldn't generate a response at this time.",
                    role: 'assistant',
                    timestamp: new Date().toISOString()
                };
                setMessages(prev => [...prev, assistantMessage]);
            } else {
                const errorMessage: ChatMessage = {
                    id: uuidv4(),
                    content: "Sorry, there was an error processing your message. Please try again.",
                    role: 'assistant',
                    timestamp: new Date().toISOString()
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            const errorMessage: ChatMessage = {
                id: uuidv4(),
                content: "Sorry, there was an error processing your message. Please try again.",
                role: 'assistant',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        fetchSpace();
    }, [spaceId]);

    return (<div className="h-screen flex flex-row gap-4 p-4">
        <div className="w-[25%] rounded-xl bg-gray-50 border-none shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)]">
            <h1 className="text-lg font-medium p-3">Sources</h1>
            <hr className="border-t border-gray-200" />
            <div className="flex flex-row gap-2 p-3">
                <Button variant="outline" className="flex-1 border border-gray-200 bg-white hover:bg-gray-100">
                    <Plus />
                    <p>Add</p>
                </Button>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1 border border-gray-200 bg-white hover:bg-gray-100">
                            <Search />
                            <p>Discover</p>
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle>Discover Sources</DialogTitle>
                        <hr className="border-t border-gray-200" />
                        {
                            discover_state === "prompt" && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-col items-center">
                                        <div className="rounded-full bg-gray-100 p-2">
                                            <Search className="w-4 h-4" />
                                        </div>
                                        <h1>What are you interested in?</h1>
                                    </div>
                                    <Textarea placeholder="Describe something you want to learn..." value={discover_prompt} onChange={(e) => setDiscoverPrompt(e.target.value)} />
                                    <div className="flex flex-row gap-2 items-center justify-end">
                                        <Button onClick={discoverSources} variant="outline" className="border cursor-pointer border-gray-200 bg-white hover:bg-gray-100">
                                            Submit
                                        </Button>
                                    </div>
                                </div>
                            )
                        }
                        {
                            discover_state === "loading" && (
                                <div className="flex flex-col gap-2 items-center justify-center">
                                    <p className="text-gray-500">Discovering sources based on your prompt...</p>
                                    <div className="flex flex-row gap-2 items-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                                    </div>
                                </div>
                            )
                        }
                        {
                            (discover_state === "success" || discover_state === "importing") && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-row gap-2 items-center justify-between px-2">
                                        <p className="text-sm text-gray-500">Select All Sources</p>
                                        <Checkbox
                                            className="hover:cursor-pointer"
                                            checked={import_sources.length === discover_sources.length}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setImportSources(discover_sources.map((source) => source.url));
                                                } else {
                                                    setImportSources([]);
                                                }
                                            }}
                                            disabled={discover_state === "importing"}
                                        />
                                    </div>

                                    {discover_sources.map((source, idx) => (
                                        <div key={idx} className="flex flex-row gap-2 items-center hover:bg-gray-100 p-2 rounded-md justify-between">
                                            <div className="flex flex-row gap-2 items-center">
                                                <p className="line-clamp-1">{source.title}</p>
                                                <Link href={source.url} target="_blank" className="rounded-full bg-gray-100 p-1 cursor-pointer">
                                                    <SquareArrowOutUpRight className="w-3 h-3" />
                                                </Link>
                                            </div>
                                            <Checkbox
                                                className="hover:cursor-pointer"
                                                checked={import_sources.includes(source.url)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setImportSources([...import_sources, source.url]);
                                                    } else {
                                                        setImportSources(import_sources.filter((url) => url !== source.url));
                                                    }
                                                }}
                                                disabled={discover_state === "importing"}
                                            />
                                        </div>
                                    ))}
                                    <hr className="border-t border-gray-200" />
                                    <div className="flex flex-row gap-2 items-center justify-end">
                                        <Button disabled={discover_state === "importing"} onClick={() => {
                                            setDiscoverState("prompt");
                                            setDiscoverSources([]);
                                            setImportSources([]);
                                        }} variant="outline" className="border cursor-pointer border-gray-200 bg-white hover:bg-gray-100">
                                            <p>Cancel</p>
                                        </Button>
                                        <Button disabled={discover_state === "importing"} onClick={importSources} variant="outline" className="border cursor-pointer border-gray-200 bg-white hover:bg-gray-100">
                                            <p>{discover_state === "importing" ? "Importing..." : "Import"}</p>
                                        </Button>
                                    </div>
                                </div>
                            )
                        }
                    </DialogContent>
                </Dialog>
            </div>
            <div className="flex flex-col gap-2 p-3">
                <div className="flex flex-row gap-2 items-center justify-between px-2">
                    <p className="text-sm text-gray-500">Select All Sources</p>
                    <Checkbox
                        className="hover:cursor-pointer"
                        checked={selected_sources.length === sources.length}
                        onCheckedChange={(checked) => {
                            setSelectedSources(checked ? sources.map((source) => source.document_info.id) : []);
                        }}
                    />
                </div>
                {sources.map((source) => (
                    <div key={source.id} className="flex flex-row gap-2 items-center hover:bg-gray-100 p-2 rounded-md justify-between">
                        <div className="flex flex-row gap-2 items-center font-medium">
                            <EllipsisVertical className="shrink-0 w-4" />
                            <p className="line-clamp-1 text-sm">{source.document_info.title}</p>
                        </div>
                        <Checkbox
                            className="hover:cursor-pointer"
                            checked={selected_sources.includes(source.document_info.id)}
                            onCheckedChange={(checked) => {
                                if (checked) {
                                    setSelectedSources([...selected_sources, source.document_info.id]);
                                } else {
                                    setSelectedSources(selected_sources.filter((id) => id !== source.document_info.id));
                                }
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
        <div className="w-[40%] rounded-xl bg-gray-50 border-none shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] flex flex-col">
            <h1 className="text-lg font-medium p-3">Chat</h1>
            <hr className="border-t border-gray-200" />

            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="p-4 space-y-4">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 py-16">
                            <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                            <p className="text-lg font-medium">Start a conversation</p>
                            <p className="text-sm">Ask questions about your sources or get help with your learning</p>
                        </div>
                    )}

                    {messages.map((message) => (
                        <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${message.role === 'user'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 text-gray-600'
                                    }`}>
                                    {message.role === 'user' ? (
                                        <User className="w-4 h-4" />
                                    ) : (
                                        <Bot className="w-4 h-4" />
                                    )}
                                </div>
                                                                 <div className={`rounded-lg px-4 py-2 ${message.role === 'user'                                         ? 'bg-blue-500 text-white'                                         : 'bg-white border border-gray-200'                                     }`}>                                     {message.role === 'user' ? (                                         <p className="text-sm whitespace-pre-wrap">{message.content}</p>                                     ) : (                                         <AIMessage content={message.content} />                                     )}                                     <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-400'                                         }`}>                                         {formatTime(message.timestamp)}                                     </p>                                 </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="flex gap-3 max-w-[80%]">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gray-200 text-gray-600">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <div className="rounded-lg px-4 py-2 bg-white border border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <p className="text-sm text-gray-500">Thinking...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            <hr className="border-t border-gray-200" />
            <div className="flex flex-row gap-2 p-3 items-center">
                <Input
                    placeholder="Ask anything about your sources..."
                    className="border-gray-200 bg-white"
                    value={chat_message}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                />
                <Button
                    variant="outline"
                    className="border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-50"
                    onClick={sendMessage}
                    disabled={isLoading || !chat_message.trim()}
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
            </div>
        </div>
        <div className="w-[35%] rounded-xl bg-gray-50 border-none shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)]">
            <h1 className="text-lg font-medium p-3">Studio</h1>
            <hr className="border-t border-gray-200" />
            <div className="grid grid-cols-2 gap-2 p-3">
                <Button variant="outline" className="border border-gray-200 bg-white hover:bg-gray-100">
                    <Map />
                    <p>Generate Mind Map</p>
                </Button>
                <Button variant="outline" className="border border-gray-200 bg-white hover:bg-gray-100">
                    <MessageSquareText />
                    <p>Study Guide</p>
                </Button>
            </div>
            <hr className="border-t border-gray-200" />
            <div className="p-3">
                <h1 className="text-lg font-medium">Notes</h1>
                {space?.space_notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((note) => {
                    switch (note.type) {
                        case "flash-card":
                            return <FlashCardDialog key={note.id} id={note.id} title={note.title} createdAt={note.created_at} />
                        case "mind-map":
                            return <MindMapDialog key={note.id} id={note.id} title={note.title} createdAt={note.created_at} />
                        case "markdown":
                            return <MarkdownDialog key={note.id} id={note.id} title={note.title} createdAt={note.created_at} />
                        default:
                            return <div key={note.id}>{note.title}</div>
                    }
                })}
            </div>
        </div>
    </div>

    )
}