"use client"
import { usePathname } from "next/navigation"
import { Brain, GraduationCap, HomeIcon, Send, Wallet, User, SearchIcon } from "lucide-react"
import Link from "next/link"

const sidebar_items = [
    {
        label: "Home",
        icon: <HomeIcon className="w-7 h-7" />,
        href: "/",
    },
    {
        label: "Messages",
        icon: <Send className="w-7 h-7" />,
        href: "/messages",
    },
    {
        label: "Courses",
        icon: <GraduationCap className="w-7 h-7" />,
        href: "/courses",
    },
    {
        label: "Search",
        icon: <SearchIcon className="w-7 h-7" />,
        href: "/search",
    },
    {
        label: "AI Assistant",
        icon: <Brain className="w-7 h-7" />,
        href: "/ai-assistant",
    },
    {
        label: "Wallet",
        icon: <Wallet className="w-7 h-7" />,
        href: "/wallet",
    },
    {
        label: "Profile",
        icon: <User className="w-7 h-7" />,
        href: "/profile",
    }
]

export default function AppSideBar() {
    const pathname = usePathname();
    return (
        <aside className="h-screen w-20 flex flex-col items-center justify-between border-r border-zinc-200 sticky top-0">
            <div className="flex flex-col gap-8 flex-1 items-center justify-center">
                {sidebar_items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link href={item.href} key={item.label} className={`relative group rounded-lg  items-center justify-center ${isActive ? 'bg-zinc-100' : ''}`}>
                            <div className={`text-zinc-400 hover:text-zinc-500 p-2 rounded-lg flex items-center justify-center ${isActive ? 'text-zinc-500' : ''}`}>{item.icon}</div>
                        </Link>
                    )
                })}
            </div>
        </aside>
    )
}   