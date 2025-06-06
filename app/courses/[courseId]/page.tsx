import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Users, Clock, Play, BookOpen } from 'lucide-react';
import { EnrollButton } from '@/components/course-detail/enroll-button';
import { ExpandableDescription } from '@/components/course-detail/expandable-description';

async function CourseDetailContent({ courseId }: { courseId: string }) {
    const supabase = await createClient();

    // Fetch course details with creator info
    const { data: course, error: courseError } = await supabase
        .from('courses')
        .select(`
      *,
      creator:users!creator_id(name, email)
    `)
        .eq('id', courseId)
        .single();

    // Fetch sections separately if course exists
    let sections: any[] = [];
    if (course && !courseError) {
        const { data: sectionsData } = await supabase
            .from('sections')
            .select(`
        id,
        title,
        description,
        index,
        units(
          id,
          title,
          description,
          type,
          index
        )
      `)
            .eq('course_id', courseId)
            .order('index', { ascending: true });

        sections = sectionsData || [];
    }

    // Add sections to course object
    if (course) {
        (course as any).sections = sections;
    }

    if (courseError || !course) {
        console.error('Course query error:', courseError);
        console.log('Course ID:', courseId);
        console.log('Course data:', course);

        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Course Not Found</h1>
                    <p className="text-gray-600">The course you're looking for doesn't exist.</p>
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                            <h3 className="font-semibold text-red-800 mb-2">Debug Info:</h3>
                            <p className="text-sm text-red-700">Course ID: {courseId}</p>
                            <p className="text-sm text-red-700">Error: {courseError?.message || 'No course found'}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Check if user is enrolled
    const { data: { user } } = await supabase.auth.getUser();
    const { data: enrollment } = await supabase
        .from('enrolled')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user?.id || '')
        .single();

    const isEnrolled = !!enrollment;

    // Sort units within each section by index
    if (course.sections) {
        course.sections.forEach((section: any) => {
            if (section.units) {
                section.units.sort((a: any, b: any) => (a.index || 0) - (b.index || 0));
            }
        });
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2">
                    {/* Course Header */}
                    <div className="mb-8">
                        <div className="flex flex-wrap gap-2 mb-4">
                            {course.topics?.map((topic: string) => (
                                <Badge key={topic} variant="secondary">
                                    {topic}
                                </Badge>
                            ))}
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">{course.title}</h1>
                        <p className="text-lg text-gray-600 mb-6">{course.description}</p>

                        <div className="flex items-center gap-6 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span>{course.rating || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span>{course.total_enrolled || 0} students</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <BookOpen className="w-4 h-4" />
                                <span>{course.total_lessons || 0} lessons</span>
                            </div>
                        </div>
                    </div>

                    {/* Course Content */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold text-gray-900">Course Content</h2>
                        {course.sections?.length > 0 ? (
                            <div className="space-y-4">
                                {course.sections.map((section: any, sectionIndex: number) => (
                                    <Card key={section.id} className="border-gray-200">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <span className="text-sm bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center">
                                                    {sectionIndex + 1}
                                                </span>
                                                {section.title}
                                            </CardTitle>
                                            {section.description && (
                                                <ExpandableDescription description={section.description} />
                                            )}
                                        </CardHeader>
                                        <CardContent>
                                            {section.units?.length > 0 ? (
                                                <div className="space-y-2">
                                                    {section.units.map((unit: any, unitIndex: number) => (
                                                        <div key={unit.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                                                            <Play className="w-4 h-4 text-gray-400" />
                                                            <div className="flex-1">
                                                                <p className="font-medium text-sm">{unit.title}</p>
                                                                {unit.description && (
                                                                    <p className="text-xs text-gray-500 line-clamp-1">{unit.description}</p>
                                                                )}
                                                            </div>
                                                            <Badge variant="outline" className="text-xs border-gray-200">
                                                                {unit.type || 'Lesson'}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 text-sm">No units available</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="py-8">
                                    <p className="text-center text-gray-500">Course content will be available soon.</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-4 border-gray-200">
                        <CardHeader>
                            {course.thumbnail_url && (
                                <div className="w-full h-48 bg-gray-200 rounded-lg mb-4 overflow-hidden">
                                    <img
                                        src={course.thumbnail_url}
                                        alt={course.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900 mb-2">
                                    {course.price > 0 ? `${course.price} ` : 'Free'} {course.price > 0 && <span className="text-zinc-500"> credits</span>}
                                </div>
                                <EnrollButton
                                    courseId={courseId}
                                    isEnrolled={isEnrolled}
                                    price={course.price}
                                    className="w-full"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Course includes:</h3>
                                    <ul className="space-y-2 text-sm text-gray-600">
                                        <li className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4" />
                                            {course.total_lessons || 0} lessons
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            Full lifetime access
                                        </li>
                                    </ul>
                                </div>

                                {course.creator && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-2">Instructor:</h3>
                                        <p className="text-sm text-gray-600">{course.creator.name}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default async function CourseDetails({ params }: { params: Promise<{ courseId: string }> }) {
    const { courseId } = await params;

    return (
        <Suspense fallback={
            <div className="container mx-auto px-4 py-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-4">
                            <div className="h-32 bg-gray-200 rounded"></div>
                            <div className="h-32 bg-gray-200 rounded"></div>
                        </div>
                        <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        }>
            <CourseDetailContent courseId={courseId} />
        </Suspense>
    );
}