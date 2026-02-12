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

        // clean symbol
        const cleanSymbol = symbol.trim().toUpperCase();

        // Fetch using the new getLTP (tr_live_prices endpoint)
        const data = await groww.getLTP('CASH', cleanSymbol);

        // The new endpoint returns the data object directly (ltp, dayChange, etc.)
        // Structure: { ltp, dayChange, dayChangePerc, symbol, ... }

        const result = {
            symbol: data.symbol || cleanSymbol,
            ltp: data.ltp || 0,
            change: data.dayChange || 0,
            pChange: data.dayChangePerc || 0,
            trend: (data.dayChange || 0) >= 0 ? 'up' : 'down'
        };

        return NextResponse.json({
            success: true,
            data: result
        });

    } catch (error: any) {
        console.error('Quote API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
