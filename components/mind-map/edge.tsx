import { EdgeProps, getBezierPath } from '@xyflow/react';

export default function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
}: EdgeProps) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    return (
        <>
            <defs>
                <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.6} />
                </linearGradient>
            </defs>
            <path
                id={id}
                style={{
                    ...style,
                    stroke: 'url(#edge-gradient)',
                    strokeWidth: 3,
                    fill: 'none',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                }}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={markerEnd}
            />
        </>
    );
} 