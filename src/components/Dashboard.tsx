import React from 'react';
import { Pickaxe, FileText, BarChart3, Landmark, ArrowUpRight, Zap, Globe, Shield } from 'lucide-react';
import { MarketPreview } from './MarketPreview';
import { motion } from 'motion/react';
import { useUser } from '../context/UserContext';
import { formatNumber } from '../lib/utils';

export const Dashboard: React.FC = () => {
  const { appUser } = useUser();
  const quickActions = [
    { icon: Pickaxe, label: 'Nodes', desc: 'Secure the chain' },
    { icon: FileText, label: 'Lending', desc: 'Smart contracts' },
    { icon: BarChart3, label: 'Arbitrage', desc: 'AI liquidity' },
    { icon: Landmark, label: 'Treasury', desc: 'Protocol yield' },
  ];

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in duration-700">
      {/* Hero Section */}
      <section className="relative overflow-hidden glass-panel rounded-[40px] tech-grid p-8 md:p-12 border border-white/10">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-[10px] font-black text-brand uppercase tracking-widest">
              <Zap size={12} />
              <span>V4.2 Upgrade Live</span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.9]">
              Next-Gen <span className="cyan-active">Liquidity</span> <br/>
              Protocol
            </h2>
            
            <p className="text-text-muted text-sm md:text-lg leading-relaxed max-w-md">
              Securely manage your digital assets with institutional-grade technology and decentralized self-custody.
            </p>

            <div className="flex gap-4 pt-4">
              <button className="px-8 py-4 bg-brand text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all neon-glow">
                Launch Terminal
              </button>
              <button className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                Docs
              </button>
            </div>
          </div>

          {/* Interactive Stat Card */}
          <div className="w-full md:w-80 glass-panel rounded-3xl p-6 border border-white/5 bg-black/40 relative group overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Globe size={120} />
             </div>
             
             <div className="relative z-10 space-y-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Total Value Locked</p>
                  <p className="text-3xl font-black font-mono tracking-tighter">$14.2B</p>
                </div>

                <div className="space-y-1 pt-4 border-t border-white/5">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Trading Volume (24h)</p>
                  <div className="flex items-end gap-2">
                    <p className="text-2xl font-black font-mono tracking-tighter">$842.5M</p>
                    <span className="text-emerald-500 text-[10px] font-bold pb-1 flex items-center gap-0.5">
                      <ArrowUpRight size={10} /> 12.4%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full border border-bg-dark bg-brand/20 flex items-center justify-center text-[8px] font-bold">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-text-muted">+ 2.4k active nodes</p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Grid Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, i) => (
          <button key={i} className="group glass-panel rounded-3xl p-6 border border-white/5 hover:border-brand/30 hover:bg-brand/5 text-left transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 text-brand/20 group-hover:text-brand/40 transition-colors">
              <action.icon size={48} />
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-4">
              <action.icon size={20} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest mb-1">{action.label}</h3>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">{action.desc}</p>
          </button>
        ))}
      </section>

      {/* Market Activity Area */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-6 bg-brand rounded-full" />
              <h3 className="text-lg font-black tracking-tight italic">Live Terminal Feedback</h3>
            </div>
            <button className="text-[10px] font-bold text-brand uppercase tracking-widest hover:underline">View Full Orderbook</button>
          </div>
          <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
            <MarketPreview />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-6 bg-emerald-500 rounded-full" />
            <h3 className="text-lg font-black tracking-tight italic">Protocol Security</h3>
          </div>
          
          <div className="glass-panel rounded-3xl p-6 border border-white/5 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <Shield size={24} />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight">Audit Passed</p>
                <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">Certik Verified</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Health Factor</span>
                  <span className="text-[10px] font-bold text-emerald-500">EXCELLENT</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-[94%] bg-emerald-500 shadow-glow" />
                </div>
              </div>
              
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Collateral Ratio</span>
                  <span className="text-[10px] font-bold text-brand">142.5%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-[75%] bg-brand shadow-glow" />
                </div>
              </div>
            </div>

            <button className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-xs font-black uppercase tracking-widest transition-all">
              Security Portal
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
