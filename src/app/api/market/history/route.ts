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

        // Direct fetch using the symbol with new V2 endpoint
        // No search needed anymore
        console.log(`Fetching chart data for: ${symbol}`);

        const rawData = await groww.getChartData(symbol);

        // V2 Endpoint Format: { candles: [[time, open, high, low, close, volume], ...] }
        // We can pass this directly or map it.
        // Let's pass the raw candles array to be flexible.

        let candles = [];
        if (rawData && rawData.candles && Array.isArray(rawData.candles)) {
            candles = rawData.candles.map((c: any[]) => ({
                time: c[0],
                open: c[1],
                high: c[2],
                low: c[3],
                close: c[4],
                volume: c[5]
            }));
        }

        return NextResponse.json({
            success: true,
            data: candles
        });

    } catch (error: any) {
        console.error('History API Error:', error);
        // Return 200 with error field to prevent UI crash, or 500 if robust error boundary exists
        // User requested: {"error": "Data unavailable"}
        return NextResponse.json({ success: false, error: 'Data unavailable', details: error.message }, { status: 200 });
    }
}
