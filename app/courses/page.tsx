"use client";
import { createClient } from "@/utils/supabase/client";
import CourseCard, { CourseCardProps } from "@/components/course-card";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import CoursesNavbar from "@/components/courses-navbar";
import { getCurrentUser } from "@/utils/local_user";

export default function Courses() {
    const [allCourses, setAllCourses] = useState<CourseCardProps[]>([]);
    const [recommendedCourses, setRecommendedCourses] = useState<CourseCardProps[]>([]);
    const [popularCourses, setPopularCourses] = useState<CourseCardProps[]>([]);
    const [recentCourses, setRecentCourses] = useState<CourseCardProps[]>([]);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
        const fetchCoursesData = async () => {
            setLoading(true);
            await Promise.all([
                fetchAllCourses(),
                fetchRecommendedCourses(),
                fetchPopularCourses(),
                fetchRecentCourses()
            ]);
            setLoading(false);
        };
        
        fetchCoursesData();
    }, []);

    const fetchAllCourses = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from("courses")
            .select("*, creator:users!courses_creator_id_fkey(username, profile_picture_url)");
        if (error) {
            console.error("Error fetching all courses:", error);
        } else {
            setAllCourses(data || []);
        }
    };

    const fetchRecommendedCourses = async () => {
        try {
            const user = await getCurrentUser();
            if (!user) {
                console.log("No user found, skipping recommendations");
                return;
            }

            const response = await fetch("/n8n/webhook/get-recommendations", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: user.id
                })
            });

            if (response.ok) {
                const data = await response.json();
                const courseRecommendations = data.course_ids || [];
                
                if (courseRecommendations.length > 0) {
                    // Extract just the course IDs for the database query
                    const courseIds = Array.isArray(courseRecommendations[0]) 
                        ? courseRecommendations.map((item: any) => typeof item === 'object' ? item.course_id || item.id : item)
                        : courseRecommendations;
                    
                    const supabase = createClient();
                    const { data: coursesData, error } = await supabase
                        .from("courses")
                        .select("*, creator:users!courses_creator_id_fkey(username, profile_picture_url)")
                        .in('id', courseIds);
                    
                    if (error) {
                        console.error("Error fetching recommended courses:", error);
                    } else if (coursesData) {
                        // Create a map of courses by ID for easy lookup
                        const coursesMap = new Map(coursesData.map(course => [course.id, course]));
                        
                        // Sort courses according to the order/index returned by the recommendation API
                        const sortedRecommendedCourses: CourseCardProps[] = [];
                        
                        courseRecommendations.forEach((recommendation: any, index: number) => {
                            let courseId: string;
                            let recommendationIndex: number = index; // Default to array position
                            
                            // Handle different possible API response formats
                            if (typeof recommendation === 'object') {
                                courseId = recommendation.course_id || recommendation.id;
                                recommendationIndex = recommendation.index !== undefined ? recommendation.index : index;
                            } else {
                                courseId = recommendation;
                            }
                            
                            const course = coursesMap.get(courseId);
                            if (course) {
                                // Add the recommendation index to the course for sorting
                                sortedRecommendedCourses.push({
                                    ...course,
                                    recommendationIndex
                                });
                            }
                        });
                        
                        // Sort by recommendation index to respect API ordering
                        sortedRecommendedCourses.sort((a: any, b: any) => 
                            (a.recommendationIndex || 0) - (b.recommendationIndex || 0)
                        );
                        
                        setRecommendedCourses(sortedRecommendedCourses);
                    }
                }
            } else {
                console.error("Failed to fetch recommendations");
            }
        } catch (error) {
            console.error("Error fetching recommendations:", error);
        }
    };

    const fetchPopularCourses = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from("courses")
            .select("*, creator:users!courses_creator_id_fkey(username, profile_picture_url)")
            .order('total_enrolled', { ascending: false })
            .limit(8);
        
        if (error) {
            console.error("Error fetching popular courses:", error);
        } else {
            setPopularCourses(data || []);
        }
    };

    const fetchRecentCourses = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from("courses")
            .select("*, creator:users!courses_creator_id_fkey(username, profile_picture_url)")
            .order('created_at', { ascending: false })
            .limit(8);
        
        if (error) {
            console.error("Error fetching recent courses:", error);
        } else {
            setRecentCourses(data || []);
        }
    };

    const CourseSection = ({ title, courses, showAll = false }: { title: string, courses: CourseCardProps[], showAll?: boolean }) => (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-4 px-4">
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            </div>
            <div className="h-full px-4">
                <div className={`grid gap-4 ${showAll ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
                    {(showAll ? courses : courses.slice(0, 4)).map((course) => (
                        <CourseCard key={course.id} {...course} />
                    ))}
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div>
                <CoursesNavbar />
                <div className="p-4">
                    <div className="animate-pulse space-y-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i}>
                                <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {[1, 2, 3, 4].map((j) => (
                                        <div key={j} className="border rounded-lg overflow-hidden border-zinc-200">
                                            <div className="w-full h-48 bg-gray-200"></div>
                                            <div className="p-4 space-y-2">
                                                <div className="h-4 bg-gray-200 rounded"></div>
                                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <CoursesNavbar />
            <div className="py-6">
                {/* Recommended Courses Section - only show if user is logged in and has recommendations */}
                {recommendedCourses.length > 0 && (
                    <CourseSection title="Recommended for You" courses={recommendedCourses} />
                )}

                {/* Popular Courses Section */}
                <CourseSection title="Popular Courses" courses={popularCourses} />

                {/* Recent Courses Section */}
                <CourseSection title="New Courses" courses={recentCourses} />

                {/* All Courses Section */}
                <CourseSection title="All Courses" courses={allCourses} showAll={true} />
            </div>
        </div>
    );
}

