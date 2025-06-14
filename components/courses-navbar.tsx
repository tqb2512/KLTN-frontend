"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Settings, Plus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { getCurrentUser } from "@/utils/local_user";

export default function CoursesNavbar() {
    const pathname = usePathname();
    const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
    const [preferredTopics, setPreferredTopics] = useState<string[]>([]);
    const [newTopic, setNewTopic] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Common topics to suggest
    const suggestedTopics = [
        "Programming", "Web Development", "Data Science", "Machine Learning", 
        "Artificial Intelligence", "Mobile Development", "DevOps", "Cloud Computing",
        "Cybersecurity", "UI/UX Design", "Database", "Mathematics", "Physics",
        "Chemistry", "Biology", "Business", "Marketing", "Finance", "Photography",
        "Music", "Art", "History", "Languages", "Fitness", "Cooking"
    ];

    useEffect(() => {
        const fetchCurrentUser = async () => {
            const user = await getCurrentUser();
            setCurrentUser(user);
        };
        fetchCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUser && isPreferencesOpen) {
            loadUserPreferences();
        }
    }, [currentUser, isPreferencesOpen]);

    const loadUserPreferences = async () => {
        if (!currentUser) return;

        const supabase = createClient();
        const { data, error } = await supabase
            .from("users")
            .select("preferred_topics")
            .eq("id", currentUser.id)
            .single();

        if (error) {
            console.error("Error loading user preferences:", error);
        } else {
            setPreferredTopics(data?.preferred_topics || []);
        }
    };

    const saveUserPreferences = async () => {
        if (!currentUser) return;

        setIsLoading(true);
        const supabase = createClient();
        
        const { error } = await supabase
            .from("users")
            .update({ preferred_topics: preferredTopics })
            .eq("id", currentUser.id);

        fetch("/n8n/webhook/update-user-preferences", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: currentUser.id,
            })
        });

        if (error) {
            console.error("Error saving user preferences:", error);
        } else {
            setIsPreferencesOpen(false);
        }
        setIsLoading(false);
    };

    const addTopic = (topic: string) => {
        const trimmedTopic = topic.trim();
        if (trimmedTopic && !preferredTopics.includes(trimmedTopic)) {
            setPreferredTopics(prev => [...prev, trimmedTopic]);
            setNewTopic("");
        }
    };

    const removeTopic = (topicToRemove: string) => {
        setPreferredTopics(prev => prev.filter(topic => topic !== topicToRemove));
    };

    const addCustomTopic = () => {
        if (newTopic.trim()) {
            addTopic(newTopic);
        }
    };

    return (
        <div className="flex h-16 border-b border-gray-200 items-center w-full justify-between">
            <div className="flex items-center h-full">
                <Link href="/courses" className={`${pathname === "/courses" ? "border-b-2 border-black" : ""} h-full flex items-center px-4`}>
                    <h1 className="text-xl font-bold">Explore</h1>
                </Link>
                <Link href="/courses/my-courses" className={`${pathname === "/courses/my-courses" ? "border-b-2 border-black" : ""} h-full flex items-center px-4`}>
                    <h1 className="text-xl font-bold">My Courses</h1>
                </Link>
                <Link href="/courses/creator-dashboard" className={`${pathname === "/courses/creator-dashboard" ? "border-b-2 border-black" : ""} h-full flex items-center px-4`}>
                    <h1 className="text-xl font-bold">Creator Dashboard</h1>
                </Link>
            </div>

            <div className="flex items-center justify-end h-full w-48 mr-4">
                <Dialog open={isPreferencesOpen} onOpenChange={setIsPreferencesOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="border-zinc-200">
                            <Settings className="w-4 h-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Preferred Topics</DialogTitle>
                            <DialogDescription>
                                Select topics you're interested in to get personalized course recommendations.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-6 py-4">
                            {/* Current preferred topics */}
                            <div>
                                <Label className="text-sm font-medium">Your Preferred Topics</Label>
                                <div className="flex flex-wrap gap-2 mt-2 min-h-[40px] p-3 border border-gray-200 rounded-md">
                                    {preferredTopics.length === 0 ? (
                                        <p className="text-sm text-gray-500 italic">No topics selected yet</p>
                                    ) : (
                                        preferredTopics.map((topic, index) => (
                                            <Badge key={index} variant="default" className="flex items-center gap-1 bg-blue-100 text-blue-800 hover:bg-blue-200">
                                                {topic}
                                                <button
                                                    onClick={() => removeTopic(topic)}
                                                    className="ml-1 hover:text-red-600"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </Badge>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Add custom topic */}
                            <div>
                                <Label className="text-sm font-medium">Add Custom Topic</Label>
                                <div className="flex gap-2 mt-2">
                                    <Input
                                        value={newTopic}
                                        onChange={(e) => setNewTopic(e.target.value)}
                                        placeholder="Enter a topic..."
                                        onKeyPress={(e) => e.key === 'Enter' && addCustomTopic()}
                                        className="flex-1"
                                    />
                                    <Button onClick={addCustomTopic} variant="outline" size="sm">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Suggested topics */}
                            <div>
                                <Label className="text-sm font-medium">Suggested Topics</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {suggestedTopics
                                        .filter(topic => !preferredTopics.includes(topic))
                                        .map((topic, index) => (
                                            <Badge 
                                                key={index} 
                                                variant="outline" 
                                                className="cursor-pointer hover:bg-gray-100 transition-colors border-zinc-200"
                                                onClick={() => addTopic(topic)}
                                            >
                                                {topic}
                                                <Plus className="w-3 h-3 ml-1" />
                                            </Badge>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button 
                                variant="outline" 
                                onClick={() => setIsPreferencesOpen(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={saveUserPreferences}
                                disabled={isLoading}
                            >
                                {isLoading ? "Saving..." : "Save Preferences"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}
