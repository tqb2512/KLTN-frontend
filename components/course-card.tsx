import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Star, Users, BookOpen, CircleDollarSign, DollarSign } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export interface CourseCardProps {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    price: number;
    total_enrolled: number;
    total_lessons: number;
    rating: number;
    topics: string[];
    created_at: string;
    creator: {
        username: string;
        profile_picture_url: string;
    }
}

export default function CourseCard({ id, title, description, thumbnail_url, price, total_enrolled, total_lessons, rating, topics, created_at, creator }: CourseCardProps) {
    return (
        <div className="border-zinc-200 border rounded-lg overflow-hidden cursor-pointer">
            <div className="relative w-full h-48 overflow-hidden">
                <Image src={thumbnail_url} alt={title} fill className="object-cover" />
            </div>
            <div className="p-4 flex flex-col gap-2">
                <h3 className="text-lg font-bold line-clamp-2">{title}</h3>
                <p className="text-sm text-zinc-500">{creator.username}</p>
                <p className="text-sm text-zinc-500 line-clamp-2">{description}</p>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        <p className="text-sm text-zinc-500">{rating}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <p className="text-sm text-zinc-500">{total_lessons} lessons</p>
                    </div>
                </div>

            </div>
            <hr className="border-zinc-200" />
            <div className="flex items-center justify-between px-4 py-2">
                <div />
                <p className="text-lg font-bold">{price} <span className="text-sm text-zinc-500">Credits</span></p>
            </div>
        </div>
    )
}

