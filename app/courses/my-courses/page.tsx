"use client";
import { createClient } from "@/utils/supabase/client";
import CourseCard, { CourseCardProps } from "@/components/course-card";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import CoursesNavbar from "@/components/courses-navbar";
import { getCurrentUser } from "@/utils/local_user";

export default function MyCourses() {
    const [courses, setCourses] = useState<CourseCardProps[]>([]);
    const pathname = usePathname();

    useEffect(() => {
        const fetchCourses = async () => {
            const supabase = createClient();
            const user = await getCurrentUser();
            if (!user) {
                return;
            }
            const { data, error } = await supabase
                .from("enrolled")
                .select("*, courses(*, creator:users!courses_creator_id_fkey(username, profile_picture_url))")
                .eq("user_id", user.id);    
            if (error) {
                console.error(error);
            } else {
                setCourses(data.map((enrolled) => enrolled.courses));
            }
        }
        fetchCourses();
    }, []);

    return (
        <div>
            <CoursesNavbar />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                {courses.map((course) => (
                    <CourseCard key={course.id} {...course} />
                ))}
            </div>
        </div>
    )
}

