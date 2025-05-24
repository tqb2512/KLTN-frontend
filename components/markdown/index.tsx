import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "../ui/dialog";
import { createClient } from "@/utils/supabase/client";
import { MDXEditorMethods } from "@mdxeditor/editor";
import dynamic from "next/dynamic";
import { FileText } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

const Editor = dynamic(() => import("./initialize-mdxeditor"), { ssr: false });

type MarkdownDialogProps = {
    id: string;
    title: string;
    createdAt: string;
}

export default function MarkdownDialog({ id, title, createdAt }: MarkdownDialogProps) {
    const [open, setOpen] = useState(false);
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const editorRef = useRef<MDXEditorMethods>(null);

    useEffect(() => {
        const fetchMarkdown = async () => {
            const supabase = createClient();
            const { data, error } = await supabase.from("space_notes").select("content").eq("id", id).single();
            if (error) {
                console.error(error);
                setLoading(false);
                return;
            }
            setContent(data?.content || "");
            setLoading(false);
        }

        if (open) {
            // Reset content first to prevent showing stale content
            setContent("");
            setLoading(true);
            fetchMarkdown();
        }
    }, [id, open]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="flex flex-row gap-2 items-center hover:bg-accent hover:text-accent-foreground p-2 rounded-md justify-between cursor-pointer transition-colors">
                    <div className="flex flex-row gap-2 items-center">
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <p className="line-clamp-1 text-sm font-medium">{title}</p>
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="min-w-[900px] max-h-[90vh] p-0 flex flex-col overflow-hidden">
                <DialogTitle className="px-4 pt-4 flex-shrink-0">{title}</DialogTitle>
                <ScrollArea className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-sm text-muted-foreground">Loading...</div>
                        </div>
                    ) : (
                        <Editor
                            editorRef={editorRef}
                            markdown={content}
                        />
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
