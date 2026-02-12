'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SearchResult {
    id: string;
    title: string;
    symbol: string;
    nse_scrip_code: string;
    bse_scrip_code: string;
}

export default function SearchBar() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(async () => {
            if (query.trim().length >= 2) {
                setLoading(true);
                try {
                    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                    const json = await res.json();
                    console.log('Search Results:', json);

                    if (json.success) {
                        // API returns data.content as the array
                        const items = Array.isArray(json.data) ? json.data : (json.data?.content || []);
                        setResults(items);
                    } else {
                        setResults([]);
                    }
                } catch (error) {
                    console.error('Search failed', error);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (symbol: string) => {
        if (!symbol) return;
        setQuery('');
        setShowResults(false);
        router.push(`/stock/${symbol}`);
    };

    return (
        <div className="relative w-full max-w-md" ref={containerRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search stocks (e.g., TATA)..."
                    className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
            </div>

            {showResults && results.length > 0 && (
                <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md fade-in-0 zoom-in-95 data-[state=open]:animate-in">
                    <ul className="max-h-[300px] overflow-y-auto py-1">
                        {results.map((result) => (
                            <li key={result.id || result.symbol}>
                                <button
                                    onClick={() => handleSelect(result.nse_scrip_code || result.bse_scrip_code || result.symbol)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                >
                                    <div className="font-medium text-foreground">{result.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {result.nse_scrip_code ? `NSE: ${result.nse_scrip_code}` : ''}
                                        {result.nse_scrip_code && result.bse_scrip_code ? ' | ' : ''}
                                        {result.bse_scrip_code ? `BSE: ${result.bse_scrip_code}` : ''}
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {showResults && query.length >= 2 && !loading && results.length === 0 && (
                <div className="absolute top-full z-50 mt-2 w-full rounded-md border border-border bg-popover p-4 text-center text-sm text-muted-foreground shadow-md">
                    No results found.
                </div>
            )}
        </div>
    );
}
