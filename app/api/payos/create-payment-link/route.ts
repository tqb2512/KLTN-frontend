import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface PayOSPaymentData {
    orderCode: number;
    amount: number;
    description: string;
    buyerName?: string;
    buyerEmail?: string;
    buyerPhone?: string;
    buyerAddress?: string;
    items?: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    cancelUrl: string;
    returnUrl: string;
    expiredAt?: number;
}

// PayOS API configuration
const PAYOS_API_URL = process.env.PAYOS_API_URL || 'https://api-merchant.payos.vn';
const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID || '';
const PAYOS_API_KEY = process.env.PAYOS_API_KEY || '';
const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY || '';

function generateSignature(data: any): string {
    // PayOS requires specific format: amount=$amount&cancelUrl=$cancelUrl&description=$description&orderCode=$orderCode&returnUrl=$returnUrl
    const dataToSign = `amount=${data.amount}&cancelUrl=${data.cancelUrl}&description=${data.description}&orderCode=${data.orderCode}&returnUrl=${data.returnUrl}`;

    return crypto.createHmac('sha256', PAYOS_CHECKSUM_KEY).update(dataToSign).digest('hex');
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { amount, description, buyerName, buyerEmail, buyerPhone, userId } = body;

        if (!amount || !description) {
            return NextResponse.json(
                { error: 'Missing required fields: amount, description' },
                { status: 400 }
            );
        }

        // Generate unique order code
        const orderCode = Math.floor(Math.random() * 1000000) + Date.now();

        // Get VND conversion rate from environment variable
        const creditVndRate = parseFloat(process.env.NEXT_PUBLIC_CREDIT_VND_RATE || '1000');

        // PayOS payment data - amount should be in VND (smallest unit)
        const paymentData: PayOSPaymentData = {
            orderCode,
            amount: Math.round(amount * creditVndRate), // Convert to VND using environment variable
            description,
            buyerName: buyerName || 'Customer',
            buyerEmail: buyerEmail || '',
            buyerPhone: buyerPhone || '',
            items: [
                {
                    name: 'Credit Recharge',
                    quantity: 1,
                    price: Math.round(amount * creditVndRate)
                }
            ],
            cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/wallet?status=cancelled`,
            returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/wallet?status=success&orderCode=${orderCode}`,
            expiredAt: Math.floor(Date.now() / 1000) + 900, // 15 minutes
        };

        // Generate signature
        const signatureData = {
            amount: paymentData.amount,
            cancelUrl: paymentData.cancelUrl,
            description: paymentData.description,
            orderCode: paymentData.orderCode,
            returnUrl: paymentData.returnUrl
        };
        console.log(signatureData);

        const signature = generateSignature(signatureData);
        // Prepare request to PayOS
        const payosRequest = {
            ...paymentData,
            signature
        };

        console.log(payosRequest);

        console.log('PayOS request:', {
            url: `${PAYOS_API_URL}/v2/payment-requests`,
            headers: {
                'x-client-id': PAYOS_CLIENT_ID ? 'Present' : 'Missing',
                'x-api-key': PAYOS_API_KEY ? 'Present' : 'Missing'
            },
            body: payosRequest
        });

        // Make request to PayOS API
        const response = await fetch(`${PAYOS_API_URL}/v2/payment-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': PAYOS_CLIENT_ID,
                'x-api-key': PAYOS_API_KEY,
            },
            body: JSON.stringify(payosRequest),
        });

        const result = await response.json();

        console.log(result);

        if (!response.ok) {
            console.error('PayOS API Error:', result);
            return NextResponse.json(
                { error: 'Failed to create payment link', details: result },
                { status: response.status }
            );
        }

        // Return success response
        return NextResponse.json({
            success: true,
            data: {
                checkoutUrl: result.data?.checkoutUrl,
                qrCode: result.data?.qrCode,
                paymentLinkId: result.data?.paymentLinkId,
                orderCode: orderCode,
                amount: amount,
                description: description
            }
        });

    } catch (error) {
        console.error('PayOS integration error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
} 