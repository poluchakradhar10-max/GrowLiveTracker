"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, Scan, Settings, LogOut, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const pathname = usePathname();

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const isActive = pathname === href;
    return (
      <Link href={href} className="w-full">
        <Button
          variant={isActive ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start gap-3",
            isCollapsed && "justify-center px-2",
            isActive && "bg-slate-800 text-white hover:bg-slate-700",
            !isActive && "text-slate-400 hover:text-white hover:bg-slate-800/50"
          )}
        >
          <Icon size={20} />
          {!isCollapsed && <span>{label}</span>}
        </Button>
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "relative hidden flex-col border-r border-slate-800 bg-slate-900 py-6 transition-all duration-300 md:flex",
        isCollapsed ? "w-16 items-center" : "w-64 px-4"
      )}
    >
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </Button>

      <div className={cn("flex items-center gap-3 pb-6", isCollapsed ? "justify-center px-0" : "px-2")}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 text-blue-500 ring-1 ring-blue-500/20">
          <Activity size={20} />
        </div>
        {!isCollapsed && (
          <span className="text-lg font-bold tracking-tight text-white">
            GrowLive
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        <NavItem href="/" icon={LayoutDashboard} label="Dashboard" />
        <NavItem href="/portfolio" icon={Wallet} label="Portfolio" />
        <NavItem href="/scanner" icon={Scan} label="Scanner" />
      </nav>

      <div className="flex flex-col gap-2 pt-4">
        <Separator className="bg-slate-800" />
        <div className="pt-2 flex flex-col gap-2">
          <NavItem href="/settings" icon={Settings} label="Settings" />
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-red-400 hover:bg-red-400/10 hover:text-red-300",
              isCollapsed && "justify-center px-2"
            )}
          >
            <LogOut size={20} />
            {!isCollapsed && <span>Logout</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
