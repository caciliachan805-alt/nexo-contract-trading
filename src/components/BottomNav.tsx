import React from 'react';
import { Home, ArrowLeftRight, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';

export type Tab = 'home' | 'assets' | 'trade';

interface BottomNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-10 pb-8 pt-3 flex justify-between items-center z-[60]">
      <button
        onClick={() => setActiveTab('home')}
        className={cn(
          "flex flex-col items-center gap-1 transition-all",
          activeTab === 'home' ? "text-slate-900" : "text-slate-400"
        )}
      >
        <Home size={26} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
        <span className="text-[12px] font-bold">Home</span>
      </button>

      <button
        onClick={() => setActiveTab('trade')}
        className="relative -top-8 w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
      >
        <ArrowLeftRight size={28} strokeWidth={2.5} />
      </button>

      <button
        onClick={() => setActiveTab('assets')}
        className={cn(
          "flex flex-col items-center gap-1 transition-all",
          activeTab === 'assets' ? "text-slate-900" : "text-slate-400"
        )}
      >
        <Wallet size={26} strokeWidth={activeTab === 'assets' ? 2.5 : 2} />
        <span className="text-[12px] font-bold">Assets</span>
      </button>
    </div>
  );
};
