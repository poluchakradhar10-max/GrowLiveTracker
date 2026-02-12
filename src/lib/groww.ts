import * as OTPAuth from 'otpauth';
import dns from 'node:dns';

// Force IPV4 resolution as per user request to match curl behavior
if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
}

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
};

interface GrowwConfig {
    apiKey: string;
    apiSecret: string; // This is the TOTP secret (Base32 encoded)
    baseUrl?: string;
}

export class GrowwAPI {
    private apiKey: string;
    private apiSecret: string;
    private baseUrl: string;
    private accessToken: string | null = null;

    constructor(config: GrowwConfig) {
        this.apiKey = config.apiKey;
        this.apiSecret = config.apiSecret;
        this.baseUrl = config.baseUrl || 'https://api.groww.in/v1';
    }

    /**
     * Generates a TOTP code using otpauth.
     */
    private generateTOTP(): string {
        if (!this.apiSecret) {
            throw new Error('Groww API Secret (TOTP Secret) is missing');
        }

        const totp = new OTPAuth.TOTP({
            issuer: 'Groww',
            label: 'GrowwLiveTracker',
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(this.apiSecret)
        });

        return totp.generate();
    }

    /**
     * Authenticates with Groww to get an access token.
     */
    private authPromise: Promise<string> | null = null;

