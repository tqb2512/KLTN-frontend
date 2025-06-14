import { Heart, MessageCircle, ChevronLeft, ChevronRight, Download, FileText, MoreHorizontal, Flag, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CommentDialog from "./comment-dialog";
import { createClient } from "@/utils/supabase/client";
import { getAccessToken, getCurrentUser } from "@/utils/local_user";

export interface PostCardProps {
    id: string;
    user: {
        id?: string;
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
        original_name?: string;
        file_size?: number;
    }[];
    liked: boolean;
    currentUser?: {
        id: string;
        username: string;
        profile_picture_url: string;
    } | null;
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

export default function PostCard({ id, user, content, created_at, likes, comments, attachments, liked: initialLiked, currentUser }: PostCardProps) {
    const router = useRouter();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [liked, setLiked] = useState(initialLiked);
    const [likesCount, setLikesCount] = useState(likes);
    const [isAuthor, setIsAuthor] = useState(false);
    const [isLiking, setIsLiking] = useState(false);
    const [showReportDialog, setShowReportDialog] = useState(false);
    const [selectedReason, setSelectedReason] = useState<string>("");
    const [reportNotes, setReportNotes] = useState<string>("");
    const [isReporting, setIsReporting] = useState(false);

    const reportReasons = [
        { value: "spam", label: "Spam or unwanted content" },
        { value: "harassment", label: "Harassment or bullying" },
        { value: "hate_speech", label: "Hate speech or discrimination" },
        { value: "violence", label: "Violence or threats" },
        { value: "inappropriate_content", label: "Inappropriate or offensive content" },
        { value: "misinformation", label: "False or misleading information" },
        { value: "copyright", label: "Copyright violation" },
        { value: "other", label: "Other" }
    ];

    useEffect(() => {
        const initUser = async () => {
            setIsAuthor(currentUser?.id === user?.id);
        };
        initUser();
    }, [user?.id, currentUser?.id]);

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
        if (isLiking) return; // Prevent multiple clicks
        
        // Check if user is logged in
        if (!currentUser) {
            alert("You must be logged in to like posts");
            return;
        }
        
        setIsLiking(true);
        const originalLiked = liked;
        const originalCount = likesCount;
        
        try {
            if (!liked) {
                // Optimistic update
                setLiked(true);
                setLikesCount(likesCount + 1);
                
                const supabase = createClient(await getAccessToken());
                const { error } = await supabase
                    .from("likes")
                    .insert({
                        post_id: id,
                    });

                if (error) {
                    // Revert optimistic update on error
                    setLiked(originalLiked);
                    setLikesCount(originalCount);
                    console.error("Error liking post:", error);
                    alert("Failed to like post. Please try again.");
                }
            } else {
                // Optimistic update
                setLiked(false);
                setLikesCount(likesCount - 1);
                
                const supabase = createClient(await getAccessToken());
                const { error } = await supabase
                    .from("likes")
                    .delete()
                    .eq("post_id", id);

                if (error) {
                    // Revert optimistic update on error
                    setLiked(originalLiked);
                    setLikesCount(originalCount);
                    console.error("Error unliking post:", error);
                    alert("Failed to unlike post. Please try again.");
                }
            }
        } catch (error) {
            // Revert optimistic update on unexpected error
            setLiked(originalLiked);
            setLikesCount(originalCount);
            console.error("Unexpected error with like functionality:", error);
            alert("Something went wrong. Please try again.");
        } finally {
            setIsLiking(false);
        }
    }

    const handleReport = async () => {
        setShowReportDialog(true);
    };

    const submitReport = async () => {
        if (!selectedReason) {
            alert("Please select a reason for reporting");
            return;
        }

        if (!currentUser) {
            alert("You must be logged in to report posts");
            return;
        }

        setIsReporting(true);
        try {
            const supabase = createClient(await getAccessToken());
            const { error } = await supabase
                .from("reports")
                .upsert({
                    user_id: currentUser.id,
                    post_id: id,
                    reason: selectedReason,
                    notes: reportNotes.trim() || null
                });

            if (error) {
                console.error(error);
                if (error.code === '23505') { // Unique constraint violation
                    alert("You have already reported this post");
                } else {
                    alert("Error reporting post");
                }
            } else {
                alert("Post reported successfully. Thank you for helping keep our community safe.");
                setShowReportDialog(false);
                setSelectedReason("");
                setReportNotes("");
            }
        } catch (error) {
            console.error(error);
            alert("Error reporting post");
        } finally {
            setIsReporting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this post?")) {
            return;
        }

        try {
            const supabase = createClient(await getAccessToken());
            const { error } = await supabase
                .from("posts")
                .delete()
                .eq("id", id);

            if (error) {
                console.error(error);
                alert("Error deleting post");
            } else {
                alert("Post deleted successfully");
                // You might want to refresh the page or remove the post from the UI
                window.location.reload();
            }
        } catch (error) {
            console.error(error);
            alert("Error deleting post");
        }
    };

    return (
        <>
            <div className="flex flex-row gap-3 border-t border-zinc-200 pt-4 px-6">
                <Avatar className="w-10 h-10 border-zinc-200 border" onClick={() => router.push(`/profile/${user?.id}`)}>
                    <AvatarImage className="object-cover" sizes="300px" src={user?.profile_picture_url} />
                    <AvatarFallback>{user?.username.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col w-full">
                    <div className="flex flex-row justify-between items-start">
                        <div className="flex flex-row gap-3">
                            <p className="text-sm font-medium">{user?.username}</p>
                            <p className="text-sm text-zinc-500">{timeAgo(created_at)}</p>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-zinc-500 hover:text-zinc-700"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                        }}
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 border-zinc-200" sideOffset={5}>
                                    {isAuthor ? (
                                        <DropdownMenuItem 
                                            variant="destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete();
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete post
                                        </DropdownMenuItem>
                                    ) : (
                                        <DropdownMenuItem 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleReport();
                                            }}
                                        >
                                            <Flag className="h-4 w-4" />
                                            Report post
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
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
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
                                            {attachment.original_name || getFileNameFromUrl(attachment.attachment_url)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {attachment.file_size ? `${(attachment.file_size / 1024 / 1024).toFixed(2)} MB` : `${getFileExtension(attachment.attachment_url)} file`}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-blue-600 hover:text-blue-800"
                                        onClick={() => handleDownload(attachment.attachment_url, attachment.original_name || getFileNameFromUrl(attachment.attachment_url))}
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-row gap-8 pt-2 w-32">
                        <div className="flex flex-row gap-1 items-center w-1/2">
                            <Heart 
                                className={`w-5 h-5 cursor-pointer transition-colors ${
                                    liked ? 'text-red-500 fill-red-500' : 'text-zinc-500 hover:text-red-400'
                                } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`} 
                                onClick={handleLike} 
                            />
                            <p className="text-zinc-500 text-sm">{likesCount > 0 && likesCount}</p>
                        </div>
                        <div className="flex flex-row gap-1 items-center w-1/2">
                            <CommentDialog post_id={id} />
                            <p className="text-zinc-500 text-sm">{comments > 0 && comments}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Dialog */}
            <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Report Post</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-zinc-600">
                            Help us understand what's wrong with this post by selecting a reason below.
                        </p>
                        <div className="space-y-2">
                            {reportReasons.map((reason) => (
                                <label
                                    key={reason.value}
                                    className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-zinc-50"
                                >
                                    <input
                                        type="radio"
                                        name="reason"
                                        value={reason.value}
                                        checked={selectedReason === reason.value}
                                        onChange={(e) => setSelectedReason(e.target.value)}
                                        className="w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-sm">{reason.label}</span>
                                </label>
                            ))}
                        </div>
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-zinc-700">
                                Additional details (optional)
                            </div>
                            <textarea
                                value={reportNotes}
                                onChange={(e) => setReportNotes(e.target.value)}
                                placeholder="Please provide any additional context or details about this report..."
                                className="w-full min-h-[80px] px-3 py-4 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 resize-none"
                                maxLength={500}
                                disabled={isReporting}
                            />
                            <div className="text-xs text-zinc-500 text-right">
                                {reportNotes.length}/500 characters
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowReportDialog(false);
                                    setSelectedReason("");
                                    setReportNotes("");
                                }}
                                disabled={isReporting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={submitReport}
                                disabled={!selectedReason || isReporting}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {isReporting ? "Reporting..." : "Submit Report"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}