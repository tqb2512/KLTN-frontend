'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
    ArrowLeft,
    BookOpen,
    Play,
    CheckCircle,
    Lock,
    ChevronRight,
    ChevronLeft,
    Menu,
    X,
    PauseCircle,
    SkipForward,
    FileText,
    Circle,
    CheckCircle2,
    Clock
} from 'lucide-react';
import UnitViewer from '@/components/unit-viewer';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Unit {
    id: string;
    title: string;
    description: string;
    content: string;
    type: 'text' | 'video' | 'markdown';
    index: number;
}

interface Section {
    id: string;
    title: string;
    description: string;
    index: number;
    units: Unit[];
}

interface Course {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    sections: Section[];
    total_lessons: number;
}

interface CourseProgress {
    completed_units: string[];
    current_unit_id: string | null;
}

export default function LearnPage({ params }: { params: Promise<{ courseId: string }> }) {
    const { courseId } = use(params);
    const [course, setCourse] = useState<Course | null>(null);
    const [currentUnit, setCurrentUnit] = useState<Unit | null>(null);
    const [progress, setProgress] = useState<CourseProgress>({ completed_units: [], current_unit_id: null });
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isEnrolled, setIsEnrolled] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        fetchCourseData();
    }, [courseId]);

    const fetchCourseData = async () => {
        try {
            setLoading(true);

            // Check authentication
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/sign-in');
                return;
            }

            // Check enrollment
            const { data: enrollment } = await supabase
                .from('enrolled')
                .select('*')
                .eq('course_id', courseId)
                .eq('user_id', user.id)
                .single();

            if (!enrollment) {
                router.push(`/courses/${courseId}`);
                return;
            }

            setIsEnrolled(true);

            // Fetch course with sections and units
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select(`
          id,
          title,
          description,
          thumbnail_url,
          total_lessons,
          sections (
            id,
            title,
            description,
            index,
            units (
              id,
              title,
              description,
              content,
              type,
              index
            )
          )
        `)
                .eq('id', courseId)
                .single();

            if (courseError || !courseData) {
                toast.error('Course not found');
                router.push('/courses');
                return;
            }

            // Sort sections and units by index
            courseData.sections.sort((a, b) => (a.index || 0) - (b.index || 0));
            courseData.sections.forEach(section => {
                section.units.sort((a, b) => (a.index || 0) - (b.index || 0));
            });

            setCourse(courseData as Course);

            // Set first unit as current if no unit is specified
            if (courseData.sections.length > 0 && courseData.sections[0].units.length > 0) {
                setCurrentUnit(courseData.sections[0].units[0]);
            }

            // Fetch user progress from database
            const { data: progressData, error: progressError } = await supabase
                .from('user_progress')
                .select('unit_id')
                .eq('user_id', user.id);

            if (!progressError && progressData) {
                const completedUnits = progressData.map(p => p.unit_id);
                setProgress({
                    completed_units: completedUnits,
                    current_unit_id: null
                });
            }

        } catch (error) {
            console.error('Error fetching course data:', error);
            toast.error('Error loading course');
        } finally {
            setLoading(false);
        }
    };

    const markUnitAsCompleted = async (unitId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('user_progress')
                .upsert(
                    { user_id: user.id, unit_id: unitId },
                    { onConflict: 'user_id,unit_id' }
                );

            if (!error) {
                // Database update successful, also update local state
                const newProgress = {
                    ...progress,
                    completed_units: [...progress.completed_units.filter(id => id !== unitId), unitId]
                };
                setProgress(newProgress);
                toast.success('Unit marked as completed!');
            } else {
                toast.error('Failed to mark unit as completed');
            }
        } catch (error) {
            console.error('Error marking unit as completed:', error);
            toast.error('Failed to mark unit as completed');
        }
    };

    const unmarkUnitAsCompleted = async (unitId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('user_progress')
                .delete()
                .eq('user_id', user.id)
                .eq('unit_id', unitId);

            if (!error) {
                // Database update successful, also update local state
                const newProgress = {
                    ...progress,
                    completed_units: progress.completed_units.filter(id => id !== unitId)
                };
                setProgress(newProgress);
                toast.success('Unit unmarked as completed!');
            } else {
                toast.error('Failed to unmark unit as completed');
            }
        } catch (error) {
            console.error('Error unmarking unit as completed:', error);
            toast.error('Failed to unmark unit as completed');
        }
    };

    const navigateToUnit = (unit: Unit) => {
        setCurrentUnit(unit);
        setProgress(prev => ({ ...prev, current_unit_id: unit.id }));
    };

    const getNextUnit = () => {
        if (!course || !currentUnit) return null;

        let foundCurrent = false;
        for (const section of course.sections) {
            for (const unit of section.units) {
                if (foundCurrent) return unit;
                if (unit.id === currentUnit.id) foundCurrent = true;
            }
        }
        return null;
    };

    const getPreviousUnit = () => {
        if (!course || !currentUnit) return null;

        let previousUnit = null;
        for (const section of course.sections) {
            for (const unit of section.units) {
                if (unit.id === currentUnit.id) return previousUnit;
                previousUnit = unit;
            }
        }
        return null;
    };

    const navigateToNextUnit = () => {
        const nextUnit = getNextUnit();
        if (nextUnit) {
            navigateToUnit(nextUnit);
        }
    };

    const navigateToPreviousUnit = () => {
        const previousUnit = getPreviousUnit();
        if (previousUnit) {
            navigateToUnit(previousUnit);
        }
    };

    const calculateProgress = () => {
        if (!course) return 0;
        const totalUnits = course.sections.reduce((total, section) => total + section.units.length, 0);
        return totalUnits > 0 ? (progress.completed_units.length / totalUnits) * 100 : 0;
    };

    // Helper functions and variables for the new structure
    const getAllUnits = () => {
        if (!course) return [];
        return course.sections.flatMap(section =>
            section.units.map(unit => ({
                ...unit,
                sectionTitle: section.title
            }))
        );
    };

    const allUnits = getAllUnits();
    const currentUnitIndex = currentUnit ? allUnits.findIndex(unit => unit.id === currentUnit.id) : -1;
    const completedUnits = progress.completed_units;

    const toggleUnitCompletion = (unitId: string) => {
        const isCompleted = progress.completed_units.includes(unitId);
        if (isCompleted) {
            unmarkUnitAsCompleted(unitId);
        } else {
            markUnitAsCompleted(unitId);
        }
    };

    const goToPreviousUnit = () => {
        navigateToPreviousUnit();
    };

    const goToNextUnit = () => {
        navigateToNextUnit();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Course Not Found</h1>
                    <Link href="/courses">
                        <Button>Back to Courses</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40 h-16 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                        </Button>

                        <Link href={`/courses/${course.id}`}>
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Course
                            </Button>
                        </Link>

                        <div className="hidden md:block">
                            <h1 className="text-lg font-semibold text-gray-900 line-clamp-1">{course.title}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2">
                            <span className="text-sm text-gray-600">Progress:</span>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${calculateProgress()}%` }}
                                ></div>
                            </div>
                            <span className="text-sm text-gray-600">{Math.round(calculateProgress())}%</span>
                        </div>

                        <Badge variant="secondary">
                            {progress.completed_units.length} / {course.sections.reduce((total, section) => total + section.units.length, 0)} completed
                        </Badge>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                {sidebarOpen && (
                    <div className="w-80 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 flex flex-col fixed lg:relative z-30 transition-all duration-300 ease-in-out">
                        <div className="p-4 border-b border-gray-200">
                            <h2 className="font-semibold text-gray-900">Course Content</h2>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-4">
                                {course.sections.map((section, sectionIndex) => (
                                    <div key={section.id} className="space-y-2">
                                        <h3 className="font-medium text-sm text-muted-foreground">
                                            {section.index}. {section.title}
                                        </h3>

                                        <div className="space-y-1 ml-2">
                                            {section.units.map((unit, unitIndex) => {
                                                const isCompleted = progress.completed_units.includes(unit.id);
                                                const isCurrent = currentUnit?.id === unit.id;

                                                return (
                                                    <button
                                                        key={unit.id}
                                                        onClick={() => navigateToUnit(unit)}
                                                        className={`w-full text-left p-3 rounded-lg transition-colors ${isCurrent ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                                            }`}
                                                    >
                                                        <div className="flex items-start space-x-3">
                                                            <div className="flex-shrink-0 mt-0.5">
                                                                {isCompleted ? (
                                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                                ) : (
                                                                    <Circle className="h-4 w-4 text-muted-foreground" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center space-x-2">
                                                                    {unit.type === "text" || unit.type === "markdown" ? (
                                                                        <FileText className="h-4 w-4 flex-shrink-0" />
                                                                    ) : (
                                                                        <Play className="h-4 w-4 flex-shrink-0" />
                                                                    )}
                                                                    <span className="font-medium text-sm truncate">{unit.title}</span>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{unit.description}</p>
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}

                {/* Overlay for mobile */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    ></div>
                )}

                {/* Main Content */}
                <main className="flex-1 h-[calc(100vh-73px)] overflow-y-auto">
                    {currentUnit ? (
                        <div className="max-w-6xl mx-auto p-8">
                            {/* Breadcrumb */}
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
                                <span>{allUnits[currentUnitIndex]?.sectionTitle}</span>
                                <span>•</span>
                                <span>Lesson {currentUnitIndex + 1}</span>
                            </div>

                            {/* Unit Viewer Component */}
                            <UnitViewer 
                                unit={currentUnit}
                                isCompleted={completedUnits.includes(currentUnit.id)}
                                onComplete={() => markUnitAsCompleted(currentUnit.id)}
                            />

                            {/* Completion Toggle Button */}
                            <div className="flex justify-center mb-8 mt-4">
                                <Button
                                    variant={completedUnits.includes(currentUnit.id) ? "default" : "outline"}
                                    onClick={() => toggleUnitCompletion(currentUnit.id)}
                                    className="flex items-center space-x-2 border-zinc-200"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>{completedUnits.includes(currentUnit.id) ? "Mark Incomplete" : "Mark Complete"}</span>
                                </Button>
                            </div>

                            {/* Navigation */}
                            <div className="flex justify-between items-center">
                                <Button
                                    variant="outline"
                                    onClick={goToPreviousUnit}
                                    disabled={currentUnitIndex === 0}
                                    className="flex items-center space-x-2 border-zinc-200"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    <span>Previous</span>
                                </Button>

                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">
                                        Lesson {currentUnitIndex + 1} of {allUnits.length}
                                    </p>
                                    <Progress value={allUnits.length > 0 ? ((currentUnitIndex + 1) / allUnits.length) * 100 : 0} className="w-32 mt-2" />
                                </div>

                                <Button
                                    onClick={goToNextUnit}
                                    disabled={currentUnitIndex === allUnits.length - 1}
                                    className="flex items-center space-x-2"
                                >
                                    <span>Next</span>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to your course!</h2>
                                <p className="text-gray-600 mb-6">Select a lesson from the sidebar to start learning.</p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}