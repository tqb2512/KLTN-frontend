import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CoursesNavbar() {
    const pathname = usePathname();
    return (
        <div className="flex h-16 border-b border-gray-200 items-center">
            <Link href="/courses" className={`${pathname === "/courses" ? "border-b-2 border-black" : ""} h-full flex items-center px-4`}>
                <h1 className="text-xl font-bold">Explore</h1>
            </Link>
            <Link href="/courses/my-courses" className={`${pathname === "/courses/my-courses" ? "border-b-2 border-black" : ""} h-full flex items-center px-4`}>
                <h1 className="text-xl font-bold">My Courses</h1>
            </Link>
        </div>
    )
}
