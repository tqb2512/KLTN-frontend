import { Background, Controls, ReactFlow, useNodesState, useEdgesState } from "@xyflow/react";
import '@xyflow/react/dist/style.css';
import MindMapNode from "./node";
import CustomEdge from "./edge";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Map } from "lucide-react";

type MindMapDialogProps = {
    id: string;
    title: string;
    createdAt: string;
};

const nodeTypes = {
    mindMapNode: MindMapNode
}

const edgeTypes = {
    custom: CustomEdge,
};

export default function MindMapDialog({ id, title, createdAt }: MindMapDialogProps) {

    const [open, setOpen] = useState(false);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    useEffect(() => {
        const fetchMindMap = async () => {
            const supabase = createClient();
            const { data, error } = await supabase.from("space_notes").select("content").eq("id", id).single();
            if (error) {
                console.error(error);
            }
            const content = JSON.parse(data?.content);
            
            // Make sure all nodes are draggable and use the custom type
            const processedNodes = content.nodes.map((node: any) => ({
                ...node,
                draggable: true,
                type: node.type || 'mindMapNode'
            }));
            
            // Force all edges to use bezier curves
            const processedEdges = content.edges.map((edge: any) => ({
                ...edge,
                type: 'custom'
            }));
            
            setNodes(processedNodes);
            setEdges(processedEdges);
        }

        if (open) {
            fetchMindMap();
        }
    }, [id, open, setNodes, setEdges]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="flex flex-row gap-2 items-center hover:bg-gray-100 p-2 rounded-md justify-between cursor-pointer">
                <div className="flex flex-row gap-2 items-center">
                        <Map className="h-4 w-4 flex-shrink-0" />
                        <p className="line-clamp-1 text-sm font-medium">{title}</p>
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="min-w-[900px] p-0">
                <DialogTitle className="hidden"></DialogTitle>
                <DialogDescription className="hidden"></DialogDescription>
                <div className="w-[900px] h-[600px]">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        nodesDraggable={true}
                        nodesConnectable={false}
                        elementsSelectable={true}
                        defaultEdgeOptions={{
                            type: 'custom',
                        }}
                        proOptions={{
                            hideAttribution: true,
                        }}
                    >
                        <Background />
                        <Controls showFitView={false} showInteractive={false} />
                    </ReactFlow>
                </div>
            </DialogContent>
        </Dialog>
    )
}