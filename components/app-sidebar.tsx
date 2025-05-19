"use client"
import { usePathname } from "next/navigation"
import { Brain, GraduationCap, HomeIcon, Send, Wallet, User } from "lucide-react"
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
                {sidebar_items.map((item) => (
                    <Link href={item.href} key={item.label} className={`relative group rounded-lg  items-center justify-center ${pathname === item.href ? 'bg-zinc-100' : ''}`}>
                        <div className={`text-zinc-400 hover:text-zinc-500 p-2 rounded-lg flex items-center justify-center ${pathname === item.href ? 'text-zinc-500' : ''}`}>{item.icon}</div>
                    </Link>
                ))}
            </div>
        </aside>
    )
}   