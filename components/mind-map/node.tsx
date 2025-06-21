import { Handle, Position } from "@xyflow/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type MindMapNodeProps = {
    id: string;
    data: {
        label: string;
        level: number;
    };
}

export default function MindMapNode({ id, data }: MindMapNodeProps) {
    return (
        <>
            <Handle 
                type="target" 
                position={Position.Left} 
                className="w-3 h-3 !bg-gray-400 !border-2 !border-white opacity-0 hover:opacity-100 transition-opacity"
            />
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="mind-map-node rounded-xl bg-blue-100 p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 text-center w-48 cursor-pointer">
                            <div className="text-sm font-medium text-gray-800 leading-tight truncate">
                                {data.label}
                            </div>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="max-w-xs text-sm">{data.label}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <Handle 
                type="source" 
                position={Position.Right} 
                className="w-3 h-3 !bg-gray-400 !border-2 !border-white opacity-0 hover:opacity-100 transition-opacity"
            />
        </>
    )
}