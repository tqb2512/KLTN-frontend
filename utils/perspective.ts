interface PerspectiveResponse {
    isToxic: boolean;
    scores: {
        [attribute: string]: number;
    };
    details?: any;
}

interface PerspectiveError {
    error: string;
    details?: any;
}

// Define attribute sets with fallback options
// SEVERE_TOXICITY often has language limitations, so we provide fallbacks
const ATTRIBUTE_SETS = {
    full: ['TOXICITY', 'SEVERE_TOXICITY', 'IDENTITY_ATTACK', 'INSULT', 'PROFANITY', 'THREAT'],
    basic: ['TOXICITY', 'IDENTITY_ATTACK', 'INSULT', 'PROFANITY', 'THREAT'],
    minimal: ['TOXICITY'] // TOXICITY has the widest language support
};

/**
 * Checks content for toxicity using Perspective API.
 * If language is not supported, allows content to pass through as non-toxic.
 */
export async function checkContentToxicity(
    text: string, 
    attributes: string[] = ATTRIBUTE_SETS.full
): Promise<PerspectiveResponse | PerspectiveError> {
    
    try {
        const response = await fetch('/api/perspective', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                attributes
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            // Check if the error is related to language support
            const errorDetails = typeof result.details === 'string' ? result.details : JSON.stringify(result.details);
            const isLanguageError = errorDetails.includes('does not support request languages') || 
                                  errorDetails.includes('LANGUAGE_NOT_SUPPORTED_BY_ATTRIBUTE');

            if (isLanguageError) {
                console.warn('Language not supported by Perspective API, allowing content to pass through');
                // Return as non-toxic when language is not supported
                return {
                    isToxic: false,
                    scores: {},
                    details: { message: 'Language not supported, content allowed' }
                };
            }

            // For other errors, return the error
            return {
                error: result.error || 'Failed to check content',
                details: result.details
            };
        }

        return result as PerspectiveResponse;
    } catch (error) {
        return {
            error: 'Network error occurred while checking content',
            details: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

export function isPerspectiveError(result: PerspectiveResponse | PerspectiveError): result is PerspectiveError {
    return 'error' in result;
}

// Export attribute sets for external use
export { ATTRIBUTE_SETS }; 