"use client";
import PostCard from "@/components/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, getUserProfile } from "@/utils/local_user";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

export default function Home() {
    const supabase = createClient();
    const [posts, setPosts] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    useEffect(() => {
        const fetchPosts = async () => {
            const { data: posts, error } = await supabase
                .from("posts")
                .select(`*, 
                    users!posts_creator_id_fkey(username, profile_picture_url), 
                    attachments(attachment_url, index)`)
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

    return (
        <div className="mx-auto w-full max-w-2xl py-12">
            <Card className="border-zinc-200">
                <CardHeader className="flex flex-row items-center gap-3">
                    <Avatar className="w-10 h-10">
                        <AvatarImage src={user?.profile_picture_url} />
                        <AvatarFallback>{user?.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-zinc-500">
                        What's on your mind?
                    </CardTitle>
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
