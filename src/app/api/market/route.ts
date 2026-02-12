import { NextResponse } from 'next/server';
import { groww } from '@/lib/groww';

export async function GET() {
    try {
        const apiKey = process.env.GROWW_API_KEY;
        const apiSecret = process.env.GROWW_TOTP_SECRET;

        if (!apiKey || !apiSecret) {
            console.warn('GROWW_API_KEY or GROWW_TOTP_SECRET is missing.');
            // Fallback to simulated data if keys are missing
            return NextResponse.json({
                success: true,
                source: 'simulated',
                data: [
                    { symbol: 'NIFTY 50', ltp: 21550.80, change: 120.5, pChange: 0.62, trend: 'up' },
                    { symbol: 'RELIANCE', ltp: 2560.45, change: -12.4, pChange: -0.53, trend: 'down' }
                ]
            });
        }

        try {
            // Use singleton instance
            // await groww.getAccessToken(); // Authenticate if needed (handled internally/lazily by singleton methods usually, but explicit call is fine too)
            // Actually, the methods in GrowwAPI check for token and call getAccessToken if missing.
            // But let's keep explicit auth if the class doesn't auto-handle it perfectly for concurrent requests 
            // (The class does check `if (!this.accessToken)`, so it should be fine).

            // Top NIFTY 50 Stocks (by weightage approx)
            const symbols = [
                'RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFOSYS',
                'ITC', 'SBIN', 'BHARTIARTL', 'LICI', 'HINDUNILVR',
                'TATAMOTORS', 'LT', 'BAJFINANCE', 'HCLTECH', 'KOTAKBANK',
                'AXISBANK', 'ASIANPAINT', 'MARUTI', 'TITAN', 'SUNPHARMA',
                'ADANIENT', 'ULTRACEMCO', 'NTPC', 'POWERGRID', 'M&M'
            ];

            // Fetch data in chunks to avoid rate limits (429)
            // Use new batch method
            console.log(`Fetching data for ${symbols.length} symbols...`);

            // Note: NIFTY 50 is an index, might need different handling if passed to getLTP directly as 'NIFTY'
            // Our getBatchLTP assumes NSE_SYMBOL. For NIFTY it's NSE_NIFTY. 
            // So passing 'NIFTY' in the array works with getLTP logic.

            const allSymbols = [...symbols, 'NIFTY'];
            const batchResults = await groww.getBatchLTP('CASH', allSymbols, 5, 500);
            // console.log('Batch Results Keys:', Object.keys(batchResults));
            // console.log('Sample RELIANCE:', JSON.stringify(batchResults['RELIANCE']));

            // The batchResults is now Record<string, { ltp, change, pChange }>
            // Note: NIFTY 50 might be keyed as 'NIFTY' or 'NSE_NIFTY' depending on getBatchLTP logic.
            // getBatchLTP index by symbol passed. 

            const data = allSymbols.map(sym => {
                const displayName = sym === 'NIFTY' ? 'NIFTY 50' : sym;
                const quote = batchResults[sym];

                if (quote) {
                    return {
                        symbol: displayName,
                        ltp: quote.ltp,
                        change: quote.change,
                        pChange: quote.pChange,
                        trend: (quote.change >= 0) ? 'up' : 'down'
                    };
                }

                return {
                    symbol: displayName,
                    ltp: 0,
                    change: 0,
                    pChange: 0,
                    trend: 'neutral'
                };
            });

            return NextResponse.json({
                success: true,
                source: 'live',
                data
            });



        } catch (apiError: any) {
            console.error('Groww API Fetch Error:', apiError.message);
            return NextResponse.json({
                success: false,
                error: apiError.message,
                details: 'Failed to fetch data from Groww API. Check server logs for auth errors.'
            }, { status: 502 });
        }

    } catch (error) {
        console.error('Market API Internal Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
