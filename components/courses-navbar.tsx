import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { Settings } from "lucide-react";

export default function CoursesNavbar() {
    const pathname = usePathname();
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
                <Button variant="outline" className="border-zinc-200">
                    <Settings className="w-4 h-4" />
                </Button>
            </div>
        </div>
    )
}
