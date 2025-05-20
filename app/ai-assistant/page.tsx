"use client";
import { getAccessToken } from "@/utils/local_user";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EllipsisVertical, Plus } from "lucide-react";

export interface Space {
    id: string;
    title: string;
    created_at: string;
    source_count: number;
}

export default function AIAssistant() {

    const [spaces, setSpaces] = useState<Space[]>([]);

    useEffect(() => {
        const fetchSpaces = async () => {
            const supabase = createClient(await getAccessToken());
            const { data, error } = await supabase.from("spaces").select("*");
            if (error) {
                console.error(error);
            } else {
                setSpaces(data);
            }
        }
        fetchSpaces();
    }, []);

    return (
        <div className="mx-auto max-w-screen-xl p-10">
            <h1 className="text-6xl font-bold">Welcome to Learning Spaces</h1>
            <div className="pt-6">
                <Button><Plus />Create Space</Button>
            </div>
            <div className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {spaces.map((space) => (
                        <div key={space.id} className="flex flex-col justify-between rounded-lg bg-zinc-200 h-48 hover:cursor-pointer hover:bg-zinc-300">
                            <div className="p-4">
                                <h3 className="text-2xl font-bold">{space.title}</h3>
                                <p className="text-lg text-gray-500">{space.source_count} sources</p>
                            </div>
                            <div className="ml-auto p-4">
                                <EllipsisVertical />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
