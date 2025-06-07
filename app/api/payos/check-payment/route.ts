import { NextRequest, NextResponse } from 'next/server';

const PAYOS_API_URL = process.env.PAYOS_API_URL || 'https://api-merchant.payos.vn';
const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID || '';
const PAYOS_API_KEY = process.env.PAYOS_API_KEY || '';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const orderCode = searchParams.get('orderCode');

        if (!orderCode) {
            return NextResponse.json(
                { error: 'Missing orderCode parameter' },
                { status: 400 }
            );
        }

        // Check payment status with PayOS API
        const response = await fetch(`${PAYOS_API_URL}/v2/payment-requests/${orderCode}`, {
            method: 'GET',
            headers: {
                'x-client-id': PAYOS_CLIENT_ID,
                'x-api-key': PAYOS_API_KEY,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('PayOS API Error:', result);
            return NextResponse.json(
                { error: 'Failed to check payment status', details: result },
                { status: response.status }
            );
        }

        // Return payment status
        return NextResponse.json({
            success: true,
            data: {
                orderCode: result.data?.orderCode,
                amount: result.data?.amount,
                status: result.data?.status,
                createdAt: result.data?.createdAt,
                transactions: result.data?.transactions,
            }
        });

    } catch (error) {
        console.error('Payment status check error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
} 