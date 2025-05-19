"use client";
import { ChevronLeft, ChevronRight, MessageCircle, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { timeAgo } from "./post-card";
import Image from "next/image";
import { Button } from "./ui/button";

interface CommentDialogProps {
    post_id: string;
}

export default function CommentDialog({ post_id }: CommentDialogProps) {
    const [post, setPost] = useState<any>();
    const [open, setOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        const fetchPost = async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("posts")
                .select(`content, created_at, 
                    users!posts_creator_id_fkey(username, profile_picture_url), 
                    attachments(attachment_url, index),
                    comments(id, content, created_at, creator_id, users!comments_creator_id_fkey(username, profile_picture_url))`)
                .eq("id", post_id)
                .single();

            if (error) {
                console.error(error);
            }

            data?.comments.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            setPost(data);
        }

        if (!open) return;

        fetchPost();
    }, [open]);

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + post?.attachments.length) % post?.attachments.length);
    }

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % post?.attachments.length);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <MessageCircle className="w-5 h-5 text-zinc-500" />
            </DialogTrigger>
            <DialogContent className="min-w-[600px]">
                <DialogHeader className="border-b border-zinc-200 pb-4">
                    <DialogTitle>
                        Comments
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-row gap-3">
                    <Avatar className="w-10 h-10">
                        <AvatarImage src={post?.users?.profile_picture_url} />
                        <AvatarFallback>{post?.users?.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col w-full">
                        <div className="flex flex-row gap-3">
                            <p className="text-sm font-medium">{post?.users?.username}</p>
                            <p className="text-sm text-zinc-500">{timeAgo(post?.created_at)}</p>
                        </div>
                        <p>{post?.content}</p>

                        {post?.attachments && post.attachments.length > 0 && (
                            <div className="relative mt-2 rounded-lg overflow-hidden">
                                <div className="relative h-96 w-full">
                                    <Image
                                        src={post.attachments[currentImageIndex].attachment_url}
                                        alt={`Attachment ${currentImageIndex + 1}`}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                {post?.attachments.length > 1 && (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                                            onClick={prevImage}
                                        >
                                            <ChevronLeft className="h-6 w-6" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                                            onClick={nextImage}
                                        >
                                            <ChevronRight className="h-6 w-6" />
                                        </Button>
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                            {post?.attachments.map((_: any, index: number) => (
                                                <div
                                                    key={index}
                                                    className={`w-2 h-2 rounded-full ${index === currentImageIndex
                                                        ? 'bg-white'
                                                        : 'bg-white/50'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex flex-col gap-4">
                    {post?.comments.map((comment: any) => (
                        <div key={comment.id} className="flex flex-row gap-3 border-t border-zinc-200 pt-4">
                            <Avatar className="w-10 h-10">
                                <AvatarImage src={comment.users.profile_picture_url} />
                                <AvatarFallback>{comment.users.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col w-full">
                                <div className="flex flex-row gap-3">
                                    <p className="text-sm font-medium">{comment.users.username}</p>
                                    <p className="text-sm text-zinc-500">{timeAgo(comment.created_at)}</p>
                                </div>
                                <p>{comment.content}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-row gap-3">
                    <Input type="text" placeholder="Add a comment" />
                    <Button>
                        <Send className="w-5 h-5" />
                        Send
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

