"use client";
import { createClient } from "@/utils/supabase/client";
import CourseCard, { CourseCardProps } from "@/components/course-card";
import { useEffect, useState } from "react";
import CoursesNavbar from "@/components/courses-navbar";
import { getCurrentUser } from "@/utils/local_user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { 
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Plus, 
    BookOpen, 
    Users, 
    DollarSign, 
    Edit, 
    Trash2, 
    Eye,
    TrendingUp,
    Wallet
} from "lucide-react";
import Link from "next/link";

interface CreatorStats {
    totalCourses: number;
    totalStudents: number;
    totalRevenue: number;
    averageRating: number;
}

export default function CreatorDashboard() {
    const [createdCourses, setCreatedCourses] = useState<CourseCardProps[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<CreatorStats>({
        totalCourses: 0,
        totalStudents: 0,
        totalRevenue: 0,
        averageRating: 0
    });
    
    // Withdraw dialog state
    const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
    const [availableCredits, setAvailableCredits] = useState(0);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawLoading, setWithdrawLoading] = useState(false);
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountName, setAccountName] = useState("");

    // Get exchange rate from environment variable
    const creditVndRate = parseFloat(process.env.NEXT_PUBLIC_CREDIT_VND_RATE || "2500");

    useEffect(() => {
        fetchCreatorData();
    }, []);

    const fetchCreatorData = async () => {
        setLoading(true);
        try {
            const user = await getCurrentUser();
            if (!user) {
                console.log("No user found");
                setLoading(false);
                return;
            }

            const supabase = createClient();
            
            // Fetch courses created by the current user
            const { data: courses, error } = await supabase
                .from("courses")
                .select("*, creator:users!courses_creator_id_fkey(username, profile_picture_url)")
                .eq("creator_id", user.id)
                .order('created_at', { ascending: false });

            // Fetch actual earnings from transactions
            const { data: earnings, error: earningsError } = await supabase
                .from("transactions")
                .select("amount")
                .eq("user_id", user.id)
                .eq("status", "completed")
                .like("detail->>type", "author_earnings");

            if (error) {
                console.error("Error fetching creator courses:", error);
            } else {
                setCreatedCourses(courses || []);
                
                // Calculate stats
                const totalCourses = courses?.length || 0;
                const totalStudents = courses?.reduce((sum, course) => sum + (course.total_enrolled || 0), 0) || 0;
                const actualEarnings = earnings?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0;
                const averageRating = courses?.length ? 
                    courses.reduce((sum, course) => sum + (course.rating || 0), 0) / courses.length : 0;

                setStats({
                    totalCourses,
                    totalStudents,
                    totalRevenue: actualEarnings,
                    averageRating: Math.round(averageRating * 10) / 10
                });
            }

            if (earningsError) {
                console.error("Error fetching earnings:", earningsError);
            }
        } catch (error) {
            console.error("Error in fetchCreatorData:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableCredits = async () => {
        try {
            const user = await getCurrentUser();
            if (!user) {
                console.log("No user found");
                return;
            }

            const supabase = createClient();
            
            // Fetch user's current credit balance
            const { data: userData, error } = await supabase
                .from("users")
                .select("withdraw_available_balance")
                .eq("id", user.id)
                .single();

            if (error) {
                console.error("Error fetching user withdraw_available_balance:", error);
            } else {
                setAvailableCredits(userData?.withdraw_available_balance || 0);
            }
        } catch (error) {
            console.error("Error in fetchAvailableCredits:", error);
        }
    };

    const handleWithdrawClick = () => {
        setIsWithdrawDialogOpen(true);
        fetchAvailableCredits();
    };

    const handleWithdraw = async () => {
        const amount = parseFloat(withdrawAmount);
        
        if (!amount || amount <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        if (amount > availableCredits) {
            alert("Insufficient credits available for withdrawal");
            return;
        }

        if (!bankName.trim()) {
            alert("Please enter bank name");
            return;
        }

        if (!accountNumber.trim()) {
            alert("Please enter account number");
            return;
        }

        if (!accountName.trim()) {
            alert("Please enter account name");
            return;
        }

        setWithdrawLoading(true);
        try {
            const user = await getCurrentUser();
            if (!user) {
                alert("User not found");
                return;
            }

            const supabase = createClient();
            
            // Create withdrawal transaction
            const { error: transactionError } = await supabase
                .from("transactions")
                .insert({
                    user_id: user.id,
                    amount: amount,
                    status: "pending",
                    detail: {
                        type: "withdrawal",
                        method: "bank_transfer",
                        bank_name: bankName.trim(),
                        account_number: accountNumber.trim(),
                        account_name: accountName.trim(),
                        currency: "VND",
                        exchange_rate: creditVndRate,
                        vnd_amount: amount * creditVndRate
                    }
                });

            if (transactionError) {
                console.error("Error creating withdrawal transaction:", transactionError);
                alert("Failed to process withdrawal. Please try again.");
                return;
            }

            // Update user's withdraw available balance
            const { error: updateError } = await supabase
                .from("users")
                .update({ withdraw_available_balance: availableCredits - amount })
                .eq("id", user.id);

            if (updateError) {
                console.error("Error updating user withdraw balance:", updateError);
                alert("Failed to update credit balance. Please contact support.");
                return;
            }

            alert("Withdrawal request submitted successfully! Processing time: 3-5 business days.");
            setIsWithdrawDialogOpen(false);
            setWithdrawAmount("");
            setBankName("");
            setAccountNumber("");
            setAccountName("");
            fetchAvailableCredits();
            fetchCreatorData(); // Refresh stats
        } catch (error) {
            console.error("Error in handleWithdraw:", error);
            alert("Failed to process withdrawal. Please try again.");
        } finally {
            setWithdrawLoading(false);
        }
    };

    const handleDeleteCourse = async (courseId: string) => {
        if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
            return;
        }

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("courses")
                .delete()
                .eq("id", courseId);

            if (error) {
                console.error("Error deleting course:", error);
                alert("Failed to delete course. Please try again.");
            } else {
                // Refresh the courses list
                fetchCreatorData();
                alert("Course deleted successfully!");
            }
        } catch (error) {
            console.error("Error in handleDeleteCourse:", error);
            alert("Failed to delete course. Please try again.");
        }
    };

    const CreatorCourseCard = ({ course }: { course: CourseCardProps }) => (
        <div className="border-zinc-200 border rounded-lg overflow-hidden h-full flex flex-col">
            <div className="relative w-full h-48 overflow-hidden">
                <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-4 flex flex-col gap-2 flex-grow">
                <h3 className="text-lg font-bold line-clamp-2">{course.title}</h3>
                <p className="text-sm text-zinc-500 line-clamp-2">{course.description}</p>
                <div className="flex justify-between items-center text-sm text-zinc-600">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{course.total_enrolled} enrolled</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span>{course.total_lessons} lessons</span>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-lg font-bold">{course.price} <span className="text-sm text-zinc-500">Credits</span></p>
                    <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm text-zinc-600">{course.rating}</span>
                    </div>
                </div>
            </div>
            <div className="p-4 border-t border-zinc-200 flex gap-2">
                <Link href={`/courses/${course.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full border-zinc-200">
                        <Eye className="w-4 h-4" />
                        View
                    </Button>
                </Link>
                <Link href={`/courses/creator-dashboard/course-builder?courseId=${course.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full border-zinc-200">
                        <Edit className="w-4 h-4" />
                        Edit
                    </Button>
                </Link>
                <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleDeleteCourse(course.id)}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );

    const StatCard = ({ title, value, icon: Icon, subtitle }: { 
        title: string; 
        value: string | number; 
        icon: any; 
        subtitle?: string;
    }) => (
        <Card className="border-zinc-200">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
                    <Icon className="w-4 h-4 text-gray-400" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <div>
                <CoursesNavbar />
                <div className="p-6">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-gray-200 rounded w-64"></div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-32 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                        <div className="h-8 bg-gray-200 rounded w-48"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-80 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <CoursesNavbar />
            <div className="p-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Creator Dashboard</h1>
                        <p className="text-gray-600 mt-1">Manage your courses and track your success</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="border-zinc-200" onClick={handleWithdrawClick}>
                            <Wallet className="w-4 h-4" />
                            Withdraw Credits
                        </Button>
                        <Link href="/courses/creator-dashboard/course-builder">
                            <Button className="border-zinc-200">
                                <Plus className="w-4 h-4" />
                                Create New Course
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <StatCard 
                        title="Total Courses" 
                        value={stats.totalCourses} 
                        icon={BookOpen}
                        subtitle="Active courses"
                    />
                    <StatCard 
                        title="Total Students" 
                        value={stats.totalStudents} 
                        icon={Users}
                        subtitle="Across all courses"
                    />
                    <StatCard 
                        title="Actual Earnings" 
                        value={`${stats.totalRevenue}`} 
                        icon={DollarSign}
                        subtitle="Credits earned (80% of sales)"
                    />
                    <StatCard 
                        title="Average Rating" 
                        value={stats.averageRating || "N/A"} 
                        icon={TrendingUp}
                        subtitle="Course rating"
                    />
                </div>

                {/* Course Management Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">My Courses</h2>
                        <div className="flex gap-2">
                            
                        </div>
                    </div>

                    {createdCourses.length === 0 ? (
                        <Card className="border-zinc-200">
                            <CardContent className="text-center py-12">
                                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses yet</h3>
                                <p className="text-gray-600 mb-4">Start creating your first course to share your knowledge</p>
                                <Link href="/courses/creator-dashboard/course-builder">
                                    <Button className="bg-blue-600 hover:bg-blue-700">
                                        <Plus className="w-4 h-4" />
                                        Create Your First Course
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {createdCourses.map((course) => (
                                <CreatorCourseCard key={course.id} course={course} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Withdraw Dialog */}
            <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                <DialogContent className="sm:max-w-[425px] max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wallet className="w-5 h-5" />
                            Withdraw Credits
                        </DialogTitle>
                        <DialogDescription>
                            Convert your earned credits to cash. Withdrawals are processed within 3-5 business days.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <ScrollArea className="max-h-[60vh] pr-4">
                        <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="available-credits" className="text-sm font-medium">
                                Available Credits
                            </Label>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-lg font-semibold text-gray-900">
                                    {availableCredits.toLocaleString()} Credits
                                </span>
                                <span className="text-sm text-gray-500">
                                    ≈ {(availableCredits * creditVndRate).toLocaleString()} VND
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="withdraw-amount" className="text-sm font-medium">
                                Withdrawal Amount (Credits)
                            </Label>
                            <Input
                                id="withdraw-amount"
                                type="number"
                                placeholder="Enter amount to withdraw"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                min="1"
                                max={availableCredits}
                                className="border-zinc-200"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Minimum: 1 Credit</span>
                                <span>Maximum: {availableCredits.toLocaleString()} Credits</span>
                            </div>
                        </div>

                        {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-blue-700">You will receive:</span>
                                    <span className="font-semibold text-blue-900">
                                        {(parseFloat(withdrawAmount) * creditVndRate).toLocaleString()} VND
                                    </span>
                                </div>
                                <p className="text-xs text-blue-600 mt-1">
                                    Exchange rate: 1 Credit = {creditVndRate.toLocaleString()} VND
                                </p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Bank Information</Label>
                            
                            <div className="space-y-2">
                                <Label htmlFor="bank-name" className="text-sm text-gray-600">
                                    Bank Name
                                </Label>
                                <Input
                                    id="bank-name"
                                    type="text"
                                    placeholder="e.g. Vietcombank, BIDV, Techcombank"
                                    value={bankName}
                                    onChange={(e) => setBankName(e.target.value)}
                                    className="border-zinc-200"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="account-number" className="text-sm text-gray-600">
                                    Account Number
                                </Label>
                                <Input
                                    id="account-number"
                                    type="text"
                                    placeholder="Enter your account number"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                    className="border-zinc-200"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="account-name" className="text-sm text-gray-600">
                                    Account Name
                                </Label>
                                <Input
                                    id="account-name"
                                    type="text"
                                    placeholder="Account holder name (as registered with bank)"
                                    value={accountName}
                                    onChange={(e) => setAccountName(e.target.value)}
                                    className="border-zinc-200"
                                />
                            </div>
                        </div>

                        <div className="text-xs text-gray-500 space-y-1">
                            <p>• Processing time: 3-5 business days</p>
                            <p>• Funds will be transferred to the provided bank account</p>
                            <p>• Minimum withdrawal: 1 Credit ({creditVndRate.toLocaleString()} VND)</p>
                            <p>• Please ensure bank details are accurate to avoid delays</p>
                        </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsWithdrawDialogOpen(false);
                                setWithdrawAmount("");
                                setBankName("");
                                setAccountNumber("");
                                setAccountName("");
                            }}
                            disabled={withdrawLoading}
                            className="border-zinc-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleWithdraw}
                            disabled={withdrawLoading || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || !bankName.trim() || !accountNumber.trim() || !accountName.trim()}
                        >
                            {withdrawLoading ? "Processing..." : "Withdraw"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
