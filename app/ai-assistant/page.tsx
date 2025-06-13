"use client";
import { getAccessToken, getCurrentUser } from "@/utils/local_user";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EllipsisVertical, Plus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface Space {
    id: string;
    title: string;
    created_at: string;
    source_count: number;
}

export default function AIAssistant() {

    const [spaces, setSpaces] = useState<Space[]>([]);
    const [renameSpace, setRenameSpace] = useState<{ id: string; title: string } | null>(null);
    const [newSpaceName, setNewSpaceName] = useState("");

    useEffect(() => {
        const fetchSpaces = async () => {
            const user = await getCurrentUser();
            const supabase = createClient(await getAccessToken());
            const { data, error } = await supabase.from("spaces")
                .select("*")
                .eq("creator_id", user?.id || "");
            if (error) {
                console.error(error);
            } else {
                setSpaces(data);
            }
        }
        fetchSpaces();
    }, []);



    const handleDelete = async (spaceId: string, spaceName: string) => {
        if (!confirm(`Are you sure you want to delete "${spaceName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const supabase = createClient(await getAccessToken());
            const { error } = await supabase
                .from("spaces")
                .delete()
                .eq("id", spaceId);

            if (error) {
                console.error(error);
                alert("Error deleting space");
            } else {
                setSpaces(spaces.filter(space => space.id !== spaceId));
            }
        } catch (error) {
            console.error(error);
            alert("Error deleting space");
        }
    };

    const handleRename = async () => {
        if (!newSpaceName.trim()) {
            alert("Space name cannot be empty");
            return;
        }

        if (!renameSpace) return;

        try {
            const supabase = createClient(await getAccessToken());
            const { error } = await supabase
                .from("spaces")
                .update({ title: newSpaceName.trim() })
                .eq("id", renameSpace.id);

            if (error) {
                console.error(error);
                alert("Error renaming space");
            } else {
                setSpaces(spaces.map(space => 
                    space.id === renameSpace.id ? { ...space, title: newSpaceName.trim() } : space
                ));
                setRenameSpace(null);
                setNewSpaceName("");
            }
        } catch (error) {
            console.error(error);
            alert("Error renaming space");
        }
    };

    const openRenameDialog = (space: Space) => {
        setRenameSpace({ id: space.id, title: space.title });
        setNewSpaceName(space.title);
    };

    const createSpace = async () => {
        const supabase = createClient(await getAccessToken());
        const { data, error } = await supabase.from("spaces").insert({ title: "New Space" }).select().single();
        if (error) {
            console.error(error);
        } else {
            setSpaces([...spaces, data]);
        }
    }

    return (
        <div className="mx-auto max-w-screen-xl p-10">
            <h1 className="text-6xl font-bold">Welcome to Learning Spaces</h1>
            <div className="pt-6">
                <Button onClick={createSpace} className="flex items-center gap-2"><Plus />Create Space</Button>
            </div>
            <div className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {spaces.map((space) => (
                        <div key={space.id} className="relative">
                            <Link href={`/ai-assistant/spaces/${space.id}`} className="flex flex-col justify-between rounded-lg bg-zinc-200 h-48 hover:cursor-pointer hover:bg-zinc-300">
                                <div className="p-4 pr-12 flex-1 min-h-0">
                                    <h3 className="text-2xl font-bold line-clamp-3 mb-2">{space.title}</h3>
                                    <p className="text-lg text-gray-500">{space.source_count} sources</p>
                                </div>
                                <div className="absolute bottom-4 right-4" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu modal={false}>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-zinc-500 hover:text-zinc-700"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                            >
                                                <EllipsisVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 border-zinc-200" sideOffset={5}>
                                            <DropdownMenuItem 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openRenameDialog(space);
                                                }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                                Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                                variant="destructive"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(space.id, space.title);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>

            {/* Rename Dialog */}
            <Dialog open={!!renameSpace} onOpenChange={(open) => {
                if (!open) {
                    setRenameSpace(null);
                    setNewSpaceName("");
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Space</DialogTitle>
                        <DialogDescription>
                            Enter a new name for your learning space.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={newSpaceName}
                                onChange={(e) => setNewSpaceName(e.target.value)}
                                className="col-span-3"
                                placeholder="Enter new name"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRenameSpace(null);
                                setNewSpaceName("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleRename}>
                            Rename
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
