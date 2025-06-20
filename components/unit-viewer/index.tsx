'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Play, 
    Pause, 
    Volume2, 
    VolumeX, 
    Maximize, 
    RotateCcw, 
    BookOpen,
    FileText,
    Video
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Unit {
    id: string;
    title: string;
    description: string;
    content: string;
    type: 'text' | 'video' | 'markdown';
    video_url?: string;
    duration?: number;
}

interface UnitViewerProps {
    unit: Unit;
    onComplete?: () => void;
    isCompleted?: boolean;
}

const VideoPlayer = ({ 
    videoUrl, 
    title,
    onProgress 
}: { 
    videoUrl: string; 
    title: string;
    onProgress?: (progress: number) => void;
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
        };

        const handleTimeUpdate = () => {
            const current = video.currentTime;
            const total = video.duration;
            const progressPercent = (current / total) * 100;
            
            setCurrentTime(current);
            setProgress(progressPercent);
            
            if (onProgress) {
                onProgress(progressPercent);
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('ended', handleEnded);
        };
    }, [onProgress]);

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.pause();
        } else {
            video.play();
        }
        setIsPlaying(!isPlaying);
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;

        video.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        if (!video) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const newTime = (clickX / width) * duration;
        
        video.currentTime = newTime;
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const toggleFullscreen = () => {
        const video = videoRef.current;
        if (!video) return;

        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            video.requestFullscreen();
        }
    };

    return (
        <div className="relative w-full bg-black rounded-lg overflow-hidden">
            <video
                ref={videoRef}
                className="w-full h-auto"
                poster={`/api/placeholder/800/450`}
                preload="metadata"
            >
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
            </video>

            {/* Video Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                {/* Progress Bar */}
                <div 
                    className="w-full h-1 bg-white/30 rounded-full mb-3 cursor-pointer"
                    onClick={handleSeek}
                >
                    <div 
                        className="h-full bg-white rounded-full transition-all duration-100"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={togglePlay}
                            className="text-white hover:bg-white/20"
                        >
                            {isPlaying ? (
                                <Pause className="w-4 h-4" />
                            ) : (
                                <Play className="w-4 h-4" />
                            )}
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleMute}
                            className="text-white hover:bg-white/20"
                        >
                            {isMuted ? (
                                <VolumeX className="w-4 h-4" />
                            ) : (
                                <Volume2 className="w-4 h-4" />
                            )}
                        </Button>

                        <span className="text-white text-sm">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleFullscreen}
                        className="text-white hover:bg-white/20"
                    >
                        <Maximize className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

