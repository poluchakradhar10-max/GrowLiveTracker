import { NextRequest, NextResponse } from 'next/server';
import { GrowwAPI, groww } from '@/lib/groww';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    console.log('Search Query:', query);

    if (!query) {
        return NextResponse.json({ success: false, error: 'Query parameter "q" is required' }, { status: 400 });
    }

    try {
        const apiKey = process.env.GROWW_API_KEY;
        const apiSecret = process.env.GROWW_TOTP_SECRET;

        if (!apiKey || !apiSecret) {
            return NextResponse.json({ success: false, error: 'API Keys missing' }, { status: 500 });
        }

        // Use singleton instance
        // await groww.getAccessToken();

        const results = await groww.search(query);

        return NextResponse.json({
            success: true,
            data: results
        });

    } catch (error: any) {
        console.error('Search API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
