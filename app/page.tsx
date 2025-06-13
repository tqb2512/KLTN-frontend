"use client";
import PostCard from "@/components/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getAccessToken, getCurrentUser, getUserProfile } from "@/utils/local_user";
import { createClient } from "@/utils/supabase/client";
import { uploadFileToSupabase } from "@/app/actions/upload-actions";
import { useEffect, useState, useRef } from "react";
import { X, Upload, FileText, Image as ImageIcon, AlertTriangle } from "lucide-react";
import Image from "next/image";
import { checkContentToxicity, isPerspectiveError } from "@/utils/perspective";

interface AttachmentFile {
    file: File;
    preview?: string;
    type: 'image' | 'file';
}

export default function Home() {
    const supabase = createClient();
    const [posts, setPosts] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [postContent, setPostContent] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
    const [toxicityWarning, setToxicityWarning] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchPosts = async () => {
            const { data: posts, error } = await supabase
                .from("posts")
                .select(`*, 
                    users!posts_creator_id_fkey(username, profile_picture_url), 
                    attachments(attachment_url, index, type, original_name, file_size)`)
                .order("created_at", { ascending: false });

            if (error) {
                console.error(error);
            }

            if (posts) {
                const user = await getCurrentUser();
                const { data: likes, error: likesError } = await supabase
                    .from("likes")
                    .select("*")
                    .eq("user_id", user?.id);

                if (likesError) {
                    console.error(likesError);
                }

                if (likes) {
                    likes.forEach((like) => {
                        const post = posts.find((post) => post.id === like.post_id);
                        if (post) post.liked = true;
                        else post.liked = false;
                    });
                }
            }

            setPosts(posts || []);
        }

        const fetchUser = async () => {
            const user = await getUserProfile();
            setUser(user);
        }

        fetchUser();
        fetchPosts();

    }, []);

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
                    setAttachments(prev => [...prev.filter(a => a.file !== file), attachment]);
                };
                reader.readAsDataURL(file);
            } else {
                newAttachments.push(attachment);
            }
        });

        if (newAttachments.length > 0) {
            setAttachments(prev => [...prev, ...newAttachments]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const sortAttachments = (attachments: AttachmentFile[]) => {
        // Sort by type (images first), then by original order
        return [...attachments].sort((a, b) => {
            if (a.type === 'image' && b.type !== 'image') return -1;
            if (a.type !== 'image' && b.type === 'image') return 1;
            return 0;
        });
    };

    const handleCreatePost = async () => {
        if (!postContent.trim() && attachments.length === 0) return;

        setIsPosting(true);
        setToxicityWarning(null);
        
        try {
            // Check content toxicity if there's text content
            if (postContent.trim()) {
                const toxicityResult = await checkContentToxicity(postContent.trim());
                
                if (isPerspectiveError(toxicityResult)) {
                    console.error('Error checking content toxicity:', toxicityResult.error);
                    // Continue with post creation even if toxicity check fails
                } else if (toxicityResult.isToxic) {
                    setToxicityWarning('Your post may contain inappropriate content. Please review and edit your post.');
                    setIsPosting(false);
                    return;
                }
            }

            const currentUser = await getCurrentUser();

            // Create the post first
            const { data: newPost, error: postError } = await supabase
                .from("posts")
                .insert({
                    content: postContent.trim(),
                    creator_id: currentUser?.id,
                })
                .select()
                .single();

            if (postError) {
                console.error("Error creating post:", postError);
                return;
            }

            // Upload attachments if any
            const uploadedAttachments = [];
            if (attachments.length > 0) {
                const sortedAttachments = sortAttachments(attachments);
                
                for (let i = 0; i < sortedAttachments.length; i++) {
                    const attachment = sortedAttachments[i];
                    const formData = new FormData();
                    formData.append('file', attachment.file);
                    formData.append('user_id', currentUser?.id || '');
                    formData.append('bucket_name', 'attachments');
                    formData.append('access_token', await getAccessToken() || '');

                    const uploadResult = await uploadFileToSupabase(formData);
                    
                    if (uploadResult.success) {
                        // Insert attachment record
                        const { data: attachmentData, error: attachmentError } = await supabase
                            .from("attachments")
                            .insert({
                                post_id: newPost.id,
                                attachment_url: uploadResult.fileUrl,
                                index: i,
                                type: attachment.type,
                                original_name: uploadResult.originalName,
                                file_size: uploadResult.size,
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

            // Fetch the complete post with user and attachments data
            const { data: completePost, error: fetchError } = await supabase
                .from("posts")
                .select(`*, 
                    users!posts_creator_id_fkey(username, profile_picture_url), 
                    attachments(attachment_url, index, type, original_name, file_size)`)
                .eq("id", newPost.id)
                .single();

            if (!fetchError && completePost) {
                // Add the new post to the beginning of the posts array
                setPosts([completePost, ...posts]);
            }

            setPostContent("");
            setAttachments([]);
            setToxicityWarning(null);
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error creating post:", error);
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-2xl py-12">
            <Card className="border-zinc-200">
                <CardHeader className="flex flex-row items-center gap-3">
                    <Avatar className="w-10 h-10">
                        <AvatarImage src={user?.profile_picture_url} />
                        <AvatarFallback>{user?.username?.charAt(0)}</AvatarFallback>
                    </Avatar>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <CardTitle className="text-zinc-500 cursor-pointer hover:text-zinc-600 transition-colors">
                                What's on your mind?
                            </CardTitle>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Create a post</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10">
                                        <AvatarImage src={user?.profile_picture_url} />
                                        <AvatarFallback>{user?.username?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{user?.username}</span>
                                </div>
                                <textarea
                                    placeholder="What's on your mind?"
                                    value={postContent}
                                    onChange={(e) => setPostContent(e.target.value)}
                                    className="min-h-[100px] resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                                />
                                
                                {/* Toxicity Warning */}
                                {toxicityWarning && (
                                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span className="text-sm">{toxicityWarning}</span>
                                    </div>
                                )}
                                
                                {/* File attachments display */}
                                {attachments.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                                        {sortAttachments(attachments).map((attachment, index) => (
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
                                                            onClick={() => removeAttachment(attachments.indexOf(attachment))}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
                                                        <FileText className="h-6 w-6 text-gray-500" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">
                                                                {attachment.file.name}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {(attachment.file.size / 1024 / 1024).toFixed(2)} MB
                                                            </p>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-gray-400 hover:text-red-500"
                                                            onClick={() => removeAttachment(attachments.indexOf(attachment))}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
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
                                            size="sm" 
                                            className="gap-2" 
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="h-4 w-4" />
                                            Add files
                                        </Button>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={handleCreatePost}
                                        disabled={(!postContent.trim() && attachments.length === 0) || isPosting}
                                    >
                                        {isPosting ? "Posting..." : "Post"}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button variant="outline" className="ml-auto border-zinc-200">
                        Post
                    </Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 px-0">
                    {posts.map((post) => (
                        <PostCard key={post.id} id={post.id} user={post.users} content={post.content} created_at={post.created_at} likes={post.likes} comments={post.comments} attachments={post.attachments} liked={post.liked} />
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
