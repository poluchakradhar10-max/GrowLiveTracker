'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import StockChart from '@/components/StockChart';
import MarketHeatmap from '@/components/MarketHeatmap';

interface MarketItem {
  symbol: string;
  ltp: number;
  change: number;
  pChange: number;
  trend: string;
}

export default function Home() {
  const [niftyHistory, setNiftyHistory] = useState<any[]>([]);
  const [marketData, setMarketData] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function fetchData() {
    setLoading(true);
    setStatus('loading');
    try {
      const [niftyRes, marketRes] = await Promise.all([
        fetch('/api/market/history?symbol=NIFTY'),
        fetch('/api/market')
      ]);

      if (niftyRes.ok) {
        const json = await niftyRes.json();
        if (json.success) setNiftyHistory(json.data);
      }

      if (marketRes.ok) {
        const json = await marketRes.json();
        if (json.success) setMarketData(json.data);
      }
      setStatus('success');
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Auto-fetch disabled to prevent rate limits
    // fetchData(); 
  }, []);

  // Prepare Heatmap Data
  const heatmapData = marketData.filter(d => d.symbol !== 'NIFTY 50');

  // Prepare Watchlist (Top 5 Active)
  const watchlist = marketData.filter(d => d.symbol !== 'NIFTY 50').slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Market Dashboard</h1>
          <p className="text-slate-400">Real-time overview of the Indian Markets.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              disabled={status === 'loading'}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Fetching...' : 'Fetch Data'}
            </button>
            <Badge variant="outline" className="border-slate-700 bg-slate-900 text-slate-400 h-9 px-3 flex items-center">
              Market Status: Open
            </Badge>
          </div>
          <span className="text-xs text-slate-500">
            Status: <span className={
              status === 'success' ? 'text-green-500' :
                status === 'error' ? 'text-red-500' :
                  status === 'loading' ? 'text-blue-500' : 'text-slate-400'
            }>{status.toUpperCase()}</span>
            {status === 'idle' && ' (Click to Fetch)'}
          </span>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Section A: Market Overview (Chart) - Span 8 */}
        <div className="col-span-12 md:col-span-8">
          <Card className="h-full border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-800 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">NIFTY 50</CardTitle>
                  <CardDescription className="text-slate-400">Index Performance</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[350px] w-full">
                {status === 'loading' || (status === 'idle' && niftyHistory.length === 0) ? (
                  <Skeleton className="h-full w-full rounded-xl bg-slate-800" />
                ) : (
                  <StockChart data={niftyHistory} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section B: Watchlist - Span 4 */}
        <div className="col-span-12 md:col-span-4">
          <Card className="h-full border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-800 py-4">
              <CardTitle className="text-white">Watchlist</CardTitle>
              <CardDescription className="text-slate-400">Key Movers</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-slate-900/50">
                    <TableHead className="text-slate-400">Symbol</TableHead>
                    <TableHead className="text-right text-slate-400">Price</TableHead>
                    <TableHead className="text-right text-slate-400">Chg%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {status === 'loading' || (status === 'idle' && watchlist.length === 0) ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i} className="border-slate-800">
                        <TableCell><Skeleton className="h-4 w-20 bg-slate-800" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16 bg-slate-800 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12 bg-slate-800 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    watchlist.map((stock) => {
                      const isPositive = stock.pChange >= 0;
                      return (
                        <TableRow key={stock.symbol} className="border-slate-800 hover:bg-slate-800/50">
                          <TableCell className="font-medium text-slate-200">
                            <Link href={`/stock/${stock.symbol}`} className="hover:underline hover:text-blue-400 transition-colors">
                              {stock.symbol}
                            </Link>
                          </TableCell>
                          <TableCell className="text-right text-slate-300">
                            ₹{stock.ltp?.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className={`border-0 ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                              {isPositive ? '+' : ''}{stock.pChange?.toFixed(2)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Section C: Market Heatmap - Span 12 */}
        <div className="col-span-12">
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-white/5 border-b border-slate-800 py-4 backdrop-blur-md">
              <CardTitle className="text-white flex items-center gap-2">
                <span>🔥</span> Market Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[500px] w-full rounded-xl border border-slate-800 bg-slate-950/50">
                {status === 'loading' || (status === 'idle' && heatmapData.length === 0) ? (
                  <Skeleton className="h-full w-full rounded-xl bg-slate-800" />
                ) : (
                  <MarketHeatmap data={heatmapData} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
