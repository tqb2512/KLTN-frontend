import { ReactFlowProvider } from "@xyflow/react";
import { Toaster } from "sonner";

export default function LearnLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <ReactFlowProvider>
            <div className="min-h-screen">
                {children}
            </div>
            <Toaster richColors position="top-right" />
        </ReactFlowProvider>
    );
} 