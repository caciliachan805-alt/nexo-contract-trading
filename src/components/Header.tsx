import React, { useState } from 'react';
import { Bell, Headphones, UserCircle, Menu, X, ShieldCheck, Activity, Wifi, Cpu } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const Header: React.FC = () => {
  const { appUser } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  return (
    <>
    <header className="flex justify-between items-center px-4 md:px-8 py-4 bg-bg-dark/50 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
      <div className="flex items-center gap-6">
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="md:hidden w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-text-muted hover:text-white transition-all active:scale-90"
        >
          <Menu size={24} />
        </button>

        {/* System Stats - Desktop Only */}
        <div className="hidden md:flex items-center gap-6 text-[10px] font-mono text-text-muted uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-brand" />
            <span>Network: <span className="text-brand">Mainnet</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Wifi size={12} className="text-emerald-500" />
            <span>Latency: <span className="text-emerald-500">24ms</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu size={12} className="text-orange-500" />
            <span>Node: <span className="text-orange-500">v4.0.2</span></span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 mr-4">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">System Operational</span>
        </div>
        
        <button className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-text-muted hover:text-white transition-all">
          <Headphones size={18} />
        </button>
        <button className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-text-muted hover:text-white transition-all relative">
          <Bell size={18} />
          <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-brand rounded-full border border-bg-dark neon-glow" />
        </button>
      </div>
    </header>

    <AnimatePresence>
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute top-0 left-0 bottom-0 w-[80%] max-w-sm glass-panel flex flex-col p-6 tech-grid"
          >
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center font-black text-bg-dark text-xs">NX</div>
                <h1 className="text-lg font-black tracking-tight">NexoContract</h1>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="text-text-muted"><X size={24} /></button>
            </div>
            
            <div className="flex items-center gap-4 mb-8 p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center text-brand font-black text-xl border border-brand/20">
                {appUser?.displayName?.[0] || 'U'}
              </div>
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">Authenticated</p>
                <p className="text-sm font-black truncate">{appUser?.displayName}</p>
              </div>
            </div>

            <div className="space-y-1">
              {[
                { icon: ShieldCheck, label: 'Verification' },
                { icon: Activity, label: 'Statistics' },
                { icon: Headphones, label: 'Support' },
                { icon: Bell, label: 'Terminal Alerts' },
              ].map((item, i) => (
                <button key={i} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 text-text-muted hover:text-white transition-all text-sm font-bold active:scale-95">
                  <item.icon size={20} className="text-brand/60" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-auto pt-8 border-t border-white/5 text-[10px] font-mono text-text-muted uppercase tracking-widest text-center">
              Version 4.2.0-stable
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
};
