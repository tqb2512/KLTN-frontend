"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { getCurrentUser } from "@/utils/local_user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Plus, 
    Trash2, 
    Edit, 
    Save, 
    Eye, 
    Upload,
    ArrowLeft,
    ArrowUp,
    ArrowDown,
    BookOpen,
    Play,
    FileText,
    X,
    ImageIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import CoursesNavbar from "@/components/courses-navbar";
import { MDXEditorMethods } from "@mdxeditor/editor";
import dynamic from "next/dynamic";

const MarkdownEditor = dynamic(() => import("@/components/markdown/initialize-mdxeditor"), { ssr: false });

interface Unit {
    id?: string;
    title: string;
    description: string;
    content: string;
    type: 'video' | 'text' | 'quiz';
    index: number;
}

interface Section {
    id?: string;
    title: string;
    description: string;
    index: number;
    units: Unit[];
}

interface CourseData {
    id?: string;
    title: string;
    description: string;
    price: number;
    thumbnail_url: string;
    topics: string[];
    sections: Section[];
}

export default function CourseBuilder() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const isEditing = !!courseId;
    
    const [activeTab, setActiveTab] = useState("details");
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditing);
    const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
    const [courseData, setCourseData] = useState<CourseData>({
        title: "",
        description: "",
        price: 0,
        thumbnail_url: "",
        topics: [],
        sections: []
    });
    const [newTopic, setNewTopic] = useState("");
    const [uploadingVideo, setUploadingVideo] = useState<{[key: string]: boolean}>({});
    
    // Store editor instances in a Map using sectionIndex-unitIndex as key
    const editorRefs = useRef<Map<string, MDXEditorMethods | null>>(new Map());
    
    // Helper function to create callback ref
    const createEditorRef = (sectionIndex: number, unitIndex: number) => {
        const key = `${sectionIndex}-${unitIndex}`;
        return (editor: MDXEditorMethods | null) => {
            if (editor) {
                editorRefs.current.set(key, editor);
            } else {
                editorRefs.current.delete(key);
            }
        };
    };

    // Load existing course data when editing
    useEffect(() => {
        if (isEditing && courseId) {
            loadCourseData(courseId);
        }
    }, [courseId, isEditing]);

    const loadCourseData = async (courseId: string) => {
        setInitialLoading(true);
        try {
            const supabase = createClient();
            
            // Load course data
            const { data: course, error: courseError } = await supabase
                .from("courses")
                .select("*")
                .eq("id", courseId)
                .single();

            if (courseError) {
                console.error("Error loading course:", courseError);
                alert("Failed to load course data. Please try again.");
                router.push("/courses/creator-dashboard");
                return;
            }

            // Load sections with units
            const { data: sections, error: sectionsError } = await supabase
                .from("sections")
                .select(`
                    *,
                    units (*)
                `)
                .eq("course_id", courseId)
                .order("index", { ascending: true });

            if (sectionsError) {
                console.error("Error loading sections:", sectionsError);
            }

            // Process sections and units
            const processedSections: Section[] = (sections || []).map(section => ({
                id: section.id,
                title: section.title,
                description: section.description,
                index: section.index,
                units: (section.units || [])
                    .sort((a: any, b: any) => a.index - b.index)
                    .map((unit: any) => ({
                        id: unit.id,
                        title: unit.title,
                        description: unit.description,
                        content: unit.content,
                        type: unit.type,
                        index: unit.index
                    }))
            }));

            setCourseData({
                id: course.id,
                title: course.title,
                description: course.description,
                price: course.price,
                thumbnail_url: course.thumbnail_url || "",
                topics: course.topics || [],
                sections: processedSections
            });

        } catch (error) {
            console.error("Error in loadCourseData:", error);
            alert("Failed to load course data. Please try again.");
            router.push("/courses/creator-dashboard");
        } finally {
            setInitialLoading(false);
        }
    };

    const uploadThumbnail = async (file: File) => {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        setUploadingThumbnail(true);
        try {
            const user = await getCurrentUser();
            if (!user) {
                alert("You must be logged in to upload files");
                return;
            }

            const supabase = createClient();
            
            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            // Upload file to Supabase storage
            const { data, error } = await supabase.storage
                .from('courses')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Upload error:', error);
                alert('Failed to upload thumbnail. Please try again.');
                return;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('courses')
                .getPublicUrl(fileName);

            // Update course data with new thumbnail URL
            setCourseData(prev => ({
                ...prev,
                thumbnail_url: publicUrl
            }));

        } catch (error) {
            console.error('Error uploading thumbnail:', error);
            alert('Failed to upload thumbnail. Please try again.');
        } finally {
            setUploadingThumbnail(false);
        }
    };

    const uploadVideo = async (file: File, sectionIndex: number, unitIndex: number) => {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('video/')) {
            alert('Please select a video file');
            return;
        }

        // Validate file size (max 100MB)
        if (file.size > 100 * 1024 * 1024) {
            alert('File size must be less than 100MB');
            return;
        }

        const uploadKey = `${sectionIndex}-${unitIndex}`;
        setUploadingVideo(prev => ({ ...prev, [uploadKey]: true }));
        
        try {
            const user = await getCurrentUser();
            if (!user) {
                alert("You must be logged in to upload files");
                return;
            }

            const supabase = createClient();
            
            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `videos/${user.id}/${Date.now()}.${fileExt}`;

            // Upload file to Supabase storage
            const { data, error } = await supabase.storage
                .from('courses')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Upload error:', error);
                alert('Failed to upload video. Please try again.');
                return;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('courses')
                .getPublicUrl(fileName);

            // Update unit content with video URL
            updateUnit(sectionIndex, unitIndex, { content: publicUrl });

        } catch (error) {
            console.error('Error uploading video:', error);
            alert('Failed to upload video. Please try again.');
        } finally {
            setUploadingVideo(prev => ({ ...prev, [uploadKey]: false }));
        }
    };

    const handleThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            uploadThumbnail(file);
        }
    };

    const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>, sectionIndex: number, unitIndex: number) => {
        const file = event.target.files?.[0];
        if (file) {
            uploadVideo(file, sectionIndex, unitIndex);
        }
    };

    const addTopic = () => {
        if (newTopic.trim() && !courseData.topics.includes(newTopic.trim())) {
            setCourseData(prev => ({
                ...prev,
                topics: [...prev.topics, newTopic.trim()]
            }));
            setNewTopic("");
        }
    };

    const removeTopic = (topicToRemove: string) => {
        setCourseData(prev => ({
            ...prev,
            topics: prev.topics.filter(topic => topic !== topicToRemove)
        }));
    };

    const addSection = () => {
        const newSection: Section = {
            title: "New Section",
            description: "",
            index: courseData.sections.length,
            units: []
        };
        setCourseData(prev => ({
            ...prev,
            sections: [...prev.sections, newSection]
        }));
    };

    const updateSection = (sectionIndex: number, updates: Partial<Section>) => {
        setCourseData(prev => ({
            ...prev,
            sections: prev.sections.map((section, index) => 
                index === sectionIndex ? { ...section, ...updates } : section
            )
        }));
    };

    const deleteSection = (sectionIndex: number) => {
        setCourseData(prev => ({
            ...prev,
            sections: prev.sections.filter((_, index) => index !== sectionIndex)
                .map((section, index) => ({ ...section, index }))
        }));
    };

    const moveSectionUp = (sectionIndex: number) => {
        if (sectionIndex > 0) {
            setCourseData(prev => {
                const newSections = [...prev.sections];
                [newSections[sectionIndex], newSections[sectionIndex - 1]] = 
                [newSections[sectionIndex - 1], newSections[sectionIndex]];
                return {
                    ...prev,
                    sections: newSections.map((section, index) => ({ ...section, index }))
                };
            });
        }
    };

    const moveSectionDown = (sectionIndex: number) => {
        if (sectionIndex < courseData.sections.length - 1) {
            setCourseData(prev => {
                const newSections = [...prev.sections];
                [newSections[sectionIndex], newSections[sectionIndex + 1]] = 
                [newSections[sectionIndex + 1], newSections[sectionIndex]];
                return {
                    ...prev,
                    sections: newSections.map((section, index) => ({ ...section, index }))
                };
            });
        }
    };

    const addUnit = (sectionIndex: number) => {
        const newUnit: Unit = {
            title: "New Unit",
            description: "",
            content: "",
            type: "text",
            index: courseData.sections[sectionIndex].units.length
        };
        updateSection(sectionIndex, {
            units: [...courseData.sections[sectionIndex].units, newUnit]
        });
    };

    const handleUnitContentChange = (sectionIndex: number, unitIndex: number, content: string) => {
        updateUnit(sectionIndex, unitIndex, { content });
    };

    const updateUnit = (sectionIndex: number, unitIndex: number, updates: Partial<Unit>) => {
        const section = courseData.sections[sectionIndex];
        const updatedUnits = section.units.map((unit, index) => 
            index === unitIndex ? { ...unit, ...updates } : unit
        );
        updateSection(sectionIndex, { units: updatedUnits });
    };

    const deleteUnit = (sectionIndex: number, unitIndex: number) => {
        const section = courseData.sections[sectionIndex];
        const updatedUnits = section.units.filter((_, index) => index !== unitIndex)
            .map((unit, index) => ({ ...unit, index }));
        updateSection(sectionIndex, { units: updatedUnits });
    };

    const moveUnitUp = (sectionIndex: number, unitIndex: number) => {
        if (unitIndex > 0) {
            const section = courseData.sections[sectionIndex];
            const newUnits = [...section.units];
            [newUnits[unitIndex], newUnits[unitIndex - 1]] = 
            [newUnits[unitIndex - 1], newUnits[unitIndex]];
            updateSection(sectionIndex, { 
                units: newUnits.map((unit, index) => ({ ...unit, index }))
            });
        }
    };

    const moveUnitDown = (sectionIndex: number, unitIndex: number) => {
        const section = courseData.sections[sectionIndex];
        if (unitIndex < section.units.length - 1) {
            const newUnits = [...section.units];
            [newUnits[unitIndex], newUnits[unitIndex + 1]] = 
            [newUnits[unitIndex + 1], newUnits[unitIndex]];
            updateSection(sectionIndex, { 
                units: newUnits.map((unit, index) => ({ ...unit, index }))
            });
        }
    };

    const saveCourse = async () => {
        setLoading(true);
        try {
            const user = await getCurrentUser();
            if (!user) {
                alert("You must be logged in to save a course");
                return;
            }

            const supabase = createClient();
            
            // Calculate total lessons
            const totalLessons = courseData.sections.reduce((total, section) => 
                total + section.units.length, 0
            );

            let course;
            
            if (isEditing && courseId) {
                // Update existing course
                const { data: updatedCourse, error: courseError } = await supabase
                    .from("courses")
                    .update({
                        title: courseData.title,
                        description: courseData.description,
                        price: courseData.price,
                        thumbnail_url: courseData.thumbnail_url,
                        topics: courseData.topics,
                        total_lessons: totalLessons
                    })
                    .eq("id", courseId)
                    .select()
                    .single();

                if (courseError) {
                    console.error("Error updating course:", courseError);
                    alert("Failed to update course. Please try again.");
                    return;
                }
                course = updatedCourse;

                // Delete existing sections and units
                await supabase.from("units").delete().in(
                    "section_id", 
                    courseData.sections.filter(s => s.id).map(s => s.id!)
                );
                await supabase.from("sections").delete().eq("course_id", courseId);
            } else {
                // Create new course
                const { data: newCourse, error: courseError } = await supabase
                    .from("courses")
                    .insert({
                        creator_id: user.id,
                        title: courseData.title,
                        description: courseData.description,
                        price: courseData.price,
                        thumbnail_url: courseData.thumbnail_url,
                        topics: courseData.topics,
                        total_lessons: totalLessons
                    })
                    .select()
                    .single();

                if (courseError) {
                    console.error("Error creating course:", courseError);
                    alert("Failed to create course. Please try again.");
                    return;
                }
                course = newCourse;
            }

            // Save sections and units
            for (const section of courseData.sections) {
                const { data: savedSection, error: sectionError } = await supabase
                    .from("sections")
                    .insert({
                        course_id: course.id,
                        title: section.title,
                        description: section.description,
                        index: section.index
                    })
                    .select()
                    .single();

                if (sectionError) {
                    console.error("Error saving section:", sectionError);
                    continue;
                }

                // Save units for this section
                for (const unit of section.units) {
                    const { error: unitError } = await supabase
                        .from("units")
                        .insert({
                            section_id: savedSection.id,
                            title: unit.title,
                            description: unit.description,
                            content: unit.content,
                            type: unit.type,
                            index: unit.index
                        });

                    if (unitError) {
                        console.error("Error saving unit:", unitError);
                    }
                }
            }

            alert(isEditing ? "Course updated successfully!" : "Course created successfully!");
            router.push("/courses/creator-dashboard");
        } catch (error) {
            console.error("Error in saveCourse:", error);
            alert("Failed to save course. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const getUnitIcon = (type: string) => {
        switch (type) {
            case 'video': return <Play className="w-4 h-4" />;
            case 'quiz': return <BookOpen className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    return (
        <div className="min-h-screen">
            <style jsx global>{`
                .course-builder-editor .mdxeditor {
                    border: none !important;
                }
                .course-builder-editor .mdxeditor-toolbar {
                    border-bottom: 1px solid #e5e7eb !important;
                    padding: 8px 12px !important;
                    background-color: #f9fafb !important;
                }
                .course-builder-editor .mdxeditor-editor {
                    padding: 12px !important;
                    min-height: 250px !important;
                }
            `}</style>
            <CoursesNavbar />

            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isEditing ? "Edit Course" : "Course Builder"}
                        </h1>
                        {isEditing && (
                            <p className="text-gray-600 mt-1">
                                Make changes to your existing course
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/courses/creator-dashboard">
                            <Button variant="outline">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Dashboard
                            </Button>
                        </Link>
                        <Button 
                            onClick={saveCourse} 
                            disabled={loading || !courseData.title.trim()}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? "Saving..." : (isEditing ? "Update Course" : "Save Course")}
                        </Button>
                    </div>
                </div>
                
                {/* Loading state for editing */}
                {initialLoading ? (
                    <div className="space-y-6">
                        <div className="animate-pulse space-y-4">
                            <div className="h-8 bg-gray-200 rounded w-64"></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                                    <div className="h-10 bg-gray-200 rounded"></div>
                                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                                    <div className="h-10 bg-gray-200 rounded"></div>
                                </div>
                                <div className="space-y-4">
                                    <div className="h-4 bg-gray-200 rounded w-28"></div>
                                    <div className="h-32 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="details">Course Details</TabsTrigger>
                        <TabsTrigger value="content">Course Content</TabsTrigger>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>

                    {/* Course Details Tab */}
                    <TabsContent value="details">
                        <Card className="border-zinc-200">
                            <CardHeader>
                                <CardTitle>Basic Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="title">Course Title *</Label>
                                            <Input
                                                id="title"
                                                value={courseData.title}
                                                onChange={(e) => setCourseData(prev => ({
                                                    ...prev,
                                                    title: e.target.value
                                                }))}
                                                placeholder="Enter course title"
                                                className="mt-1"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="price">Price (Credits) *</Label>
                                            <Input
                                                id="price"
                                                type="number"
                                                min="0"
                                                value={courseData.price}
                                                onChange={(e) => setCourseData(prev => ({
                                                    ...prev,
                                                    price: Number(e.target.value)
                                                }))}
                                                placeholder="0"
                                                className="mt-1"
                                            />
                                        </div>

                                        <div>
                                            <Label>Course Thumbnail</Label>
                                            <div className="space-y-3 mt-1">
                                                {/* File Upload */}
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleThumbnailUpload}
                                                        disabled={uploadingThumbnail}
                                                        className="hidden"
                                                        id="thumbnail-upload"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => document.getElementById('thumbnail-upload')?.click()}
                                                        disabled={uploadingThumbnail}
                                                        className="flex items-center gap-2 border-zinc-200"
                                                    >
                                                        <Upload className="w-4 h-4" />
                                                        {uploadingThumbnail ? 'Uploading...' : 'Upload Image'}
                                                    </Button>
                                                </div>

                                                {/* Thumbnail Preview */}
                                                {courseData.thumbnail_url && (
                                                    <div className="mt-3">
                                                        <Label className="text-sm text-gray-600">Preview:</Label>
                                                        <div className="mt-1 relative">
                                                            <img
                                                                src={courseData.thumbnail_url}
                                                                alt="Course thumbnail"
                                                                className="w-full max-w-xs h-32 object-cover rounded-lg border border-gray-200"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                }}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                className="absolute top-1 right-1"
                                                                onClick={() => setCourseData(prev => ({
                                                                    ...prev,
                                                                    thumbnail_url: ""
                                                                }))}
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="description">Description *</Label>
                                            <Textarea
                                                id="description"
                                                value={courseData.description}
                                                onChange={(e) => setCourseData(prev => ({
                                                    ...prev,
                                                    description: e.target.value
                                                }))}
                                                placeholder="Describe what students will learn"
                                                rows={6}
                                                className="mt-1"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <Label>Topics</Label>
                                            <div className="flex gap-2 mt-2">
                                                <Input
                                                    value={newTopic}
                                                    onChange={(e) => setNewTopic(e.target.value)}
                                                    placeholder="Add a topic"
                                                    onKeyPress={(e) => e.key === 'Enter' && addTopic()}
                                                />
                                                <Button onClick={addTopic} variant="outline">
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {courseData.topics.map((topic, index) => (
                                                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                                        {topic}
                                                        <button
                                                            onClick={() => removeTopic(topic)}
                                                            className="ml-1 hover:text-red-500"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Course Content Tab */}
                    <TabsContent value="content">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold">Course Structure</h2>
                                <Button onClick={addSection} variant="outline" className="border-zinc-200">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Section
                                </Button>
                            </div>

                            {courseData.sections.length === 0 ? (
                                <Card className="border-zinc-200">
                                    <CardContent className="text-center py-12">
                                        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No sections yet</h3>
                                        <p className="text-gray-600 mb-4">Start by adding your first section</p>
                                        <Button onClick={addSection} className="border-zinc-200">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add First Section
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-4">
                                    {courseData.sections.map((section, sectionIndex) => (
                                        <Card key={sectionIndex} className="border-zinc-200">
                                            <CardHeader>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1 space-y-2">
                                                        <Input
                                                            value={section.title}
                                                            onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
                                                            className="text-lg font-semibold"
                                                            placeholder="Section title"
                                                        />
                                                        <Textarea
                                                            value={section.description}
                                                            onChange={(e) => updateSection(sectionIndex, { description: e.target.value })}
                                                            placeholder="Section description (optional)"
                                                            rows={2}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-4">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => moveSectionUp(sectionIndex)}
                                                            disabled={sectionIndex === 0}
                                                        >
                                                            <ArrowUp className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => moveSectionDown(sectionIndex)}
                                                            disabled={sectionIndex === courseData.sections.length - 1}
                                                        >
                                                            <ArrowDown className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => deleteSection(sectionIndex)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-medium">Units ({section.units.length})</h4>
                                                        <Button
                                                            variant="outline"
                                                            className="border-zinc-200"
                                                            size="sm"
                                                            onClick={() => addUnit(sectionIndex)}
                                                        >
                                                            <Plus className="w-4 h-4 mr-2" />
                                                            Add Unit
                                                        </Button>
                                                    </div>

                                                    {section.units.length === 0 ? (
                                                        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                                                            <p className="text-gray-500 mb-2">No units in this section</p>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => addUnit(sectionIndex)}
                                                                className="border-zinc-200"
                                                            >
                                                                <Plus className="w-4 h-4 mr-2" />
                                                                Add First Unit
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {section.units.map((unit, unitIndex) => (
                                                                <div key={unitIndex} className="border border-gray-200 rounded-lg p-4">
                                                                    <div className="flex items-start gap-4">
                                                                        <div className="flex-1 space-y-3">
                                                                            <div className="flex items-center gap-3">
                                                                                <select
                                                                                    value={unit.type}
                                                                                    onChange={(e) => updateUnit(sectionIndex, unitIndex, { 
                                                                                        type: e.target.value as 'video' | 'text' | 'quiz' 
                                                                                    })}
                                                                                    className="px-3 py-1 border border-gray-200 rounded-md text-sm"
                                                                                >
                                                                                    <option value="text">Text</option>
                                                                                    <option value="video">Video</option>
                                                                                    <option value="quiz">Quiz</option>
                                                                                </select>
                                                                                <Input
                                                                                    value={unit.title}
                                                                                    onChange={(e) => updateUnit(sectionIndex, unitIndex, { title: e.target.value })}
                                                                                    placeholder="Unit title"
                                                                                    className="flex-1"
                                                                                />
                                                                            </div>
                                                                            <Textarea
                                                                                value={unit.description}
                                                                                onChange={(e) => updateUnit(sectionIndex, unitIndex, { description: e.target.value })}
                                                                                placeholder="Unit description"
                                                                                rows={2}
                                                                            />
                                                                                                                                        {unit.type === 'text' ? (
                                                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                                    <div className="p-2 bg-gray-50 border-b border-gray-200">
                                                                        <Label className="text-xs text-gray-600 font-medium">
                                                                            Markdown Content
                                                                        </Label>
                                                                    </div>
                                                                    <div className="min-h-[300px] prose-sm course-builder-editor">
                                                                        <MarkdownEditor
                                                                            editorRef={createEditorRef(sectionIndex, unitIndex)}
                                                                            markdown={unit.content || ""}
                                                                            onChange={(value) => handleUnitContentChange(sectionIndex, unitIndex, value || "")}
                                                                            placeholder="Enter your lesson content using Markdown..."
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ) : unit.type === 'video' ? (
                                                                <div className="space-y-4">
                                                                    <div>
                                                                        <Label className="text-sm font-medium mb-2 block">Video Content</Label>
                                                                        
                                                                        {/* Video Upload */}
                                                                        <div className="flex items-center gap-2 mb-3">
                                                                            <Input
                                                                                type="file"
                                                                                accept="video/*"
                                                                                onChange={(e) => handleVideoUpload(e, sectionIndex, unitIndex)}
                                                                                disabled={uploadingVideo[`${sectionIndex}-${unitIndex}`]}
                                                                                className="hidden"
                                                                                id={`video-upload-${sectionIndex}-${unitIndex}`}
                                                                            />
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                onClick={() => document.getElementById(`video-upload-${sectionIndex}-${unitIndex}`)?.click()}
                                                                                disabled={uploadingVideo[`${sectionIndex}-${unitIndex}`]}
                                                                                className="flex items-center gap-2 border-zinc-200"
                                                                            >
                                                                                <Upload className="w-4 h-4" />
                                                                                {uploadingVideo[`${sectionIndex}-${unitIndex}`] ? 'Uploading...' : 'Upload Video'}
                                                                            </Button>
                                                                        </div>

                                                                        {/* Video Preview or URL Input */}
                                                                        {unit.content && unit.content.includes('http') ? (
                                                                            <div className="space-y-3">
                                                                                <Label className="text-sm text-gray-600">Video Preview:</Label>
                                                                                <div className="relative">
                                                                                    <video
                                                                                        src={unit.content}
                                                                                        controls
                                                                                        className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200"
                                                                                        onError={(e) => {
                                                                                            e.currentTarget.style.display = 'none';
                                                                                        }}
                                                                                    />
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="destructive"
                                                                                        size="sm"
                                                                                        className="absolute top-1 right-1"
                                                                                        onClick={() => updateUnit(sectionIndex, unitIndex, { content: "" })}
                                                                                    >
                                                                                        <X className="w-3 h-3" />
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="space-y-2">
                                                                                <Label className="text-sm text-gray-600">Or enter video URL:</Label>
                                                                                <Textarea
                                                                                    value={unit.content}
                                                                                    onChange={(e) => updateUnit(sectionIndex, unitIndex, { content: e.target.value })}
                                                                                    placeholder="Video URL or embed code"
                                                                                    rows={3}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <Textarea
                                                                    value={unit.content}
                                                                    onChange={(e) => updateUnit(sectionIndex, unitIndex, { content: e.target.value })}
                                                                    placeholder={
                                                                        unit.type === 'quiz'
                                                                            ? "Quiz data (JSON format)"
                                                                            : "Unit content"
                                                                    }
                                                                    rows={3}
                                                                />
                                                            )}
                                                                        </div>
                                                                        <div className="flex flex-col gap-1">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={() => moveUnitUp(sectionIndex, unitIndex)}
                                                                                disabled={unitIndex === 0}
                                                                            >
                                                                                <ArrowUp className="w-4 h-4" />
                                                                            </Button>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={() => moveUnitDown(sectionIndex, unitIndex)}
                                                                                disabled={unitIndex === section.units.length - 1}
                                                                            >
                                                                                <ArrowDown className="w-4 h-4" />
                                                                            </Button>
                                                                            <Button
                                                                                variant="destructive"
                                                                                size="sm"
                                                                                onClick={() => deleteUnit(sectionIndex, unitIndex)}
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* Preview Tab */}
                    <TabsContent value="preview">
                        <Card className="border-zinc-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Eye className="w-5 h-5" />
                                    Course Preview
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {/* Course Header */}
                                    <div className="border-b border-gray-200 pb-6">
                                        <div className="flex gap-2 mb-3">
                                            {courseData.topics.map((topic, index) => (
                                                <Badge key={index} variant="secondary">{topic}</Badge>
                                            ))}
                                        </div>
                                        <h1 className="text-3xl font-bold text-gray-900 mb-3">
                                            {courseData.title || "Course Title"}
                                        </h1>
                                        <p className="text-lg text-gray-600 mb-4">
                                            {courseData.description || "Course description will appear here"}
                                        </p>
                                        <div className="flex items-center gap-6 text-sm text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <BookOpen className="w-4 h-4" />
                                                <span>
                                                    {courseData.sections.reduce((total, section) => total + section.units.length, 0)} lessons
                                                </span>
                                            </div>
                                            <div className="text-2xl font-bold text-gray-900">
                                                {courseData.price > 0 ? `${courseData.price} Credits` : 'Free'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Course Content Preview */}
                                    <div>
                                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Course Content</h2>
                                        {courseData.sections.length === 0 ? (
                                            <p className="text-gray-500 text-center py-8">
                                                No course content yet. Add sections and units to see the preview.
                                            </p>
                                        ) : (
                                            <div className="space-y-4">
                                                {courseData.sections.map((section, sectionIndex) => (
                                                    <Card key={sectionIndex} className="border-gray-200">
                                                        <CardHeader>
                                                            <CardTitle className="flex items-center gap-2">
                                                                <span className="text-sm bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center">
                                                                    {sectionIndex + 1}
                                                                </span>
                                                                {section.title || `Section ${sectionIndex + 1}`}
                                                            </CardTitle>
                                                            {section.description && (
                                                                <p className="text-gray-600">{section.description}</p>
                                                            )}
                                                        </CardHeader>
                                                        <CardContent>
                                                            <div className="space-y-2">
                                                                {section.units.length === 0 ? (
                                                                    <p className="text-gray-500 text-sm">No units in this section</p>
                                                                ) : (
                                                                    section.units.map((unit, unitIndex) => (
                                                                        <div key={unitIndex} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                                                                            {getUnitIcon(unit.type)}
                                                                            <div className="flex-1">
                                                                                <h4 className="font-medium">{unit.title || `Unit ${unitIndex + 1}`}</h4>
                                                                                {unit.description && (
                                                                                    <p className="text-sm text-gray-600">{unit.description}</p>
                                                                                )}
                                                                            </div>
                                                                            <Badge variant="outline" className="text-xs">
                                                                                {unit.type}
                                                                            </Badge>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                )}
            </div>
        </div>
    );
}
