import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Activity, ChevronRight, Play } from 'lucide-react';
import { MINING_PLANS } from '../constants';
import { formatCurrency, formatNumber } from '../lib/utils';
import { motion } from 'motion/react';
import { useUser } from '../context/UserContext';
import { subscribeToActivePlans } from '../lib/firestoreService';
import { ActivePlan } from '../types';

export const MiningDashboard: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState(MINING_PLANS[0].id);
  const [activePlans, setActivePlans] = useState<ActivePlan[]>([]);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToActivePlans(user.uid, (data) => {
        setActivePlans(data as any[]);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const totalLocked = activePlans.reduce((acc, p) => acc + p.amount, 0);

  const [networkStats, setNetworkStats] = useState({
    hashrate: 85.3,
    stability: 99.9,
    uptime: 99.98,
    activeNodes: 1242
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setNetworkStats(prev => ({
        ...prev,
        hashrate: +(prev.hashrate + (Math.random() - 0.5) * 0.5).toFixed(1),
        stability: +(99.5 + Math.random() * 0.5).toFixed(2),
        activeNodes: Math.floor(1240 + Math.random() * 10)
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-6 pb-24 px-4 overflow-y-auto no-scrollbar h-[calc(100vh-160px)]">
      {/* Stats Cluster */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-3xl p-6 relative overflow-hidden"
      >
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-brand uppercase tracking-widest mb-1">Cloud Mining</p>
          <h2 className="text-4xl font-bold mb-1 tracking-tight text-green-400">
            {formatCurrency(totalLocked > 0 ? totalLocked : 0)}
          </h2>
          <div className="flex items-center gap-2 mb-6">
            <p className="text-[10px] text-text-dim">Total Locked (USDT)</p>
            <div className="px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-[8px] text-green-400 font-bold uppercase">
              {activePlans.length > 0 ? 'Active' : 'No Active Plans'}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center">
              <p className="text-[8px] text-text-dim uppercase font-bold mb-1">My Yield</p>
              <p className="text-xs font-bold text-brand">~12.5% APY</p>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center">
              <p className="text-[8px] text-text-dim uppercase font-bold mb-1">Status</p>
              <p className="text-xs font-bold text-green-400">Online</p>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center">
              <p className="text-[8px] text-text-dim uppercase font-bold mb-1">Efficiency</p>
              <p className="text-xs font-bold text-brand">98.2%</p>
            </div>
          </div>
        </div>
        {/* Visual fluff */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
      </motion.div>

      {/* Network Health Stats */}
      <div>
        <h3 className="text-xs font-bold tracking-wider uppercase mb-4 px-2">Network Health</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest">Total Hashrate</p>
            </div>
            <p className="text-xl font-bold tracking-tight">{networkStats.hashrate} <span className="text-[10px] text-text-dim uppercase">EH/s</span></p>
          </div>
          <div className="glass-card p-4 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={10} className="text-green-400" />
              <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest">Network Stability</p>
            </div>
            <p className="text-xl font-bold tracking-tight">{networkStats.stability}%</p>
          </div>
          <div className="glass-card p-4 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={10} className="text-yellow-400" />
              <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest">System Uptime</p>
            </div>
            <p className="text-xl font-bold tracking-tight">{networkStats.uptime}%</p>
          </div>
          <div className="glass-card p-4 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Cpu size={10} className="text-brand" />
              <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest">Active Nodes</p>
            </div>
            <p className="text-xl font-bold tracking-tight">{networkStats.activeNodes}</p>
          </div>
        </div>
      </div>

      {/* Plan Selection */}
      <div>
        <h3 className="text-xs font-bold tracking-wider uppercase mb-4 px-2">Start Mining (Lock Funds)</h3>
        <div className="flex flex-col gap-3">
          <div className="glass-card rounded-2xl overflow-hidden">
            <select 
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full bg-transparent p-4 text-xs font-bold text-brand outline-none appearance-none"
            >
              {MINING_PLANS.map(plan => (
                <option key={plan.id} value={plan.id} className="bg-bg-dark">{plan.name}</option>
              ))}
            </select>
          </div>

          <div className="glass-card rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center text-[10px] font-bold text-text-dim uppercase tracking-widest">
              <span>Investment Amount (USDT)</span>
              <span>Min. 50 USDT</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-xl p-3 border border-white/5">
              <input 
                type="number" 
                placeholder="Enter USDT amount" 
                className="bg-transparent text-sm font-bold flex-1 outline-none text-brand"
              />
              <span className="text-xs font-bold opacity-50 px-2 border-l border-white/10">USDT</span>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-text-dim">Est. Daily Profit</span>
                <span className="text-brand font-bold">0.00 USDT</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-text-dim">Total Profit</span>
                <span className="text-brand font-bold">0.00 USDT</span>
              </div>
            </div>

            <button className="w-full py-4 bg-brand text-bg-dark rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <Play size={14} fill="currentColor" />
              Start Mining
            </button>
          </div>
        </div>
      </div>

      {/* Active Plans */}
      <div className="mb-4">
        <h3 className="text-xs font-bold tracking-wider uppercase mb-4 px-2">Active Plans</h3>
        <div className="flex flex-col gap-3">
          {activePlans.length > 0 ? activePlans.map(plan => {
            const planDetails = MINING_PLANS.find(p => p.id === plan.planId);
            return (
              <div key={plan.id} className="p-4 glass-card rounded-2xl border border-green-500/20 bg-green-500/5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-text-dim mb-1">{planDetails?.name || 'Unknown Plan'}</p>
                    <p className="text-[8px] text-text-dim">Ends: {new Date(plan.endsAt).toLocaleString()}</p>
                  </div>
                  <p className="text-xs font-bold text-green-400">{formatCurrency(plan.amount)}</p>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-green-500 h-full w-[15%]" />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[8px] font-bold text-green-400 uppercase tracking-widest">{plan.status}</span>
                  <span className="text-[10px] text-text-dim">Mining in progress...</span>
                </div>
              </div>
            );
          }) : (
            <div className="p-8 glass-card rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center opacity-50">
               <Cpu size={24} className="mb-2 text-text-dim" />
               <p className="text-[10px] font-bold uppercase tracking-widest">No Active Plans</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
