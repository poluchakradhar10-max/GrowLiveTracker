'use client';

import { use, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import StockChart from '@/components/StockChart';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface StockData {
    symbol: string;
    ltp: number;
    change: number;
    pChange: number;
    trend: string;
}

interface Fundamentals {
    marketCap: number;
    peRatio: number;
    pbRatio: number;
    roe: number;
    bookValue: number;
    divYield: number;
}

interface CandleData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

export default function StockPage({ params }: { params: Promise<{ symbol: string }> }) {
    const resolvedParams = use(params);
    const symbol = resolvedParams.symbol;

    const [data, setData] = useState<StockData | null>(null);
    const [history, setHistory] = useState<CandleData[]>([]);
    const [fundamentals, setFundamentals] = useState<Fundamentals | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Visual effects state
    const [flash, setFlash] = useState<'green' | 'red' | null>(null);
    const prevLtpRef = useRef<number | null>(null);

    // Initial Fetch
    useEffect(() => {
        async function fetchInitialData() {
            try {
                setLoading(true);
                // Parallel fetch for quote, history, and fundamentals
                const [quoteRes, historyRes, fundRes] = await Promise.all([
                    fetch(`/api/quote?symbol=${symbol}`),
                    fetch(`/api/market/history?symbol=${symbol}`),
                    fetch(`/api/stock/fundamentals?symbol=${symbol}`)
                ]);

                if (!quoteRes.ok) throw new Error('Failed to fetch quote');
                const quoteJson = await quoteRes.json();

                if (quoteJson.success) {
                    setData(quoteJson.data);
                    prevLtpRef.current = quoteJson.data.ltp;
                } else {
                    setError(quoteJson.error || 'Unknown error fetching quote');
                }

                if (historyRes.ok) {
                    const historyJson = await historyRes.json();
                    if (historyJson.success) {
                        setHistory(historyJson.data);
                    }
                }

                if (fundRes.ok) {
                    const fundJson = await fundRes.json();
                    if (fundJson.success) {
                        setFundamentals(fundJson.data);
                    }
                }

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        if (symbol) {
            fetchInitialData();
        }
    }, [symbol]);

    // Polling Interval (1 second) - Only polls quote
    useEffect(() => {
        if (!symbol) return;

        const intervalId = setInterval(async () => {
            // Safety check: Only poll if tab is visible
            if (document.visibilityState === 'hidden') return;

            try {
                const res = await fetch(`/api/quote?symbol=${symbol}`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.success) {
                        const newData = json.data;

                        // Flash Logic
                        if (prevLtpRef.current !== null) {
                            if (newData.ltp > prevLtpRef.current) {
                                setFlash('green');
                                setTimeout(() => setFlash(null), 500);
                            } else if (newData.ltp < prevLtpRef.current) {
                                setFlash('red');
                                setTimeout(() => setFlash(null), 500);
                            }
                        }

                        prevLtpRef.current = newData.ltp;
                        setData(newData);
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }, [symbol]);

    if (loading) return <div className="flex h-full items-center justify-center text-slate-400">Initializing Terminal...</div>;
    if (error) return <div className="flex h-full items-center justify-center text-red-500">Error: {error}</div>;
    if (!data) return <div className="flex h-full items-center justify-center text-slate-400">Stock not found</div>;

    // Derive stats from latest history candle if available
    const lastCandle = history.length > 0 ? history[history.length - 1] : null;

    // Helper to format Market Cap
    const formatMarketCap = (cap: number) => {
        if (!cap) return '--';
        return `₹${(cap / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 })}Cr`;
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Breadcrumb / Back */}
            <Link href="/" className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl font-bold tracking-tight text-white">{data.symbol}</h1>
                        <Badge variant="outline" className="border-slate-700 bg-slate-900 text-slate-400 gap-1">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            NSE
                        </Badge>
                    </div>
                    <p className="text-slate-400 mt-1">Equity • Cash Segment</p>
                </div>

                <div className="flex flex-col items-start md:items-end">
                    <div className="flex items-center gap-3">
                        {/* Live Indicator */}
                        <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-500 border border-red-500/20">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            LIVE MARKET
                        </div>
                    </div>

                    <div className="flex items-baseline gap-4 mt-2">
                        <span className={`text-4xl font-bold transition-colors duration-300 ${flash === 'green' ? 'text-green-400' : flash === 'red' ? 'text-red-400' : 'text-white'
                            }`}>
                            {data.ltp.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        </span>
                        <div className={`flex items-center text-lg font-medium ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {data.change >= 0 ? <ArrowUpRight className="mr-1 h-5 w-5" /> : <ArrowDownRight className="mr-1 h-5 w-5" />}
                            {data.change > 0 ? '+' : ''}{data.change.toFixed(2)} ({data.pChange.toFixed(2)}%)
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="chart" className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:w-[400px] bg-slate-900 border border-slate-800">
                    <TabsTrigger value="chart">Chart</TabsTrigger>
                    <TabsTrigger value="financials">Financials</TabsTrigger>
                    <TabsTrigger value="news">News</TabsTrigger>
                </TabsList>

                {/* Tab: Chart */}
                <TabsContent value="chart" className="mt-6 flex flex-col gap-6">
                    <div className="grid gap-6 md:grid-cols-12">
                        {/* Chart Card */}
                        <div className="col-span-12 md:col-span-9">
                            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm h-[500px]">
                                <CardHeader className="border-b border-slate-800 py-4">
                                    <CardTitle className="text-white">Price Action</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 h-full">
                                    <div className="h-[400px] w-full">
                                        <StockChart data={history} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* OHLC Stats Card */}
                        <div className="col-span-12 md:col-span-3">
                            <Card className="h-full border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                                <CardHeader className="border-b border-slate-800 py-4">
                                    <CardTitle className="text-white">Session Stats</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">
                                    <div className="space-y-1">
                                        <p className="text-sm text-slate-400">Open</p>
                                        <p className="text-xl font-medium text-white">{lastCandle ? `₹${lastCandle.open}` : '--'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-slate-400">High</p>
                                        <p className="text-xl font-medium text-green-400">{lastCandle ? `₹${lastCandle.high}` : '--'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-slate-400">Low</p>
                                        <p className="text-xl font-medium text-red-400">{lastCandle ? `₹${lastCandle.low}` : '--'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-slate-400">Close</p>
                                        <p className="text-xl font-medium text-white">{lastCandle ? `₹${lastCandle.close}` : '--'}</p>
                                    </div>
                                    <Separator className="bg-slate-800" />
                                    <div className="space-y-1">
                                        <p className="text-sm text-slate-400">Volume</p>
                                        <p className="text-lg font-medium text-white">--</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* Tab: Financials */}
                <TabsContent value="financials" className="mt-6">
                    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                        <CardHeader className="border-b border-slate-800 py-4">
                            <CardTitle className="text-white">Company Fundamentals</CardTitle>
                            <CardDescription className="text-slate-400">Key Valuation Metrics</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {fundamentals ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">Market Cap</p>
                                        <p className="text-2xl font-semibold text-white">{formatMarketCap(fundamentals.marketCap)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">P/E Ratio</p>
                                        <p className="text-2xl font-semibold text-white">{fundamentals.peRatio?.toFixed(2) || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">P/B Ratio</p>
                                        <p className="text-2xl font-semibold text-white">{fundamentals.pbRatio?.toFixed(2) || '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">ROE</p>
                                        <p className="text-2xl font-semibold text-white">{fundamentals.roe?.toFixed(2)}%</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">Book Value</p>
                                        <p className="text-2xl font-semibold text-white">₹{fundamentals.bookValue?.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">Div. Yield</p>
                                        <p className="text-2xl font-semibold text-white">{fundamentals.divYield?.toFixed(2)}%</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-40 items-center justify-center text-slate-500">
                                    No fundamental data available.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: News */}
                <TabsContent value="news" className="mt-6">
                    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                        <CardContent className="flex flex-col items-center justify-center py-20">
                            <Activity className="h-10 w-10 text-slate-600 mb-4" />
                            <p className="text-slate-400">Latest news stream coming soon.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
