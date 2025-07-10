"use client";

import { usePathname } from "next/navigation";
import AppSidebar from "@/components/app-sidebar";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    
    // Hide sidebar on authentication pages
    const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";
    
    if (isAuthPage) {
        return (
            <main className="min-h-screen">
                {children}
            </main>
        );
    }
    
    return (
        <main className="flex flex-row">
            <AppSidebar />
            <div className="flex-1">
                {children}
            </div>
        </main>
    );
} 