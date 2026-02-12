'use client';

import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { useEffect, useState } from 'react';

interface MarketData {
    symbol: string;
    ltp: number;
    change: number;
    pChange: number;
    trend: string;
}

interface MarketHeatmapProps {
    data: MarketData[];
}

const COLORS = {
    positive: '#10B981', // Green
    negative: '#EF4444', // Red
    neutral: '#6B7280',  // Gray
};

const CustomizedContent = (props: any) => {
    const { root, depth, x, y, width, height, index, payload, name, value, change } = props;

    // Safely access change from various possible locations in props
    // Recharts Treemap structure can vary
    const safeChange = change ?? payload?.change ?? root?.change ?? 0;

    // We only want to render leaf nodes
    const isPositive = safeChange > 0;
    const isNegative = safeChange < 0;
    const color = isPositive ? COLORS.positive : isNegative ? COLORS.negative : COLORS.neutral;

    // Formatting
    const showLabel = width > 50 && height > 40;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: color,
                    stroke: '#fff',
                    strokeWidth: 2 / (depth + 1e-10),
                    strokeOpacity: 1 / (depth + 1e-10),
                }}
            />
            {showLabel && (
                <>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 - 6}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={12}
                        fontWeight="bold"
                    >
                        {name}
                    </text>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 + 10}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={10}
                    >
                        {safeChange.toFixed(2)}%
                    </text>
                </>
            )}
        </g>
    );
};

export default function MarketHeatmap({ data }: MarketHeatmapProps) {
    // Transform data for Treemap
    const treeData = [
        {
            name: 'NIFTY 50',
            children: data
                .filter(d => d.symbol !== 'NIFTY 50')
                .map(d => ({
                    name: d.symbol,
                    size: d.ltp,
                    change: d.pChange,
                    value: d.ltp
                }))
        }
    ];

    // Fix for Recharts ResponsiveContainer 0 width/height issue
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="h-[400px] w-full rounded-xl border border-border bg-card p-4 shadow-sm flex items-center justify-center text-muted-foreground">Loading Heatmap...</div>;

    return (
        <div className="h-[400px] w-full rounded-xl border border-border bg-card p-4 shadow-sm" style={{ minHeight: '400px' }}>
            <h3 className="mb-4 font-semibold text-card-foreground">Market Heatmap (NIFTY 50 Constituents)</h3>
            <div style={{ width: '100%', height: 'calc(100% - 2rem)' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        data={treeData}
                        dataKey="size"
                        stroke="#fff"
                        fill="#8884d8"
                        content={<CustomizedContent />}
                    >
                        <Tooltip
                            formatter={(value: any, name: any, props: any) => {
                                // Format tooltip
                                const item = props.payload;
                                return [`₹${value}`, `${item.change}%`];
                            }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="rounded border border-border bg-background p-2 shadow-md">
                                            <p className="font-bold">{data.name}</p>
                                            <p>Price: ₹{data.value.toLocaleString('en-IN')}</p>
                                            <p className={data.change >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                Change: {data.change}%
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                    </Treemap>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
