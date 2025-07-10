"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getCurrentUser, getAccessToken } from '@/utils/local_user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { checkContentToxicity, isPerspectiveError } from '@/utils/perspective';

interface Review {
    user_id: string;
    course_id: string;
    rating: number;
    comment: string;
    created_at: string;
    users: {
        id: string;
        username: string;
        profile_picture_url: string;
    };
}

interface ReviewSectionProps {
    courseId: string;
    isEnrolled: boolean;
}

function StarRating({ rating, onRatingChange, readonly = false }: { 
    rating: number; 
    onRatingChange?: (rating: number) => void; 
    readonly?: boolean;
}) {
    const [hoverRating, setHoverRating] = useState(0);

    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={readonly}
                    className={`text-lg ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}`}
                    onMouseEnter={() => !readonly && setHoverRating(star)}
                    onMouseLeave={() => !readonly && setHoverRating(0)}
                    onClick={() => !readonly && onRatingChange?.(star)}
                >
                    <Star
                        className={`w-5 h-5 ${
                            star <= (hoverRating || rating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                        }`}
                    />
                </button>
            ))}
        </div>
    );
}

function ReviewItem({ review }: { review: Review }) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="border-b border-gray-100 pb-4 last:border-b-0">
            <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10">
                    <AvatarImage src={review.users.profile_picture_url} />
                    <AvatarFallback>
                        {review.users.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900">{review.users.username}</h4>
                        <StarRating rating={review.rating} readonly />
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-500">{formatDate(review.created_at)}</span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
                </div>
            </div>
        </div>
    );
}

function ReviewForm({ courseId, onReviewSubmitted }: { 
    courseId: string; 
    onReviewSubmitted: () => void;
}) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toxicityWarning, setToxicityWarning] = useState<string | null>(null);

    const handleSubmitReview = async () => {
        if (rating === 0) {
            toast.error('Please select a rating');
            return;
        }

        if (!comment.trim()) {
            toast.error('Please write a review comment');
            return;
        }

        setIsSubmitting(true);
        setToxicityWarning(null);

        try {
            // Check comment toxicity
            const toxicityResult = await checkContentToxicity(comment.trim());
            
            if (isPerspectiveError(toxicityResult)) {
                console.error('Error checking review toxicity:', toxicityResult.error);
                // Continue with review creation even if toxicity check fails
            } else if (toxicityResult.isToxic) {
                setToxicityWarning('Your review may contain inappropriate content. Please review and edit your comment.');
                setIsSubmitting(false);
                return;
            }

            const currentUser = await getCurrentUser();
            if (!currentUser) {
                toast.error('You must be logged in to leave a review');
                return;
            }

            const supabase = createClient(await getAccessToken());

                         // Update the user's enrollment record with the review
            const { error } = await supabase
                .from('enrolled')
                .update({
                    rating,
                    comment: comment.trim()
                })
                .eq('user_id', currentUser.id)
                .eq('course_id', courseId);

            if (error) {
                console.error('Error submitting review:', error);
                toast.error('Failed to submit review. Please try again.');
                return;
            }

            toast.success('Review submitted successfully!');

            // Reset form
            setRating(0);
            setComment('');
            onReviewSubmitted();

        } catch (error) {
            console.error('Error submitting review:', error);
            toast.error('Failed to submit review. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className='border-gray-200'>
            <CardHeader>
                <CardTitle className="text-lg">Leave a Review</CardTitle>
                <CardDescription>
                    Share your experience with this course
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rating
                    </label>
                    <StarRating rating={rating} onRatingChange={setRating} />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Review
                    </label>
                    <Textarea
                        placeholder="Tell others about your experience with this course..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={4}
                        className="resize-none"
                    />
                    {toxicityWarning && (
                        <p className="text-sm text-red-600 mt-2">{toxicityWarning}</p>
                    )}
                </div>

                <Button 
                    onClick={handleSubmitReview}
                    disabled={isSubmitting || rating === 0 || !comment.trim()}
                    className="w-full"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </Button>
            </CardContent>
        </Card>
    );
}

export default function ReviewSection({ courseId, isEnrolled }: ReviewSectionProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [userReview, setUserReview] = useState<Review | null>(null);
    const [showAll, setShowAll] = useState(false);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            
                         const { data, error } = await supabase
                .from('enrolled')
                .select(`
                    *,
                    users!enrolled_user_id_fkey(id, username, profile_picture_url)
                `)
                .eq('course_id', courseId)
                .not('rating', 'is', null)
                .not('comment', 'is', null)
                .gte('rating', 1)
                .neq('comment', '')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching reviews:', error);
                return;
            }

            setReviews(data || []);

            // Check if current user has a review
            const user = await getCurrentUser();
            setCurrentUser(user);
            
            if (user) {
                const userReviewData = data?.find(review => review.user_id === user.id);
                setUserReview(userReviewData || null);
                
                // Also check if user is enrolled but hasn't left a review yet
                if (!userReviewData) {
                    const { data: enrollmentData } = await supabase
                        .from('enrolled')
                        .select('rating, comment')
                        .eq('user_id', user.id)
                        .eq('course_id', courseId)
                        .single();
                    
                    if (enrollmentData && enrollmentData.rating && enrollmentData.comment) {
                        // Fetch full user data for the review
                        const { data: userData } = await supabase
                            .from('users')
                            .select('id, username, profile_picture_url')
                            .eq('id', user.id)
                            .single();
                        
                        if (userData) {
                            const userReview = {
                                user_id: user.id,
                                course_id: courseId,
                                rating: enrollmentData.rating,
                                comment: enrollmentData.comment,
                                created_at: '',
                                users: userData
                            };
                            setUserReview(userReview);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, [courseId]);

    const handleReviewSubmitted = () => {
        fetchReviews();
    };

    const averageRating = reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0;

    const displayedReviews = showAll ? reviews : reviews.slice(0, 3);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                                    <div className="h-16 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Review Form - Only show if user is enrolled and doesn't have a review */}
            {isEnrolled && currentUser && !userReview && (
                <ReviewForm courseId={courseId} onReviewSubmitted={handleReviewSubmitted} />
            )}

            {/* User's existing review */}
            {userReview && (
                <Card className="border-gray-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Your Review</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ReviewItem review={userReview} />
                    </CardContent>
                </Card>
            )}

            {/* Reviews List */}
            {reviews.length > 0 ? (
                <Card className='border-gray-200'>
                    <CardHeader>
                        <CardTitle className="text-lg">What Students Say</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {displayedReviews.map((review) => (
                                <ReviewItem key={review.user_id} review={review} />
                            ))}
                        </div>
                        
                        {reviews.length > 3 && (
                            <div className="mt-4 text-center">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowAll(!showAll)}
                                >
                                    {showAll ? 'Show Less' : `Show All ${reviews.length} Reviews`}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Card className='border-gray-200'>
                    <CardContent className="py-8">
                        <div className="text-center text-gray-500">
                            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">No reviews yet</p>
                            <p className="text-sm">Be the first to share your experience!</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 