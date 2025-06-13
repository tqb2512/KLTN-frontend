import { Heart, MessageCircle, ChevronLeft, ChevronRight, Download, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import Image from "next/image";
import { useState } from "react";
import CommentDialog from "./comment-dialog";
import { createClient } from "@/utils/supabase/client";
import { getAccessToken } from "@/utils/local_user";

export interface PostCardProps {
    id: string;
    user: {
        username: string;
        profile_picture_url: string;
    }
    content: string;
    created_at: string;
    likes: number;
    comments: number;
    attachments: {
        attachment_url: string;
        index: number;
        type?: string;
    }[];
    liked: boolean;
}

export const timeAgo = (created_at: string) => {
    const now = new Date();
    const postDate = new Date(created_at);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 7) {
        return postDate.toLocaleDateString();
    } else if (diffInDays > 0) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes > 0) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
}

export default function PostCard({ id, user, content, created_at, likes, comments, attachments, liked: initialLiked }: PostCardProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [liked, setLiked] = useState(initialLiked);
    const [likesCount, setLikesCount] = useState(likes);

    // Sort attachments: images first (by index), then other files (by index)
    const sortedAttachments = [...(attachments || [])].sort((a, b) => {
        const aIsImage = a.type === 'image' || !a.type; // Default to image for backward compatibility
        const bIsImage = b.type === 'image' || !b.type;
        
        if (aIsImage && !bIsImage) return -1;
        if (!aIsImage && bIsImage) return 1;
        return a.index - b.index;
    });

    const imageAttachments = sortedAttachments.filter(att => att.type === 'image' || !att.type);
    const fileAttachments = sortedAttachments.filter(att => att.type && att.type !== 'image');

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % imageAttachments.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + imageAttachments.length) % imageAttachments.length);
    };

    const handleDownload = (url: string, filename?: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'download';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getFileNameFromUrl = (url: string) => {
        return url.split('/').pop() || 'file';
    };

    const getFileExtension = (url: string) => {
        const filename = getFileNameFromUrl(url);
        return filename.split('.').pop()?.toUpperCase() || 'FILE';
    };

    const handleLike = async () => {
        if (!liked) {
            const supabase = createClient(await getAccessToken());
            const { data, error } = await supabase
                .from("likes")
                .insert({
                    post_id: id,
                });

            if (error) {
                console.error(error);
            }

            setLikesCount(likesCount + 1);
            setLiked(true);
        } else {
            const supabase = createClient(await getAccessToken());
            const { data, error } = await supabase
                .from("likes")
                .delete()
                .eq("post_id", id);

            if (error) {
                console.error(error);
            }

            setLikesCount(likesCount - 1);
            setLiked(false);
        }
    }

    return (
        <div className="flex flex-row gap-3 border-t border-zinc-200 pt-4 px-6">
            <Avatar className="w-10 h-10">
                <AvatarImage src={user?.profile_picture_url} />
                <AvatarFallback>{user?.username.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col w-full">
                <div className="flex flex-row gap-3">
                    <p className="text-sm font-medium">{user?.username}</p>
                    <p className="text-sm text-zinc-500">{timeAgo(created_at)}</p>
                </div>
                <p>{content}</p>

                {/* Image attachments */}
                {imageAttachments && imageAttachments.length > 0 && (
                    <div className="relative mt-2 rounded-lg overflow-hidden">
                        <div className="relative h-96 w-full">
                            <Image
                                src={imageAttachments[currentImageIndex].attachment_url}
                                alt={`Attachment ${currentImageIndex + 1}`}
                                fill
                                className="object-cover"
                            />
                        </div>
                        {imageAttachments.length > 1 && (
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
                                    {imageAttachments.map((_, index) => (
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

                {/* File attachments */}
                {fileAttachments && fileAttachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                        {fileAttachments.map((attachment, index) => (
                            <div 
                                key={index} 
                                className="flex items-center gap-3 p-3 border border-zinc-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {getFileNameFromUrl(attachment.attachment_url)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {getFileExtension(attachment.attachment_url)} file
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600 hover:text-blue-800"
                                    onClick={() => handleDownload(attachment.attachment_url, getFileNameFromUrl(attachment.attachment_url))}
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex flex-row gap-8 pt-2">
                    <div className="flex flex-row gap-1 items-center">
                        <Heart className={`w-5 h-5 cursor-pointer ${liked ? 'text-red-300' : 'text-zinc-500'}`} onClick={handleLike} />
                        <p className="text-zinc-500 text-sm">{likesCount > 0 && likesCount}</p>
                    </div>
                    <div className="flex flex-row gap-1 items-center">
                        <CommentDialog post_id={id} />
                        <p className="text-zinc-500 text-sm">{comments > 0 && comments}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}