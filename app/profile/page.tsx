"use client";
import { createClient } from "@/utils/supabase/client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/utils/local_user";

export default function ProfilePage() {
    const router = useRouter();

    useEffect(() => {
        getCurrentUser().then((user) => {
            if (!user) {
                router.push("/");
            } else {
                router.push(`/profile/${user.id}`);
            }
        });
    }, []);
}