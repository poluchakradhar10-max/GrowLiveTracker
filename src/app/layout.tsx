import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import SearchBar from '@/components/SearchBar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GrowLiveTracker - Professional Stock Analysis',
  description: 'Real-time stock tracking and portfolio management.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} flex h-screen overflow-hidden bg-slate-950 text-white antialiased`}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6 selection:bg-slate-800 selection:text-white">
          <div className="mb-8 flex items-center justify-between">
            <div className="w-full max-w-md">
              <SearchBar />
            </div>
          </div>
          {children}
        </main>
      </body>
    </html>
  );
}
