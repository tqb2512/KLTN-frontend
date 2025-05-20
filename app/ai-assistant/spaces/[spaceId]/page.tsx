"use client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAccessToken } from "@/utils/local_user";
import { createClient } from "@/utils/supabase/client";
import { EllipsisVertical, Map, MessageSquareText, MessageSquare, Plus, Search, Send } from "lucide-react";
import { use, useEffect, useState } from "react";

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
}

type ChatSession = {
    id: string;
    session_id: string;
    created_at: string;
    messages: JSON;
}

export default function SpaceDetails({ params }: { params: Promise<{ spaceId: string }> }) {
    const { spaceId } = use(params);
    const [space, setSpace] = useState<Space | null>(null);
    const [sources, setSources] = useState<Space['space_sources']>([]);
    const [session_id, setSessionId] = useState<string | null>(null);
    const [selected_sources, setSelectedSources] = useState<string[]>([]);
    const [chat_session, setChatSession] = useState<ChatSession | null>(null);
    const [chat_message, setChatMessage] = useState<string>("");

    useEffect(() => {
        const fetchSpace = async () => {
            const supabase = createClient(await getAccessToken());
            const { data, error } = await supabase
                .from('spaces')
                .select('*, space_sources(*, document_info:documents(*))')
                .eq('id', spaceId)
                .single();

            if (error) {
                console.error(error);
            } else {
                setSpace(data);
                setSources(data.space_sources);
            }
        };
        fetchSpace();
    }, [spaceId]);

    return (
        <div className="h-full flex flex-row gap-4 p-4">
            <div className="w-[25%] rounded-xl bg-gray-50 border-none shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)]">
                <h1 className="text-lg font-medium p-3">Sources</h1>
                <hr className="border-t border-gray-200" />
                <div className="flex flex-row gap-2 p-3">
                    <Button variant="outline" className="flex-1 border border-gray-200 bg-white hover:bg-gray-100">
                        <Plus />
                        <p>Add</p>
                    </Button>
                    <Button variant="outline" className="flex-1 border border-gray-200 bg-white hover:bg-gray-100">
                        <Search />
                        <p>Discover</p>
                    </Button>
                </div>
                <div className="flex flex-col gap-2 p-3">
                    <div className="flex flex-row gap-2 items-center justify-between px-2">
                        <p className="text-sm text-gray-500">Select All Sources</p>
                        <Checkbox
                            className="hover:cursor-pointer"
                            checked={selected_sources.length === sources.length}
                            onCheckedChange={(checked) => {
                                setSelectedSources(checked ? sources.map((source) => source.id) : []);
                            }}
                        />
                    </div>
                    {sources.map((source) => (
                        <div key={source.id} className="flex flex-row gap-2 items-center hover:bg-gray-100 p-2 rounded-md">
                            <EllipsisVertical className="shrink-0 w-4" />
                            <p className="line-clamp-1">{source.document_info.title}</p>
                            <Checkbox
                                className="hover:cursor-pointer"
                                checked={selected_sources.includes(source.id)}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        setSelectedSources([...selected_sources, source.id]);
                                    } else {
                                        setSelectedSources(selected_sources.filter((id) => id !== source.id));
                                    }
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-[40%] rounded-xl bg-gray-50 border-none shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)]">
                <h1 className="text-lg font-medium p-3">Chat</h1>
                <hr className="border-t border-gray-200" />
                <ScrollArea className="h-[calc(100vh-10rem)]">

                </ScrollArea>
                <hr className="border-t border-gray-200" />
                <div className="flex flex-row gap-2 p-3 h-16 justify-center items-center">
                    <Input placeholder="Start typing..." className="border-gray-200 bg-white" value={chat_message} onChange={(e) => setChatMessage(e.target.value)} />
                    <Button variant="outline" className="border border-gray-200 bg-white hover:bg-gray-100">
                        <Send />
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
            </div>
        </div>

    )
}