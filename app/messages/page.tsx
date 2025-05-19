"use client";
import { timeAgo } from "@/components/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getAccessToken, getCurrentUser } from "@/utils/local_user";
import { createClient } from "@/utils/supabase/client";
import { PlusIcon, SendHorizonal } from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface Conversation {
    user_receive: {
        id: string;
        username: string;
        profile_picture_url: string;
    },
    last_message: {
        message: string;
        created_at: string;
    }
    messages: {
        id: string;
        user_id_send: string;
        user_id_receive: string;
        message: string;
        created_at: string;
    }[]
}

export default function Messages() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [message, setMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [selectedConversation?.messages]);

    useEffect(() => {
        if (selectedConversation) {
            scrollToBottom();
        }
    }, [selectedConversation]);

    useEffect(() => {
        const initUser = async () => {
            const user = await getCurrentUser();
            setCurrentUserId(user?.id || null);
        };
        initUser();
    }, []);

    useEffect(() => {
        const fetchConversations = async () => {
            const user = await getCurrentUser();
            const supabase = createClient(await getAccessToken());
            const { data: messages, error } = await supabase
                .from("messages")
                .select("id, user_id_send, user_id_receive, message, created_at")
                .or(`user_id_send.eq.${user?.id},user_id_receive.eq.${user?.id}`)
                .order("created_at", { ascending: false });

            if (error) {
                console.error(error);
            }

            if (messages) {
                const conversationMap = new Map();

                messages.forEach((message) => {
                    const otherUserId = message.user_id_send === user?.id
                        ? message.user_id_receive
                        : message.user_id_send;

                    if (!conversationMap.has(otherUserId)) {
                        conversationMap.set(otherUserId, {
                            user_receive: {
                                id: otherUserId,
                                username: "",
                                profile_picture_url: ""
                            },
                            last_message: message,
                            messages: [message]
                        });
                    } else {
                        const conversation = conversationMap.get(otherUserId);
                        conversation.messages.push(message);
                        if (new Date(message.created_at) > new Date(conversation.last_message.created_at)) {
                            conversation.last_message = message;
                        }
                    }
                });

                const { data: usersData, error: usersError } = await supabase
                    .from("users")
                    .select("id, username, profile_picture_url")
                    .in("id", Array.from(conversationMap.keys()));

                if (usersError) {
                    console.error(usersError);
                }

                if (usersData) {
                    usersData.forEach((user: { id: string; username: string; profile_picture_url: string }) => {
                        const conversation = conversationMap.get(user.id);
                        conversation.user_receive.username = user.username;
                        conversation.user_receive.profile_picture_url = user.profile_picture_url;
                    });
                }

                setConversations(Array.from(conversationMap.values()));
                console.log(Array.from(conversationMap.values()));
            }
        };

        fetchConversations();
    }, []);

    useEffect(() => {

        const subscribeMessagesChannel = async () => {
            const user = await getCurrentUser();
            const supabase = createClient(await getAccessToken());
            supabase
                .channel("messages")
                .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, async (payload) => {
                    if (payload.eventType === "INSERT") {
                        const newMessage = payload.new as {
                            id: string;
                            user_id_send: string;
                            user_id_receive: string;
                            message: string;
                            created_at: string;
                        };

                        const currentUser = await getCurrentUser();
                        const otherUserId = newMessage.user_id_send === currentUser?.id ? newMessage.user_id_receive : newMessage.user_id_send;

                        setConversations(prevConversations => {
                            const updatedConversations = [...prevConversations];
                            const conversationIndex = updatedConversations.findIndex(
                                conv => conv.user_receive.id === otherUserId
                            );

                            if (conversationIndex !== -1) {

                                const conversation = updatedConversations[conversationIndex];
                                const messageExists = conversation.messages.some(msg => msg.id === newMessage.id);
                                if (!messageExists) {
                                    conversation.messages.push(newMessage);
                                    if (new Date(newMessage.created_at) > new Date(conversation.last_message.created_at)) {
                                        conversation.last_message = newMessage;
                                    }
                                }
                            }
                            return updatedConversations;
                        });

                    }
                })
                .subscribe();
        }

        if (conversations.length > 0 && !isMounted) {
            subscribeMessagesChannel();
            setIsMounted(true);
        }
    }, [conversations]);

    return (
        <div className="w-full h-screen flex">
            <aside className="w-1/5 h-full border-r border-gray-200">
                <div className="w-full h-16 flex flex-row items-center justify-between p-4 border-b border-gray-200">
                    <h1 className="text-2xl font-bold">Messages</h1>
                </div>
                <div className="w-full h-[calc(100%-4rem)] flex flex-col overflow-y-auto">
                    {conversations.sort((a, b) => new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime()).map((conversation) => (
                        <div
                            key={conversation.user_receive.id}
                            className={`w-full h-16 flex flex-row items-center justify-between p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${selectedConversation?.user_receive.id === conversation.user_receive.id ? 'bg-gray-100' : ''}`}
                            onClick={() => setSelectedConversation(conversation)}
                        >
                            <div className="flex flex-row items-center gap-4">
                                <Avatar className="w-10 h-10">
                                    <AvatarImage src={conversation.user_receive.profile_picture_url} />
                                    <AvatarFallback>{conversation.user_receive.username.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <h1 className="text-lg font-bold">{conversation.user_receive.username}</h1>
                                    <p className="text-sm text-gray-500 truncate w-32">{conversation.last_message.message}</p>
                                </div>
                            </div>

                            <div className="flex flex-row items-center gap-4">
                                <p className="text-sm text-gray-500">{timeAgo(conversation.last_message.created_at)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            <main className="flex-1 h-full flex flex-col">
                {selectedConversation ? (
                    <>
                        <div className="w-full h-16 flex flex-row items-center justify-between p-4 border-b border-gray-200">
                            <div className="flex flex-row items-center gap-4">
                                <Avatar className="w-10 h-10">
                                    <AvatarImage src={selectedConversation.user_receive.profile_picture_url} />
                                    <AvatarFallback>{selectedConversation.user_receive.username.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <h1 className="text-lg font-bold">{selectedConversation.user_receive.username}</h1>
                            </div>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto h-[calc(100%-8rem)]">
                            <div className="flex flex-col gap-4">
                                {selectedConversation.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex ${message.user_id_send === currentUserId ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-lg p-3 ${message.user_id_send === currentUserId
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-100'
                                                }`}
                                        >
                                            <p>{message.message}</p>
                                            <p className="text-xs mt-1 opacity-70">
                                                {timeAgo(message.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                        <div className="w-full p-4 border-t border-gray-200">
                            <div className="flex gap-2">
                                <input
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    type="text"
                                    placeholder="Type a message..."
                                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <Button onClick={async () => {
                                    const supabase = createClient(await getAccessToken());
                                    const { data, error } = await supabase.from("messages").insert({
                                        user_id_receive: selectedConversation.user_receive.id,
                                        message: message
                                    });
                                    if (error) {
                                        console.error(error);
                                    }
                                    setMessage("");
                                }}>
                                    <SendHorizonal className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-gray-500">Select a conversation to start chatting</p>
                    </div>
                )}
            </main>
        </div>
    );
}