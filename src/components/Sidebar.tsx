import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  Activity, 
  Settings, 
  User, 
  ExternalLink,
  ShieldCheck,
  Power
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useUser } from '../context/UserContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { ethers } from 'ethers';
import { toast } from 'sonner';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { appUser } = useUser();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setWalletAddress(accounts[0]);
        toast.success("Wallet connected!");
      } catch (error) {
        toast.error("Failed to connect wallet");
      }
    } else {
      toast.error("MetaMask or other wallet not detected");
    }
  };

  const navItems = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assets', label: 'Portfolio', icon: Wallet },
    { id: 'trade', label: 'Terminal', icon: Activity },
  ];

  return (
    <div className="w-64 flex-shrink-0 flex flex-col glass-panel border-r border-border-dark tech-grid hidden md:flex">
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center neon-glow">
            <span className="text-xl font-black text-brand tracking-tighter">NX</span>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">NexoContract</h1>
            <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] mt-1">Web3 Terminal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all group",
              activeTab === item.id 
                ? "bg-brand/10 text-brand border border-brand/20 neon-glow" 
                : "text-text-muted hover:bg-white/5 hover:text-white"
            )}
          >
            <item.icon size={18} className={cn(activeTab === item.id ? "text-brand" : "text-text-muted group-hover:text-white")} />
            {item.label}
          </button>
        ))}

        {appUser?.role === 'admin' && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('show-admin'))}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-blue-400 hover:bg-blue-400/5 transition-all"
          >
            <ShieldCheck size={18} />
            Admin Panel
          </button>
        )}
      </nav>

      <div className="p-4 space-y-4">
        {/* Wallet Connection */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Web3 Identity</p>
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", walletAddress ? "bg-green-500" : "bg-red-500")} />
          </div>
          
          {walletAddress ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/5">
              <div className="w-2 h-2 rounded-full bg-brand" />
              <p className="text-[10px] font-mono text-brand truncate">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
            </div>
          ) : (
            <button 
              onClick={connectWallet}
              className="w-full py-2.5 bg-brand text-bg-dark rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg neon-glow active:scale-95 transition-all"
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-sm font-black text-white">
            {appUser?.displayName?.slice(0, 1).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black truncate">{appUser?.displayName}</p>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Level {appUser?.level || 1}</p>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="p-2 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
          >
            <Power size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
