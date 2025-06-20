"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, Users, BookOpen, FileText, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { getCurrentUser } from "@/utils/local_user";
import { createClient } from "@/utils/supabase/client";
import PostCard, { PostCardProps } from "@/components/post-card";
import CourseCard, { CourseCardProps } from "@/components/course-card";
import Link from "next/link";

// Type definitions
interface User {
    id: string;
    username: string;
    name: string;
    profile_picture_url: string;
    email?: string;
}

interface Post extends PostCardProps { }

interface Course extends CourseCardProps { }

interface SearchResponse {
    users: string[];
    courses: string[];
    posts: string[];
}

export default function SearchPage() {
    const [search, setSearch] = useState("");
    const [userResults, setUserResults] = useState<User[]>([]);
    const [postResults, setPostResults] = useState<Post[]>([]);
    const [courseResults, setCourseResults] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState("users");

    useEffect(() => {
        const initUser = async () => {
            const user = await getCurrentUser();
            setCurrentUser(user);
        };
        initUser();
    }, []);

    const searchDebounced = useCallback(
        debounce(async (query: string) => {
            if (!query.trim() || !currentUser) return;

            setIsLoading(true);
            try {
                // Call the search API
                const response = await fetch("/n8n/webhook/search", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        user_id: currentUser.id,
                        query: query.trim(),
                    }),
                });

                if (!response.ok) {
                    throw new Error("Search failed");
                }

                const searchData: SearchResponse = await response.json();

                // Fetch detailed data for each result type
                await Promise.all([
                    fetchUsers(searchData.users),
                    fetchCourses(searchData.courses),
                    fetchPosts(searchData.posts)
                ]);

            } catch (error) {
                console.error("Search error:", error);
                // Clear results on error
                setUserResults([]);
                setCourseResults([]);
                setPostResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 500),
        [currentUser]
    );

    const fetchUsers = async (userIds: string[]) => {
        if (userIds.length === 0) {
            setUserResults([]);
            return;
        }

        const supabase = createClient();
        const { data, error } = await supabase
            .from("users")
            .select("id, username, name, profile_picture_url, email")
            .in("id", userIds);

        if (error) {
            console.error("Error fetching users:", error);
            setUserResults([]);
        } else {
            setUserResults(data || []);
        }
    };

    const fetchCourses = async (courseIds: string[]) => {
        if (courseIds.length === 0) {
            setCourseResults([]);
            return;
        }

        const supabase = createClient();
        const { data, error } = await supabase
            .from("courses")
            .select("*, creator:users!courses_creator_id_fkey(username, profile_picture_url)")
            .in("id", courseIds);

        if (error) {
            console.error("Error fetching courses:", error);
            setCourseResults([]);
        } else {
            setCourseResults(data || []);
        }
    };

    const fetchPosts = async (postIds: string[]) => {
        if (postIds.length === 0) {
            setPostResults([]);
            return;
        }

        const supabase = createClient();
        const { data, error } = await supabase
            .from("posts")
            .select(`
                *,
                user:users!posts_creator_id_fkey(id, username, profile_picture_url),
                likes:likes(count),
                comments:comments(count),
                attachments:attachments(*)
            `)
            .in("id", postIds)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching posts:", error);
            setPostResults([]);
        } else {
            // Transform the data to match PostCard expected format
            const transformedPosts = (data || []).map(post => ({
                ...post,
                likes: post.likes?.[0]?.count || 0,
                comments: post.comments?.[0]?.count || 0,
                liked: false, // Will be updated below
                attachments: post.attachments || []
            }));

            // Check which posts the current user has liked
            if (currentUser && transformedPosts.length > 0) {
                const { data: userLikes, error: likesError } = await supabase
                    .from("likes")
                    .select("post_id")
                    .eq("user_id", currentUser.id)
                    .in("post_id", transformedPosts.map(post => post.id));

                if (!likesError && userLikes) {
                    const likedPostIds = new Set(userLikes.map(like => like.post_id));
                    transformedPosts.forEach(post => {
                        post.liked = likedPostIds.has(post.id);
                    });
                }
            }

            setPostResults(transformedPosts);
        }
    };

    useEffect(() => {
        if (search) {
            searchDebounced(search);
        } else {
            // Clear results when search is empty
            setUserResults([]);
            setCourseResults([]);
            setPostResults([]);
        }
    }, [search, searchDebounced]);

    const getTotalResults = () => {
        return userResults.length + courseResults.length + postResults.length;
    };

    return (
        <div className="mx-auto w-full max-w-2xl py-12 px-4">
            <Card className="border-zinc-200">
                <CardHeader>
                    <div className="flex items-center border-1 border-zinc-200 rounded-3xl shadow-sm py-1 px-6">
                        <SearchIcon className="w-4 h-4 text-zinc-500" />
                        <Input
                            className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-none focus-visible:border-zinc-200"
                            placeholder="Search for users, courses, or posts..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {isLoading && (
                            <Loader2 className="w-4 h-4 text-zinc-500 animate-spin ml-2" />
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {search && (
                        <div>
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <div className="w-full px-4">
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="users" className="flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            Users ({userResults.length})
                                        </TabsTrigger>
                                        <TabsTrigger value="courses" className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4" />
                                            Courses ({courseResults.length})
                                        </TabsTrigger>
                                        <TabsTrigger value="posts" className="flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Posts ({postResults.length})
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <div className="p-0 data-[state=active]:p-0">
                                    {getTotalResults() === 0 && !isLoading && search && (
                                        <div className="text-center py-8">
                                            <p className="text-zinc-500">No results found for "{search}"</p>
                                        </div>
                                    )}

                                    <TabsContent value="users" className="mt-2 p-0 data-[state=active]:p-0">
                                        <div className="grid gap-0">
                                            {userResults.slice().reverse().map((user) => (    
                                                <div key={user.id} className="border-zinc-200 border-t">
                                                    <Link href={`/profile/${user.id}`}>
                                                        <div className="p-4 hover:bg-zinc-50 transition-colors cursor-pointer">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="w-12 h-12 border-zinc-200 border">
                                                                    <AvatarImage className="object-cover" sizes="300px" src={user.profile_picture_url} />
                                                                    <AvatarFallback>
                                                                        {user.name?.charAt(0) || user.username?.charAt(0) || 'U'}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex-1">
                                                                    <p className="font-semibold">{user.name || user.username}</p>
                                                                    <p className="text-zinc-500">@{user.username}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="courses" className="mt-2 p-0 data-[state=active]:p-0">
                                        <hr className="border-zinc-200" />
                                        <div className="space-y-4 p-4 grid grid-cols-2 gap-4">
                                            {courseResults.slice().reverse().map((course) => (
                                                <CourseCard key={course.id} {...course} />
                                            ))}
                                        </div>  
                                    </TabsContent>

                                    <TabsContent value="posts" className="mt-2 p-0 data-[state=active]:p-0">
                                        <div className="space-y-4">
                                            {postResults.slice().reverse().map((post) => (
                                                <PostCard key={post.id} {...post} currentUser={currentUser} />
                                            ))}
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    )}
                </CardContent>
            </Card>


        </div>
    );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}