import React from 'react';
import { User, ShieldCheck, Wallet, Bell, Globe, Languages, LogOut, ChevronRight, Moon } from 'lucide-react';
import { motion } from 'motion/react';
import { formatNumber, cn } from '../lib/utils';
import { useUser } from '../context/UserContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { subscribeToUserTrades } from '../lib/firestoreService';

export const AccountProfile: React.FC = () => {
  const { user, appUser } = useUser();
  const [stats, setStats] = React.useState({
    totalTrades: 0,
    winRate: 0,
    totalProfit: 0,
    bestTrade: 0
  });

  React.useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToUserTrades(user.uid, (trades) => {
        const completed = trades.filter(t => t.status !== 'pending');
        const wins = completed.filter(t => t.status === 'won');
        const profits = completed.map(t => t.profit || 0);
        
        setStats({
          totalTrades: completed.length,
          winRate: completed.length > 0 ? Math.round((wins.length / completed.length) * 100) : 0,
          totalProfit: profits.reduce((a, b) => a + b, 0),
          bestTrade: profits.length > 0 ? Math.max(...profits) : 0
        });
      });
      return () => unsubscribe();
    }
  }, [user]);
  
  const menuItems = [
    { icon: ShieldCheck, label: 'Security', sub: 'Change new password', color: 'text-brand' },
    { icon: Wallet, label: 'Wallet & Payments', sub: 'Deposit, withdraw, history', color: 'text-brand' },
    { 
      icon: ShieldCheck, 
      label: 'Admin Panel', 
      sub: 'Manage platform', 
      color: 'text-blue-500', 
      onClick: () => window.dispatchEvent(new CustomEvent('show-admin')),
      hidden: appUser?.role !== 'admin'
    },
    { icon: Bell, label: 'Notifications', sub: 'Price alerts, trade confirms', color: 'text-brand', hasToggle: true },
    { icon: Globe, label: 'Help & Support', sub: 'FAQ, live chat', color: 'text-brand' },
  ];

  if (!appUser) return null;

  return (
    <div className="flex flex-col gap-6 pb-24 px-4 overflow-y-auto no-scrollbar h-[calc(100vh-160px)]">
      {/* Profile Header */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 rounded-3xl"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl bg-brand/10 border border-brand/30 flex items-center justify-center text-3xl font-black text-brand overflow-hidden">
                {appUser.displayName?.slice(0, 2).toUpperCase() || 'TR'}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-bg-dark rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{appUser.displayName}</h2>
              <div className="px-1.5 py-0.5 rounded bg-brand/10 border border-brand/20 text-[8px] text-brand font-bold uppercase">
                {appUser.role === 'admin' ? 'Administrator' : `Level ${appUser.level}`}
              </div>
            </div>
            <p className="text-[10px] text-text-dim uppercase tracking-widest font-bold">UID: {appUser.id}</p>
            <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-brand">
              <ShieldCheck size={12} />
              <span>{appUser.kycVerified ? 'KYC Verified' : 'KYC Pending'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col items-center p-3 bg-white/5 rounded-2xl">
            <p className="text-[8px] text-text-dim uppercase font-bold text-center">Total Profit</p>
            <p className="text-sm font-black text-brand mt-1">${formatNumber(stats.totalProfit, 2)}</p>
          </div>
          <div className="flex flex-col items-center p-3 bg-white/5 rounded-2xl">
            <p className="text-[8px] text-text-dim uppercase font-bold text-center">Best Trade</p>
            <p className="text-sm font-black text-green-400 mt-1">${formatNumber(stats.bestTrade, 2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center p-3 bg-white/5 rounded-2xl">
            <p className="text-[8px] text-text-dim uppercase font-bold text-center">Total Trades</p>
            <p className="text-sm font-black text-brand mt-1">{stats.totalTrades}</p>
          </div>
          <div className="flex flex-col items-center p-3 bg-white/5 rounded-2xl">
            <p className="text-[8px] text-text-dim uppercase font-bold text-center">Win Rate</p>
            <p className="text-sm font-black text-brand mt-1">{stats.winRate}%</p>
          </div>
        </div>
      </motion.div>

      {/* Settings Menu */}
      <div className="flex flex-col gap-2">
        {menuItems.filter(i => !i.hidden).map((item, index) => (
          <motion.div 
            key={index}
            whileTap={{ scale: 0.98 }}
            onClick={item.onClick}
            className="flex items-center justify-between p-4 glass-card rounded-2xl cursor-pointer hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={cn("p-2 rounded-xl bg-white/5", item.color)}>
                <item.icon size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold">{item.label}</h4>
                <p className="text-[9px] text-text-dim">{item.sub}</p>
              </div>
            </div>
            {item.hasToggle ? (
              <div className="w-10 h-5 rounded-full bg-brand p-1 flex justify-end">
                <div className="w-3 h-3 bg-bg-dark rounded-full" />
              </div>
            ) : (
              <ChevronRight size={16} className="text-text-dim" />
            )}
          </motion.div>
        ))}

        <div className="p-4 glass-card rounded-2xl flex items-center justify-between mt-2">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-xl bg-white/5 text-text-dim">
              <Moon size={20} />
            </div>
            <h4 className="text-xs font-bold">Dark Mode</h4>
          </div>
          <div className="w-10 h-5 rounded-full bg-brand p-1 flex justify-end">
             <div className="w-3 h-3 bg-bg-dark rounded-full" />
          </div>
        </div>

        <button 
          onClick={() => signOut(auth)}
          className="w-full mt-4 py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all uppercase tracking-[0.2em]"
        >
          <LogOut size={16} />
          Log Out
        </button>
      </div>
    </div>
  );
};
