import { Handle, Position } from "@xyflow/react";

type MindMapNodeProps = {
    id: string;
    data: {
        label: string;
        description: string;
    };
}

export default function MindMapNode({ id, data }: MindMapNodeProps) {
    return (
        <>
            <Handle type="source" className="hidden" position={Position.Left} />
            <div className="mind-map-node rounded-xl bg-blue-100 p-2">
                <h1 className="text-lg font-medium">{data.label}</h1>
            </div>
            <Handle type="target" className="hidden" position={Position.Right} />
        </>

    )
}