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

export async function checkContentToxicity(
    text: string, 
    attributes: string[] = ['TOXICITY', 'SEVERE_TOXICITY', 'IDENTITY_ATTACK', 'INSULT', 'PROFANITY', 'THREAT']
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