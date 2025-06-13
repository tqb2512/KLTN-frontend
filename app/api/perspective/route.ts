import { NextRequest, NextResponse } from 'next/server';

const PERSPECTIVE_API_KEY = process.env.PERSPECTIVE_API_KEY;
const PERSPECTIVE_API_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

interface PerspectiveRequest {
    text: string;
    attributes?: string[];
}

interface PerspectiveResponse {
    isToxic: boolean;
    scores: {
        [attribute: string]: number;
    };
    details?: any;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        if (!PERSPECTIVE_API_KEY) {
            return NextResponse.json(
                { error: 'Perspective API key not configured' },
                { status: 500 }
            );
        }

        const { text, attributes = ['TOXICITY'] }: PerspectiveRequest = await request.json();

        if (!text || text.trim().length === 0) {
            return NextResponse.json(
                { error: 'Text content is required' },
                { status: 400 }
            );
        }

        // Build the request data for Perspective API
        const requestData = {
            comment: {
                text: text
            },
            requestedAttributes: attributes.reduce((acc, attr) => {
                acc[attr] = {};
                return acc;
            }, {} as any)
        };

        // Make request to Perspective API
        const response = await fetch(`${PERSPECTIVE_API_URL}?key=${PERSPECTIVE_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorObj;
            
            try {
                errorObj = JSON.parse(errorText);
            } catch {
                errorObj = { message: errorText };
            }
            
            console.error('Perspective API Error:', errorObj);
            
            // Check if it's a language-specific error
            const isLanguageError = errorText.includes('does not support request languages') || 
                                  errorText.includes('LANGUAGE_NOT_SUPPORTED_BY_ATTRIBUTE');
            
            if (isLanguageError) {
                console.warn('Language support issue detected for attributes:', attributes);
            }
            
            return NextResponse.json(
                { 
                    error: 'Failed to analyze content', 
                    details: errorObj,
                    isLanguageError: isLanguageError 
                },
                { status: response.status }
            );
        }

        const result = await response.json();
        
        // Extract scores from the response
        const scores: { [key: string]: number } = {};
        let maxScore = 0;
        
        for (const attribute of attributes) {
            if (result.attributeScores && result.attributeScores[attribute]) {
                const score = result.attributeScores[attribute].summaryScore.value;
                scores[attribute] = score;
                maxScore = Math.max(maxScore, score);
            }
        }

        // Consider content toxic if any attribute score is above 0.7
        const isToxic = maxScore > 0.7;

        const perspectiveResponse: PerspectiveResponse = {
            isToxic,
            scores,
            details: result
        };

        return NextResponse.json(perspectiveResponse);

    } catch (error) {
        console.error('Perspective API integration error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
} 