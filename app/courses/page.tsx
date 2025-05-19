"use client";
import { createClient } from "@/utils/supabase/client";
import CourseCard, { CourseCardProps } from "@/components/course-card";
import { useEffect, useState } from "react";

export default function Courses() {
    const [courses, setCourses] = useState<CourseCardProps[]>([]);

    useEffect(() => {
        const fetchCourses = async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("courses")
                .select("*");
            if (error) {
                console.error(error);
            } else {
                setCourses(data);
            }
        }
        fetchCourses();
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {courses.map((course) => (
                <CourseCard key={course.id} {...course} />
            ))}
        </div>
    )
}
