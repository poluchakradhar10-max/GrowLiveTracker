'use client';

import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useEffect, useState } from 'react';

interface CandleData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

interface StockChartProps {
    data: CandleData[];
}

export default function StockChart({ data }: StockChartProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="h-[400px] w-full animate-pulse bg-muted/20" />;

    // Handle case where data might be the raw object with candles property
    const chartData = (data as any)?.candles ? (data as any).candles : data;

    if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
        return <div className="flex h-[400px] w-full items-center justify-center text-muted-foreground">No chart data available</div>;
    }

    // Use chartData for calculations
    const startPrice = chartData[0].close;
    const endPrice = chartData[chartData.length - 1].close;
    const isPositive = endPrice >= startPrice;
    const color = isPositive ? '#10B981' : '#EF4444'; // Green or Red

    return (
        <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="time"
                        tickFormatter={(tick) => {
                            const date = new Date(tick * 1000); // Groww uses seconds? Or milliseconds? Usually seconds in candles. Let's verify.
                            // Logic check: If year 1970, then it's wrong.
                            // Assuming seconds for now, if date looks wrong we fix it.
                            // Actually normally APIs return epochs.
                            return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                        }}
                        hide={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        minTickGap={30}
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        hide={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        tickFormatter={(value) => `₹${value}`}
                        width={60}
                    />
                    <Tooltip
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload as CandleData;
                                const date = new Date(d.time * 1000).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                });
                                return (
                                    <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
                                        <p className="mb-2 font-medium text-foreground">{date}</p>
                                        <div className="space-y-1 text-sm">
                                            <p className="flex justify-between gap-4">
                                                <span className="text-muted-foreground">Open:</span>
                                                <span className="font-mono">₹{d.open}</span>
                                            </p>
                                            <p className="flex justify-between gap-4">
                                                <span className="text-muted-foreground">High:</span>
                                                <span className="font-mono">₹{d.high}</span>
                                            </p>
                                            <p className="flex justify-between gap-4">
                                                <span className="text-muted-foreground">Low:</span>
                                                <span className="font-mono">₹{d.low}</span>
                                            </p>
                                            <p className="flex justify-between gap-4">
                                                <span className="text-muted-foreground">Close:</span>
                                                <span className="font-mono font-bold" style={{ color }}>₹{d.close}</span>
                                            </p>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="close"
                        stroke={color}
                        fillOpacity={1}
                        fill="url(#colorPrice)"
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
