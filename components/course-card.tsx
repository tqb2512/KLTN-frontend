import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Star, Users } from "lucide-react";

export interface CourseCardProps {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    price: number;
    total_enrolled: number;
    rating: number;
    topics: string[];
    created_at: string;
    creator: {
        username: string;
        profile_picture_url: string;
    }
}

export default function CourseCard({ id, title, description, thumbnail_url, price, total_enrolled, rating, topics, created_at, creator }: CourseCardProps) {
    return (
        <Card className="">
            
        </Card>
    )
}

