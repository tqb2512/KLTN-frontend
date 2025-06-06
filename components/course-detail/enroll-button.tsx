'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
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

            // For paid courses, you would integrate payment here
            // For now, we'll just handle free enrollment
            if (price > 0) {
                toast.info('Payment integration coming soon!');
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

            toast.success('Successfully enrolled in the course!');
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