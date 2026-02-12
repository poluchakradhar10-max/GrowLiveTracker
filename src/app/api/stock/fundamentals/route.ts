import { NextRequest, NextResponse } from 'next/server';
import { GrowwAPI, groww } from '@/lib/groww';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ success: false, error: 'Symbol parameter is required' }, { status: 400 });
    }

    try {
        const apiKey = process.env.GROWW_API_KEY;
        const apiSecret = process.env.GROWW_TOTP_SECRET;

        if (!apiKey || !apiSecret) {
            return NextResponse.json({ success: false, error: 'API Keys missing' }, { status: 500 });
        }

        // Use singleton instance
        // await groww.getAccessToken();

        const fundamentals = await groww.getCompanyFundamentals(symbol);

        if (!fundamentals) {
            return NextResponse.json({ success: false, error: 'Fundamentals not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: fundamentals
        });

    } catch (error: any) {
        console.error('Fundamentals API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