    /**
     * Authenticates with Groww to get an access token.
     * Uses promise deduping to handle parallel requests.
     */
    async getAccessToken(): Promise<string> {
        // If we already have a valid token, return it
        if (this.accessToken) return this.accessToken;

        // If an auth request is already in progress, return that promise
        if (this.authPromise) {
            return this.authPromise;
        }

        this.authPromise = (async () => {
            try {
                const totp = this.generateTOTP();
                const url = `${this.baseUrl}/token/api/access`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        ...HEADERS,
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify({ totp })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Groww Auth Failed: ${response.status} ${response.statusText}`, errorText);
                    throw new Error(`Failed to authenticate with Groww: ${response.statusText}`);
                }

                const data = await response.json();
                let token = data.access_token || data.token;

                if (!token && typeof data === 'string') {
                    token = data;
                }

                if (!token) throw new Error('No access token in response');

                this.accessToken = token;
                return token;

            } finally {
                // Clear the promise so future calls can retry if needed (or if token expires)
                // We might want to keep it if we want to cache the failure? No, retry is better.
                this.authPromise = null;
            }
        })();

        return this.authPromise;
    }

    /**
     * Fetches latest traded price for a symbol using tr_live_prices.
     * Robust endpoint that supports detailed stats and better symbol handling.
     */
    async getLTP(segment: string, underlying: string): Promise<any> {
        if (!this.accessToken) {
            await this.getAccessToken();
        }

        const cleanSymbol = encodeURIComponent(underlying);
        // Using the robust tr_live_prices endpoint (same as batch)
        const url = `https://groww.in/v1/api/stocks_data/v1/tr_live_prices/exchange/NSE/segment/CASH/${cleanSymbol}/latest`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...HEADERS,
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                // 404 means stock not found or invalid symbol
                if (response.status === 404) {
                    console.error(`Groww Quote Not Found: ${underlying}`);
                    throw new Error('Stock not found on NSE');
                }

                console.error(`Groww LTP Fetch Failed: ${response.status} ${response.statusText} - ${errorText}`);

                if (response.status === 401) {
                    console.log('Token expired, refreshing...');
                    await this.getAccessToken();
                    return this.getLTP(segment, underlying);
                }
                throw new Error(`Failed to fetch LTP: ${response.statusText}`);
            }

            return await response.json();
        } catch (e: any) {
            console.error(`LTP Fetch Exception for ${underlying}:`, e.message || e);
            throw e;
        }
    }

    /**
     * Fetches LTP for multiple symbols in batches.
     * Batch size: 3, Delay: 1000ms (Safe defaults)
     * Uses tr_live_prices endpoint for detailed data (LTP, Change, etc.)
     */
    async getBatchLTP(segment: string, symbols: string[], batchSize = 3, delayMs = 1000): Promise<Record<string, any>> {
        if (!this.accessToken) {
            try {
                await this.getAccessToken();
            } catch (authErr) {
                console.error("Auth failed in batch fetch, returning empty results.", authErr);
                return {};
            }
        }

        const results: Record<string, any> = {};

        // Helper for delay
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (let i = 0; i < symbols.length; i += batchSize) {
            const batch = symbols.slice(i, i + batchSize);

            console.log(`Fetching batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(symbols.length / batchSize)}: ${batch.join(', ')}`);

            const batchPromises = batch.map(async symbol => {
                try {
                    // Use tr_live_prices endpoint
                    const url = `https://groww.in/v1/api/stocks_data/v1/tr_live_prices/exchange/NSE/segment/CASH/${symbol}/latest`;
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            ...HEADERS,
                            'Authorization': `Bearer ${this.accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`Status ${response.status}`);
                    }

                    const data = await response.json();
                    return { symbol, data };
                } catch (err: any) {
                    console.error(`Failed to fetch ${symbol}:`, err.message || err);
                    return { symbol, data: null };
                }
            });

            // Wait for this batch to finish
            const batchResults = await Promise.all(batchPromises);

            batchResults.forEach(res => {
                if (res.data) {
                    // Map the response to our format
                    // Response usually has: ltp, dayChange, dayChangePerc
                    results[res.symbol] = {
                        ltp: res.data.ltp,
                        change: res.data.dayChange,
                        pChange: res.data.dayChangePerc,
                        // Add more fields if needed
                    };
                }
            });

            // Delay before next batch, ONLY if there are more batches
            if (i + batchSize < symbols.length) {
                await delay(delayMs);
            }
        }

        return results;
    }

    /**
     * Searches for stocks/entities.
     * Endpoint: /api/search/v1/entity?app=false&q=${query}
     */
    async search(query: string): Promise<any> {
        if (!this.accessToken) {
            await this.getAccessToken();
        }

        const encodedQuery = encodeURIComponent(query);
        const url = `https://groww.in/v1/api/search/v1/entity?app=false&q=${encodedQuery}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...HEADERS,
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`Groww Search Failed: ${response.status} ${response.statusText}`);
                if (response.status === 401) {
                    console.log('Token expired during search, refreshing...');
                    await this.getAccessToken();
                    return this.search(query);
                }
                return [];
            }

            const data = await response.json();
            return data;
        } catch (e: any) {
            console.error('Search Exception:', e.message || e);
            return [];
        }
    }

    /**
     * Fetches chart data for a symbol.
     * Uses Charting Service V2
     */
    async getChartData(underlying: string): Promise<any> {
        if (!this.accessToken) {
            await this.getAccessToken();
        }

        // Direct V2 endpoint using the symbol directly (e.g., RELIANCE)
        // Correct URL for full OHLC candles (without minimal=true)
        const url = `https://groww.in/v1/api/charting_service/v2/chart/exchange/NSE/segment/CASH/${underlying}/daily?intervalInMinutes=5`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...HEADERS,
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`Groww Chart Fetch Failed for ${underlying}: ${response.status} ${response.statusText}`);
                if (response.status === 401) {
                    await this.getAccessToken();
                    return this.getChartData(underlying);
                }
                return [];
            }

            const data = await response.json();
            return data;
        } catch (e: any) {
            console.error('Chart Data Fetch Exception:', e.message || e);
            return [];
        }
    }
    /**
     * Fetches company fundamentals (Market Cap, PE, etc.).
     * 1. Search for the symbol to get the unique search_id.
     * 2. Fetch company data using the search_id.
     */
    async getCompanyFundamentals(symbol: string): Promise<any> {
        if (!this.accessToken) {
            await this.getAccessToken();
        }

        try {
            // 1. Search for the stock to get the search_id
            // We need the exact match for the NSE script code
            const searchResults = await this.search(symbol);

            // Find the stock with matching nse_scrip_code or symbol
            const stock = searchResults.content.find((item: any) =>
                (item.nse_scrip_code === symbol.toUpperCase()) ||
                (item.search_id === symbol.toLowerCase())
            );

            if (!stock || !stock.search_id) {
                console.error(`Fundamentals: Stock not found for symbol ${symbol}`);
                return null;
            }

            const searchId = stock.search_id;

            // 2. Fetch company data
            const url = `https://groww.in/v1/api/stocks_data/v1/company/search_id/${searchId}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...HEADERS,
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`Fundamentals Fetch Failed: ${response.status} ${response.statusText}`);
                return null;
            }

            const data = await response.json();

            // Extract the stats object
            const stats = data.stats;

            if (!stats) return null;

            return {
                marketCap: stats.marketCap,
                peRatio: stats.peRatio,
                pbRatio: stats.pbRatio,
                roe: stats.roe,
                bookValue: stats.bookValue,
                divYield: stats.divYield || stats.dividendYieldInPercent
            };

        } catch (e: any) {
            console.error('Fundamentals Exception:', e.message || e);
            return null;
        }
    }
}


// Singleton Pattern for GrowwAPI
// This ensures we only create one instance and reuse the authentication token
const globalForGroww = global as unknown as { groww: GrowwAPI };

export const groww = globalForGroww.groww || new GrowwAPI({
    apiKey: process.env.GROWW_API_KEY || '',
    apiSecret: process.env.GROWW_TOTP_SECRET || '',
});

if (process.env.NODE_ENV !== 'production') globalForGroww.groww = groww;
