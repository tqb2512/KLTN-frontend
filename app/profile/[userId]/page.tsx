"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostCard from "@/components/post-card";
import { getAccessToken, getCurrentUser } from "@/utils/local_user";
import { createClient } from "@/utils/supabase/client";
import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<any | null>(null);
    const [user, setUser] = useState<any | null>(null);
    const [friends, setFriends] = useState<any[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends'>('none');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isFetchingStatus, setIsFetchingStatus] = useState<boolean>(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
    const [editForm, setEditForm] = useState({
        name: '',
        username: '',
        phone_number: '',
        profile_picture_url: ''
    });
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchCurrentUser = async () => {
            const user = await getCurrentUser();
            setCurrentUser(user);
        };

        const fetchUser = async () => {
            const supabase = createClient(await getAccessToken());
            const { data, error } = await supabase.from("users").select("*").eq("id", userId);
            if (error) {
                console.error(error);
            } else {
                setUser(data[0]);
            }
        }

        const fetchFriendshipStatus = async () => {
            const currentUserData = await getCurrentUser();
            if (!currentUserData || currentUserData.id === userId) {
                setIsFetchingStatus(false);
                return;
            }

            const supabase = createClient(await getAccessToken());

            // Check if there's an existing friendship in either direction
            const { data, error } = await supabase
                .from("friendships")
                .select("*")
                .or(`and(user_id_send.eq.${currentUserData.id},user_id_receive.eq.${userId}),and(user_id_send.eq.${userId},user_id_receive.eq.${currentUserData.id})`);

            if (error) {
                console.error("Error fetching friendship status:", error);
                setIsFetchingStatus(false);
                return;
            }

            if (data && data.length > 0) {
                const friendship = data[0];
                if (friendship.status === 'accepted') {
                    setFriendshipStatus('friends');
                } else if (friendship.status === 'pending') {
                    if (friendship.user_id_send === currentUserData.id) {
                        setFriendshipStatus('pending_sent');
                    } else {
                        setFriendshipStatus('pending_received');
                    }
                }
            } else {
                setFriendshipStatus('none');
            }
            setIsFetchingStatus(false);
        };

        const fetchFriends = async () => {
            const supabase = createClient(await getAccessToken());
            const { data, error } = await supabase
                .from("friendships")
                .select(`
                    *,
                    user_send:user_id_send(id, name, username, profile_picture_url),
                    user_receive:user_id_receive(id, name, username, profile_picture_url)
                `)
                .eq("status", "accepted")
                .or(`user_id_send.eq.${userId},user_id_receive.eq.${userId}`);

            if (error) {
                console.error("Error fetching friends:", error);
            } else {
                setFriends(data || []);
            }
        }

        const fetchPosts = async () => {
            const supabase = createClient(await getAccessToken());
            const { data, error } = await supabase
                .from("posts")
                .select(`
                    *,
                    users:creator_id(id, name, username, profile_picture_url),
                    likes:likes(count),
                    comments:comments(count),
                    attachments:attachments(*)
                `)
                .eq("creator_id", userId)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching posts:", error);
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
                const currentUserData = await getCurrentUser();
                if (currentUserData && transformedPosts.length > 0) {
                    const { data: userLikes, error: likesError } = await supabase
                        .from("likes")
                        .select("post_id")
                        .eq("user_id", currentUserData.id)
                        .in("post_id", transformedPosts.map(post => post.id));

                    if (!likesError && userLikes) {
                        const likedPostIds = new Set(userLikes.map(like => like.post_id));
                        transformedPosts.forEach(post => {
                            post.liked = likedPostIds.has(post.id);
                        });
                    }
                }
                
                setPosts(transformedPosts);
            }
        }

        fetchCurrentUser();
        fetchUser();
        fetchFriendshipStatus();
        fetchFriends();
        fetchPosts();
    }, [userId]);

    // Update edit form when user data is loaded
    useEffect(() => {
        if (user && currentUser && currentUser.id === userId) {
            setEditForm({
                name: user.name || '',
                username: user.username || '',
                phone_number: user.phone_number || '',
                profile_picture_url: user.profile_picture_url || ''
            });
            setAvatarPreview(user.profile_picture_url || null);
        }
    }, [user, currentUser, userId]);

    const sendFriendRequest = async () => {
        if (!currentUser) return;

        setIsLoading(true);
        const supabase = createClient(await getAccessToken());

        const { error } = await supabase
            .from("friendships")
            .insert({
                user_id_send: currentUser.id,
                user_id_receive: userId,
                status: 'pending'
            });

        if (error) {
            console.error("Error sending friend request:", error);
        } else {
            setFriendshipStatus('pending_sent');
        }
        setIsLoading(false);
    };

    const acceptFriendRequest = async () => {
        if (!currentUser) return;

        setIsLoading(true);
        const supabase = createClient(await getAccessToken());

        const { error } = await supabase
            .from("friendships")
            .update({ status: 'accepted' })
            .eq('user_id_send', userId)
            .eq('user_id_receive', currentUser.id);

        if (error) {
            console.error("Error accepting friend request:", error);
        } else {
            setFriendshipStatus('friends');
            // Refresh friends list
            const { data } = await supabase
                .from("friendships")
                .select(`
                    *,
                    user_send:user_id_send(id, name, username, profile_picture_url),
                    user_receive:user_id_receive(id, name, username, profile_picture_url)
                `)
                .eq("status", "accepted")
                .or(`user_id_send.eq.${userId},user_id_receive.eq.${userId}`);
            setFriends(data || []);
        }
        setIsLoading(false);
    };

    const removeFriend = async () => {
        if (!currentUser) return;

        setIsLoading(true);
        const supabase = createClient(await getAccessToken());

        const { error } = await supabase
            .from("friendships")
            .delete()
            .or(`and(user_id_send.eq.${currentUser.id},user_id_receive.eq.${userId}),and(user_id_send.eq.${userId},user_id_receive.eq.${currentUser.id})`);

        if (error) {
            console.error("Error removing friend:", error);
        } else {
            setFriendshipStatus('none');
            // Refresh friends list
            const { data } = await supabase
                .from("friendships")
                .select(`
                    *,
                    user_send:user_id_send(id, name, username, profile_picture_url),
                    user_receive:user_id_receive(id, name, username, profile_picture_url)
                `)
                .eq("status", "accepted")
                .or(`user_id_send.eq.${userId},user_id_receive.eq.${userId}`);
            setFriends(data || []);
        }
        setIsLoading(false);
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        setIsUploadingAvatar(true);

        try {
            const supabase = createClient(await getAccessToken());
            
            // Create unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentUser?.id}/${Date.now()}.${fileExt}`;
            
            // Upload to Supabase storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file);

            if (uploadError) {
                console.error('Upload error:', uploadError);
                alert('Failed to upload image');
                return;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            const { data: updateData, error: updateError } = await supabase
                .from("users")
                .update({ profile_picture_url: publicUrl })
                .eq("id", currentUser.id)
                .select()

            // Update form and preview
            setEditForm(prev => ({ ...prev, profile_picture_url: publicUrl }));
            setAvatarPreview(publicUrl);

        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Failed to upload image');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleAvatarClick = () => {
        if (currentUser && currentUser.id === userId) {
            fileInputRef.current?.click();
        }
    };

    const handleEditProfile = async () => {
        if (!currentUser) return;

        setIsLoading(true);
        const supabase = createClient(await getAccessToken());

        const { error } = await supabase
            .from("users")
            .update({
                name: editForm.name,
                username: editForm.username,
                phone_number: editForm.phone_number || null,
                profile_picture_url: editForm.profile_picture_url || null
            })
            .eq('id', currentUser.id);

        if (error) {
            console.error("Error updating profile:", error);
        } else {
            // Refresh user data
            const { data } = await supabase.from("users").select("*").eq("id", userId);
            if (data) {
                setUser(data[0]);
            }
            setIsEditDialogOpen(false);
            setAvatarPreview(null);
        }
        setIsLoading(false);
    };

    const renderFriendButton = () => {
        if (!currentUser) {
            return null;
        }

        // Show edit profile button for own profile
        if (currentUser.id === userId) {
            return (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full border-zinc-200" variant="outline">
                            Edit Profile
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Edit Profile</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">
                                    Avatar
                                </Label>
                                <div className="col-span-3 flex items-center gap-4">
                                    <Avatar className="w-16 h-16 border-zinc-200 border">
                                        <AvatarImage className="object-cover" sizes="300px" src={avatarPreview || user?.profile_picture_url} />
                                        <AvatarFallback>{user?.username?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploadingAvatar}
                                    >
                                        {isUploadingAvatar ? 'Uploading...' : 'Change Avatar'}
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Name
                                </Label>
                                <Input
                                    id="name"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="username" className="text-right">
                                    Username
                                </Label>
                                <Input
                                    id="username"
                                    value={editForm.username}
                                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="phone" className="text-right">
                                    Phone
                                </Label>
                                <Input
                                    id="phone"
                                    value={editForm.phone_number}
                                    onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleEditProfile} disabled={isLoading}>
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            );
        }

        if (isFetchingStatus) {
            return (
                <Button className="w-full" disabled>
                    Loading...
                </Button>
            );
        }

        switch (friendshipStatus) {
            case 'none':
                return (
                    <Button className="w-full border-zinc-200" onClick={sendFriendRequest} disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Add Friend'}
                    </Button>
                );
            case 'pending_sent':
                return (
                    <Button className="w-full border-zinc-200" variant="outline" disabled>
                        Request Sent
                    </Button>
                );
            case 'pending_received':
                return (
                    <div className="flex gap-2 w-full">
                        <Button className="flex-1 border-zinc-200" onClick={acceptFriendRequest} disabled={isLoading}>
                            {isLoading ? 'Accepting...' : 'Accept'}
                        </Button>
                        <Button className="flex-1 border-zinc-200" variant="outline" onClick={removeFriend} disabled={isLoading}>
                            {isLoading ? 'Declining...' : 'Decline'}
                        </Button>
                    </div>
                );
            case 'friends':
                return (
                    <Button className="w-full border-zinc-200" variant="outline" onClick={removeFriend} disabled={isLoading}>
                        {isLoading ? 'Removing...' : 'Remove Friend'}
                    </Button>
                );
            default:
                return null;
        }
    };

    return (
        <div className="mx-auto w-full max-w-2xl py-12">
            <Card className="border-zinc-200">
                <CardHeader className="flex flex-col gap-3 pb-0">
                    <CardTitle className="flex flex-row items-center gap-3 w-full justify-between">
                        <div className="flex flex-row items-center gap-3">
                            <div className="flex flex-col">
                                <p className="text-2xl font-bold">{user?.name}</p>
                                <p className="text-zinc-500">@{user?.username}</p>
                            </div>
                        </div>
                        <div className="relative">
                            <Avatar 
                                className={`w-20 h-20 shrink-0`}
                                onClick={handleAvatarClick}
                            >
                                <AvatarImage className="object-cover" sizes="300px" src={user?.profile_picture_url} />
                                <AvatarFallback>{user?.username?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                    </CardTitle>
                    <div className="flex flex-row items-center gap-3">
                        <p className="text-zinc-500">{friends.length} friends</p>
                    </div>
                    {renderFriendButton()}
                    {currentUser && currentUser.id !== userId && (
                        <Button 
                            className="w-full border-zinc-200" 
                            variant="outline"
                            onClick={() => router.push(`/messages?userId=${userId}`)}
                        >
                            Message
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    <Tabs defaultValue="posts" className="w-full">
                        <div className="px-4 pb-0">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="posts">Posts</TabsTrigger>
                                <TabsTrigger value="friends">Friends</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="posts" className="mt-4 p-0 data-[state=active]:p-0">
                            <div className="space-y-4">
                                {posts.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-zinc-500">No posts yet</p>
                                    </div>
                                ) : (
                                    <>  
                                    {
                                        posts.map((post, index) => (
                                            <PostCard
                                                key={post.id || `post-${index}`}
                                                id={post.id}
                                                user={post.users}
                                                content={post.content}
                                                created_at={post.created_at}
                                                likes={post.likes}
                                                comments={post.comments}
                                                attachments={post.attachments}
                                                liked={post.liked}
                                                currentUser={currentUser}
                                            />
                                        ))
                                    }
                                    </>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="friends" className="mt-4 p-4 data-[state=active]:p-0">
                            <div className="space-y-4">
                                {friends.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-zinc-500">No friends yet</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {friends.map((friendship, index) => {
                                            const friend = friendship.user_id_send === userId
                                                ? friendship.user_receive
                                                : friendship.user_send;

                                            return (
                                                <div key={friendship.id || `friendship-${index}`} className="border-zinc-200 border-t">
                                                    <div className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="w-12 h-12 border-zinc-200 border">
                                                                <AvatarImage className="object-cover" sizes="300px" src={friend?.profile_picture_url} />
                                                                <AvatarFallback>{friend?.username?.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1">
                                                                <p className="font-semibold">{friend?.name}</p>
                                                                <p className="text-zinc-500">@{friend?.username}</p>
                                                            </div>
                                                                                                        <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-zinc-200"
                                                onClick={() => router.push(`/profile/${friend?.id}`)}
                                            >
                                                View Profile
                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
