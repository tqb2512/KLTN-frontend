'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableDescriptionProps {
    description: string;
    className?: string;
}

export function ExpandableDescription({ description, className = '' }: ExpandableDescriptionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!description) return null;

    return (
        <div className={`space-y-2 ${className}`}>
            <p
                className={`text-sm text-muted-foreground ${!isExpanded ? 'line-clamp-2' : ''
                    }`}
            >
                {description}
            </p>
            {description.length > 100 && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-auto p-0 text-xs hover:bg-transparent text-zinc-500 hover:text-zinc-600"
                >
                    {isExpanded ? (
                        <>
                            See less <ChevronUp className="w-3 h-3 ml-1" />
                        </>
                    ) : (
                        <>
                            See more <ChevronDown className="w-3 h-3 ml-1" />
                        </>
                    )}
                </Button>
            )}
        </div>
    );
} 