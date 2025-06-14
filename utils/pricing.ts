export const PRICING = {
    AI_CHAT_MESSAGE: 1,
    AI_FLASHCARD_GENERATION: 5,
    AI_QUIZ_GENERATION: 3,
    AI_STUDY_GUIDE_GENERATION: 4,
    AI_MIND_MAP_GENERATION: 6,


} as const;

export const getFeatureDescription = (feature: string, context?: string): string => {
    const descriptions: Record<string, string> = {
        chat: 'AI Assistant chat message',
        flashcard: 'Flash card generation',
        quiz: 'Quiz generation',
        study_guide: 'Study guide generation',
        mind_map: 'Mind map generation',
        course_purchase: 'Course enrollment',
        author_earnings: 'Course sale revenue',
    };

    const baseDescription = descriptions[feature] || 'AI feature usage';
    return context ? `${baseDescription} in ${context}` : baseDescription;
};

export const validateUserBalance = (userBalance: number, requiredAmount: number): {
    isValid: boolean;
    message?: string;
} => {
    if (userBalance < requiredAmount) {
        return {
            isValid: false,
            message: `Insufficient credits. You need ${requiredAmount} credits but only have ${userBalance}. Please add more credits to your wallet.`
        };
    }

    return { isValid: true };
}; 