const MarkdownRenderer = ({ content }: { content: string }) => {
    return (
        <div className="prose prose-lg max-w-none dark:prose-invert">
            <ReactMarkdown
                components={{
                    code({ className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !props.node || props.node.type !== 'element';
                        
                        return !isInline && match ? (
                            <SyntaxHighlighter
                                style={oneDark as any}
                                language={match[1]}
                                PreTag="div"
                            >
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        ) : (
                            <code className="bg-muted px-1 py-0.5 rounded text-sm">
                                {children}
                            </code>
                        );
                    },
                    h1: ({ children }) => (
                        <h1 className="text-3xl font-bold mb-6 mt-8 text-foreground">{children}</h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-2xl font-semibold mb-4 mt-6 text-foreground">{children}</h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-xl font-medium mb-3 mt-5 text-foreground">{children}</h3>
                    ),
                    p: ({ children }) => (
                        <p className="mb-4 leading-7 text-foreground">{children}</p>
                    ),
                    ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
                    ),
                    li: ({ children }) => (
                        <li className="text-foreground">{children}</li>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">
                            {children}
                        </blockquote>
                    ),
                    strong: ({ children }) => (
                        <strong className="font-semibold text-foreground">{children}</strong>
                    ),
                    em: ({ children }) => (
                        <em className="italic text-foreground">{children}</em>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

const TextRenderer = ({ content }: { content: string }) => {
    return (
        <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{
                __html: content
                    .replace(/\n/g, "<br>")
                    .replace(
                        /```(\w+)?\n([\s\S]*?)```/g,
                        '<pre class="bg-muted p-4 rounded-lg overflow-x-auto"><code>$2</code></pre>',
                    )
                    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
                    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4 mt-8">$1</h1>')
                    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mb-3 mt-6">$1</h2>')
                    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium mb-2 mt-4">$1</h3>')
                    .replace(/^\*\*(.*?)\*\*/gm, "<strong>$1</strong>")
                    .replace(/^\* (.*$)/gm, '<li class="ml-4">$1</li>')
                    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4">$2</li>'),
            }}
        />
    );
};

export default function UnitViewer({ unit, onComplete, isCompleted }: UnitViewerProps) {
    const [videoProgress, setVideoProgress] = useState(0);

    const getUnitTypeIcon = () => {
        switch (unit.type) {
            case 'video':
                return <Video className="h-4 w-4" />;
            case 'markdown':
                return <FileText className="h-4 w-4" />;
            case 'text':
            default:
                return <BookOpen className="h-4 w-4" />;
        }
    };

    const getUnitTypeBadge = () => {
        switch (unit.type) {
            case 'video':
                return 'Video Lesson';
            case 'markdown':
                return 'Markdown Content';
            case 'text':
            default:
                return 'Text Lesson';
        }
    };

    const handleVideoProgress = (progress: number) => {
        setVideoProgress(progress);
        
        // Auto-mark as complete when video reaches 90%
        if (progress >= 90 && !isCompleted && onComplete) {
            onComplete();
        }
    };

    const renderContent = () => {
        if (unit.type === 'video' && unit.content) {
            // For video type, use content as the video URL
            return (
                <VideoPlayer 
                    videoUrl={unit.content} 
                    title={unit.title}
                    onProgress={handleVideoProgress}
                />
            );
        } else if (unit.type === 'video' && unit.video_url) {
            // Fallback to video_url for backward compatibility
            return (
                <VideoPlayer 
                    videoUrl={unit.video_url} 
                    title={unit.title}
                    onProgress={handleVideoProgress}
                />
            );
        } else if (unit.type === 'markdown') {
            return unit.content ? (
                <MarkdownRenderer content={unit.content} />
            ) : (
                <EmptyContent />
            );
        } else {
            // Default to text rendering for backward compatibility
            return unit.content ? (
                <TextRenderer content={unit.content} />
            ) : (
                <EmptyContent />
            );
        }
    };

    const EmptyContent = () => (
        <div className="text-center py-12 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="font-semibold mb-2">Content coming soon</h3>
            <p>This lesson content is still being prepared.</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Unit Header */}
            <div className="space-y-4">
                <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="flex items-center space-x-1">
                        {getUnitTypeIcon()}
                        <span>{getUnitTypeBadge()}</span>
                    </Badge>
                    {unit.duration && (
                        <Badge variant="outline">
                            {Math.ceil(unit.duration / 60)} min
                        </Badge>
                    )}
                </div>
                
                <div>
                    <h1 className="text-3xl font-bold mb-2">{unit.title}</h1>
                    {unit.description && (
                        <p className="text-lg text-muted-foreground">{unit.description}</p>
                    )}
                </div>
            </div>

            {/* Unit Content */}
            <Card className="border-gray-200">
                <CardContent className="p-8">
                    {renderContent()}
                </CardContent>
            </Card>

            {/* Video Progress Indicator */}
            {unit.type === 'video' && videoProgress > 0 && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <div className="w-32 bg-gray-200 rounded-full h-1">
                        <div
                            className="bg-primary h-1 rounded-full transition-all duration-300"
                            style={{ width: `${videoProgress}%` }}
                        />
                    </div>
                    <span>{Math.round(videoProgress)}% watched</span>
                </div>
            )}
        </div>
    );
} 