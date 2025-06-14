'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { getCurrentUser, getAccessToken } from '@/utils/local_user';
import { validateUserBalance, getFeatureDescription } from '@/utils/pricing';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Check } from 'lucide-react';

interface EnrollButtonProps {
    courseId: string;
    isEnrolled: boolean;
    price: number;
    className?: string;
}

export function EnrollButton({ courseId, isEnrolled, price, className }: EnrollButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleEnroll = async () => {
        try {
            setIsLoading(true);

            // Check if user is authenticated
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                toast.error('Please sign in to enroll in this course');
                router.push('/auth/login');
                return;
            }

            // Check if already enrolled
            const { data: existingEnrollment } = await supabase
                .from('enrolled')
                .select('*')
                .eq('course_id', courseId)
                .eq('user_id', user.id)
                .single();

            if (existingEnrollment) {
                toast.info('You are already enrolled in this course');
                router.refresh();
                return;
            }

            // If course has a price, check user balance and deduct credits
            if (price > 0) {
                // Get user profile with balance using the same pattern as wallet page
                const currentUser = await getCurrentUser();
                const supabaseWithToken = createClient(await getAccessToken());
                
                const { data: userProfile, error: userError } = await supabaseWithToken
                    .from('users')
                    .select('*')
                    .eq('id', currentUser?.id)
                    .single();

                if (userError) {
                    console.error('Error fetching user profile:', userError);
                    toast.error('Failed to check user balance. Please try again.');
                    return;
                }

                // Check if user has enough balance
                const balanceValidation = validateUserBalance(userProfile?.balance || 0, price);
                if (!balanceValidation.isValid) {
                    toast.error(balanceValidation.message!);
                    router.push('/wallet');
                    return;
                }

                // Get course creator information
                const { data: courseData, error: courseError } = await supabaseWithToken
                    .from('courses')
                    .select('creator_id')
                    .eq('id', courseId)
                    .single();

                if (courseError) {
                    console.error('Error fetching course data:', courseError);
                    toast.error('Failed to process payment. Please try again.');
                    return;
                }

                // Deduct credits from user balance
                const newBalance = userProfile.balance - price;
                const { error: balanceError } = await supabaseWithToken
                    .from('users')
                    .update({ balance: newBalance })
                    .eq('id', user.id);

                if (balanceError) {
                    console.error('Error updating user balance:', balanceError);
                    toast.error('Failed to process payment. Please try again.');
                    return;
                }

                // Calculate 80% credit for the course author
                const authorCredit = Math.floor(price * 0.8);

                // Get current author balance and add credit
                const { data: authorProfile, error: authorError } = await supabaseWithToken
                    .from('users')
                    .select('balance')
                    .eq('id', courseData.creator_id)
                    .single();

                if (authorError) {
                    console.error('Error fetching author profile:', authorError);
                    // Continue with enrollment even if author credit fails
                } else {
                    // Update author balance
                    const authorNewBalance = (authorProfile.balance || 0) + authorCredit;
                    const { error: authorBalanceError } = await supabaseWithToken
                        .from('users')
                        .update({ balance: authorNewBalance })
                        .eq('id', courseData.creator_id);

                    if (authorBalanceError) {
                        console.error('Error updating author balance:', authorBalanceError);
                        // Continue with enrollment even if author credit fails
                    } else {
                        // Record author credit transaction
                        const { error: authorTransactionError } = await supabaseWithToken
                            .from('transactions')
                            .insert({
                                user_id: courseData.creator_id,
                                amount: authorCredit,
                                status: 'completed',
                                detail: {
                                    type: 'author_earnings',
                                    description: `Course sale revenue (80%): ${courseData.creator_id}`,
                                    course_id: courseId,
                                    buyer_id: user.id
                                }
                            });

                        if (authorTransactionError) {
                            console.error('Error recording author transaction:', authorTransactionError);
                            // Continue with enrollment even if transaction record fails
                        }
                    }
                }

                // Record the buyer's transaction
                const { error: transactionError } = await supabaseWithToken
                    .from('transactions')
                    .insert({
                        user_id: user.id,
                        amount: price,
                        status: 'completed',
                        detail: {
                            type: 'purchase',
                            description: getFeatureDescription('course_purchase', `Course ${courseId}`),
                            course_id: courseId
                        }
                    });

                if (transactionError) {
                    console.error('Error recording transaction:', transactionError);
                    // Note: We don't return here as the payment was already processed
                    // The transaction record is for history tracking
                }
            }

            // Enroll the user
            const { error: enrollError } = await supabase
                .from('enrolled')
                .insert({
                    user_id: user.id,
                    course_id: courseId,
                    status: 'active'
                });

            if (enrollError) {
                console.error('Enrollment error:', enrollError);
                toast.error('Failed to enroll. Please try again.');
                return;
            }

            // Update total_enrolled count
            const { error: updateError } = await supabase.rpc('increment_enrolled_count', {
                course_id: courseId
            });

            if (updateError) {
                console.error('Error updating enrollment count:', updateError);
            }

            if (price > 0) {
                toast.success(`Successfully enrolled! ${price} credits deducted from your balance.`);
            } else {
                toast.success('Successfully enrolled in the course!');
            }
            router.refresh();

        } catch (error) {
            console.error('Enrollment error:', error);
            toast.error('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoToCourse = () => {
        router.push(`learn/${courseId}`);
    };

    if (isEnrolled) {
        return (
            <Button
                onClick={handleGoToCourse}
                className={className}
                size="lg"
            >
                <Check className="w-4 h-4 mr-2" />
                Go to Course
            </Button>
        );
    }

    return (
        <Button
            onClick={handleEnroll}
            disabled={isLoading}
            className={className}
            size="lg"
        >
            {isLoading ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enrolling...
                </>
            ) : (
                <>
                    {price > 0 ? `Enroll for ${price} credits` : 'Enroll for Free'}
                </>
            )}
        </Button>
    );
} 