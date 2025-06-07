import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/utils/supabase/client';
import { getCurrentUser, getAccessToken } from '@/utils/local_user';

const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY || '';

function verifyWebhookSignature(body: any, signature: string): boolean {
    try {
        // For webhook, PayOS sends data in a different format
        // Check the actual structure from PayOS webhook documentation
        const data = body.data;

        // Create signature string - adjust this based on actual PayOS webhook format
        let dataToSign = '';
        if (data.amount !== undefined && data.orderCode !== undefined) {
            // Construct signature based on actual PayOS webhook data structure
            const sortedKeys = Object.keys(data).sort();
            dataToSign = sortedKeys
                .map(key => `${key}=${data[key]}`)
                .join('&');
        }

        const computedSignature = crypto.createHmac('sha256', PAYOS_CHECKSUM_KEY).update(dataToSign).digest('hex');

        console.log('Webhook signature verification:', {
            received: signature,
            computed: computedSignature,
            dataToSign: dataToSign
        });

        return computedSignature === signature;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const signature = body.signature;

        // Verify webhook signature
        if (!verifyWebhookSignature(body, signature)) {
            console.error('Invalid webhook signature');
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 401 }
            );
        }

        const { data } = body;
        const { code, desc, orderCode, amount, status, id: paymentLinkId } = data;

        console.log('PayOS Webhook received:', { code, desc, orderCode, amount, status });

        // Only process successful payments
        if (code === '00' && status === 'PAID') {
            try {
                // Note: In a webhook, we can't access user session directly
                // We need to get user info from the order or pass it in the description

                // For now, we'll extract user info from the description or orderCode
                // In a real implementation, you should store the orderCode with user info when creating the payment

                // Here's a simplified version - you might want to store order info in your database
                // and retrieve the user ID from there using the orderCode

                console.log('Payment successful, updating user balance...');

                // You would typically:
                // 1. Look up the order in your database using orderCode
                // 2. Get the user ID from the order
                // 3. Update the user's balance
                // 4. Record the transaction

                // For demonstration, we'll return success
                return NextResponse.json({
                    success: true,
                    message: 'Webhook processed successfully'
                });

            } catch (error) {
                console.error('Error processing payment confirmation:', error);
                return NextResponse.json(
                    { error: 'Failed to process payment confirmation' },
                    { status: 500 }
                );
            }
        } else {
            console.log('Payment not successful or not paid:', { code, status });
            return NextResponse.json({
                success: true,
                message: 'Webhook received but payment not successful'
            });
        }

    } catch (error) {
        console.error('Webhook processing error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// Allow GET requests for webhook verification
export async function GET() {
    return NextResponse.json({ message: 'PayOS webhook endpoint' });
} 