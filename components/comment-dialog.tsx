"use client";
import { ChevronLeft, ChevronRight, MessageCircle, Send, AlertTriangle, Upload, X, FileText, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { timeAgo } from "./post-card";
import Image from "next/image";
import { Button } from "./ui/button";
import { checkContentToxicity, isPerspectiveError } from "@/utils/perspective";
import { getCurrentUser, getAccessToken } from "@/utils/local_user";
import { uploadFileToSupabase } from "@/app/actions/upload-actions";

interface CommentDialogProps {
    post_id: string;
}

interface AttachmentFile {
    file: File;
    preview?: string;
    type: 'image' | 'file';
}

export default function CommentDialog({ post_id }: CommentDialogProps) {
    const [post, setPost] = useState<any>();
    const [open, setOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [commentContent, setCommentContent] = useState("");
    const [isCommenting, setIsCommenting] = useState(false);
    const [toxicityWarning, setToxicityWarning] = useState<string | null>(null);
    const [commentAttachments, setCommentAttachments] = useState<AttachmentFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchPost = async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("posts")
                .select(`content, created_at, 
                    users!posts_creator_id_fkey(username, profile_picture_url), 
                    attachments(attachment_url, index, type, original_name, file_size),
                    comments(id, content, created_at, creator_id, 
                        users!comments_creator_id_fkey(username, profile_picture_url),
                        comment_attachments(id, attachment_url, type, original_name, file_size, index))`)
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
        const images = post?.attachments?.filter((a: any) => a.type === 'image') || [];
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }

    const nextImage = () => {
        const images = post?.attachments?.filter((a: any) => a.type === 'image') || [];
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }

    const getFileType = (file: File): 'image' | 'file' => {
        return file.type.startsWith('image/') ? 'image' : 'file';
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newAttachments: AttachmentFile[] = [];

        files.forEach((file) => {
            const fileType = getFileType(file);
            const attachment: AttachmentFile = {
                file,
                type: fileType
            };

            if (fileType === 'image') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    attachment.preview = e.target?.result as string;
                    setCommentAttachments(prev => [...prev.filter(a => a.file !== file), attachment]);
                };
                reader.readAsDataURL(file);
            } else {
                newAttachments.push(attachment);
            }
        });

        if (newAttachments.length > 0) {
            setCommentAttachments(prev => [...prev, ...newAttachments]);
        }
    };

    const removeAttachment = (index: number) => {
        setCommentAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const sortAttachments = (attachments: AttachmentFile[]) => {
        return [...attachments].sort((a, b) => {
            if (a.type === 'image' && b.type !== 'image') return -1;
            if (a.type !== 'image' && b.type === 'image') return 1;
            return 0;
        });
    };

    const getFileNameFromUrl = (url: string) => {
        return url.split('/').pop() || 'file';
    };

    const getFileExtension = (url: string) => {
        const filename = getFileNameFromUrl(url);
        return filename.split('.').pop()?.toUpperCase() || 'FILE';
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

    const handleCreateComment = async () => {
        if (!commentContent.trim() && commentAttachments.length === 0) return;

        setIsCommenting(true);
        setToxicityWarning(null);

        try {
            // Check comment toxicity if there's text content
            if (commentContent.trim()) {
                const toxicityResult = await checkContentToxicity(commentContent.trim());
                
                if (isPerspectiveError(toxicityResult)) {
                    console.error('Error checking comment toxicity:', toxicityResult.error);
                    // Continue with comment creation even if toxicity check fails
                } else if (toxicityResult.isToxic) {
                    setToxicityWarning('Your comment may contain inappropriate content. Please review and edit your comment.');
                    setIsCommenting(false);
                    return;
                }
            }

            const currentUser = await getCurrentUser();
            const supabase = createClient();

            // Create the comment
            const { data: newComment, error } = await supabase
                .from("comments")
                .insert({
                    content: commentContent.trim(),
                    post_id: post_id,
                    creator_id: currentUser?.id,
                })
                .select(`*, users!comments_creator_id_fkey(username, profile_picture_url)`)
                .single();

            if (error) {
                console.error("Error creating comment:", error);
                return;
            }

            // Upload comment attachments if any
            const uploadedAttachments = [];
            if (commentAttachments.length > 0) {
                const sortedAttachments = sortAttachments(commentAttachments);
                
                for (let i = 0; i < sortedAttachments.length; i++) {
                    const attachment = sortedAttachments[i];
                    const formData = new FormData();
                    formData.append('file', attachment.file);
                    formData.append('user_id', currentUser?.id || '');
                    formData.append('bucket_name', 'attachments');
                    formData.append('access_token', await getAccessToken() || '');

                    const uploadResult = await uploadFileToSupabase(formData);
                    
                    if (uploadResult.success) {
                        // Insert comment attachment record
                        const { data: attachmentData, error: attachmentError } = await supabase
                            .from("comment_attachments")
                            .insert({
                                comment_id: newComment.id,
                                attachment_url: uploadResult.fileUrl,
                                type: attachment.type,
                                original_name: uploadResult.originalName,
                                file_size: uploadResult.size,
                                index: i,
                                creator_id: currentUser?.id,
                            })
                            .select()
                            .single();

                        if (!attachmentError && attachmentData) {
                            uploadedAttachments.push(attachmentData);
                        }
                    }
                }
            }

            // Add comment attachments to the new comment object
            const commentWithAttachments = {
                ...newComment,
                comment_attachments: uploadedAttachments
            };

            // Add the new comment to the post
            setPost((prevPost: any) => ({
                ...prevPost,
                comments: [...(prevPost?.comments || []), commentWithAttachments]
            }));

            setCommentContent("");
            setCommentAttachments([]);
            setToxicityWarning(null);
        } catch (error) {
            console.error("Error creating comment:", error);
        } finally {
            setIsCommenting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <MessageCircle className="w-5 h-5 text-zinc-500" />
            </DialogTrigger>
            <DialogContent className="min-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="sticky top-0 bg-white">
                    <DialogTitle>
                        Comments
                    </DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto px-1">
                    <div className="flex flex-row gap-3 p-4">
                        <Avatar className="w-10 h-10 border-zinc-200 border">
                            <AvatarImage className="object-cover" sizes="300px" src={post?.users?.profile_picture_url} />
                            <AvatarFallback>{post?.users?.username.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col w-full">
                            <div className="flex flex-row gap-3">
                                <p className="text-sm font-medium">{post?.users?.username}</p>
                                <p className="text-sm text-zinc-500">{timeAgo(post?.created_at)}</p>
                            </div>
                            <p>{post?.content}</p>

                            {post?.attachments && post.attachments.length > 0 && (
                                <div className="mt-2 space-y-2">
                                    {/* Image Gallery - Group all images together */}
                                    {(() => {
                                        const images = post.attachments.filter((a: any) => a.type === 'image').sort((a: any, b: any) => a.index - b.index);
                                        if (images.length > 0) {
                                            return (
                                                <div className="relative rounded-lg overflow-hidden">
                                                    <div className="relative h-96 w-full">
                                                        <Image
                                                            src={images[currentImageIndex]?.attachment_url}
                                                            alt={`Image ${currentImageIndex + 1}`}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                    {images.length > 1 && (
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
                                                                {images.map((_: any, idx: number) => (
                                                                    <div
                                                                        key={idx}
                                                                        className={`w-2 h-2 rounded-full ${idx === currentImageIndex
                                                                            ? 'bg-white'
                                                                            : 'bg-white/50'
                                                                            }`}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                    
                                    {/* File Attachments - Display individually */}
                                    {post.attachments
                                        .filter((a: any) => a.type !== 'image')
                                        .sort((a: any, b: any) => a.index - b.index)
                                        .map((attachment: any, index: number) => (
                                            <div key={`file-${index}`} className="flex items-center gap-3 p-3 border border-zinc-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors max-w-sm">
                                                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                                                    <FileText className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {attachment.original_name || getFileNameFromUrl(attachment.attachment_url)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {attachment.file_size ? `${(attachment.file_size / 1024 / 1024).toFixed(2)} MB` : `${getFileExtension(attachment.attachment_url)} File`}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-blue-600 hover:text-blue-800 h-8 w-8 p-0"
                                                    onClick={() => handleDownload(attachment.attachment_url, attachment.original_name || getFileNameFromUrl(attachment.attachment_url))}
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-4 px-4">
                        {post?.comments.map((comment: any) => (
                            <div key={comment.id} className="flex flex-row gap-3 border-t border-zinc-200 pt-4">
                                <Avatar className="w-10 h-10 border-zinc-200 border">
                                    <AvatarImage className="object-cover" sizes="300px" src={comment.users.profile_picture_url} />
                                    <AvatarFallback>{comment.users.username.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col w-full">
                                    <div className="flex flex-row gap-3">
                                        <p className="text-sm font-medium">{comment.users.username}</p>
                                        <p className="text-sm text-zinc-500">{timeAgo(comment.created_at)}</p>
                                    </div>
                                    <p>{comment.content}</p>

                                    {/* Comment attachments */}
                                    {comment.comment_attachments && comment.comment_attachments.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                            {comment.comment_attachments
                                                .sort((a: any, b: any) => {
                                                    // Sort images first, then files
                                                    if (a.type === 'image' && b.type !== 'image') return -1;
                                                    if (a.type !== 'image' && b.type === 'image') return 1;
                                                    return a.index - b.index;
                                                })
                                                .map((attachment: any, index: number) => (
                                                    <div key={attachment.id}>
                                                        {attachment.type === 'image' ? (
                                                            <div className="relative rounded-lg overflow-hidden max-w-sm">
                                                                <Image
                                                                    src={attachment.attachment_url}
                                                                    alt={attachment.original_name || `Attachment ${index + 1}`}
                                                                    width={300}
                                                                    height={200}
                                                                    className="object-cover"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-3 p-3 border border-zinc-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors max-w-sm">
                                                                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                                                                    <FileText className="h-4 w-4 text-blue-600" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                                        {attachment.original_name || getFileNameFromUrl(attachment.attachment_url)}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {attachment.file_size ? `${(attachment.file_size / 1024 / 1024).toFixed(2)} MB` : 'File'}
                                                                    </p>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-blue-600 hover:text-blue-800 h-8 w-8 p-0"
                                                                    onClick={() => handleDownload(attachment.attachment_url, attachment.original_name)}
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Comment Input Section - Sticky at bottom */}
                <div className="sticky bottom-0 bg-white z-10 space-y-4">
                    {/* Toxicity Warning */}
                    {toxicityWarning && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">{toxicityWarning}</span>
                        </div>
                    )}

                    {/* Comment attachments preview */}
                    {commentAttachments.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                            {sortAttachments(commentAttachments).map((attachment, index) => (
                                <div key={index} className="relative group">
                                    {attachment.type === 'image' && attachment.preview ? (
                                        <div className="relative aspect-square">
                                            <Image
                                                src={attachment.preview}
                                                alt={`Preview ${index + 1}`}
                                                fill
                                                className="object-cover rounded-lg"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white h-6 w-6"
                                                onClick={() => removeAttachment(commentAttachments.indexOf(attachment))}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50">
                                            <FileText className="h-5 w-5 text-gray-500" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium truncate">
                                                    {attachment.file.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {(attachment.file.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 text-gray-400 hover:text-red-500"
                                                onClick={() => removeAttachment(commentAttachments.indexOf(attachment))}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-start gap-3">
                        <Input
                            placeholder="Write a comment..."
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleCreateComment();
                                }
                            }}
                        />
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="*/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isCommenting}
                        >
                            <Upload className="h-4 w-4" />
                        </Button>
                        <Button
                            size="icon"
                            onClick={handleCreateComment}
                            disabled={(!commentContent.trim() && commentAttachments.length === 0) || isCommenting}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

