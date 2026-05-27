import React, { useState, useEffect, useMemo } from 'react';
import { CreditCard, ArrowDownToLine, RefreshCw, ChevronRight, Bell, History, ArrowUpRight, Repeat, Cpu, Send, Download, Replace, Wallet, ArrowDownRight, ArrowUp, ArrowDown, Shield, Settings, Lock, X } from 'lucide-react';
import { formatCurrency, formatNumber, cn } from '../lib/utils';
import { useMarket } from '../context/MarketContext';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationModal } from './NotificationModal';
import { DepositModal } from './DepositModal';
import { WithdrawModal } from './WithdrawModal';
import { useUser } from '../context/UserContext';
import { subscribeToTransactions, subscribeToDeposits, updateUserDetails } from '../lib/firestoreService';
import { Transaction } from '../types';
import { toast } from 'sonner';

export const AssetDashboard: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deposits, setDeposits] = useState<Transaction[]>([]);
  const [sortConfig, setSortConfig] = useState<{ field: 'date' | 'amount', direction: 'asc' | 'desc' }>({ 
    field: 'date', 
    direction: 'desc' 
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const { appUser, user } = useUser();
  const { assets } = useMarket();
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [faStep, setFaStep] = useState(1);
  const [faCode, setFaCode] = useState('');
  
  const [localLimits, setLocalLimits] = useState({
    withdrawalLimitDaily: appUser?.withdrawalLimitDaily || 5000,
    withdrawalLimitMonthly: appUser?.withdrawalLimitMonthly || 50000,
    twoFactorThreshold: appUser?.twoFactorThreshold || 1000,
    twoFactorEnabled: appUser?.twoFactorEnabled || false
  });

  useEffect(() => {
    if (appUser) {
      setLocalLimits({
        withdrawalLimitDaily: appUser.withdrawalLimitDaily || 5000,
        withdrawalLimitMonthly: appUser.withdrawalLimitMonthly || 50000,
        twoFactorThreshold: appUser.twoFactorThreshold || 1000,
        twoFactorEnabled: appUser.twoFactorEnabled || false
      });
    }
  }, [appUser]);

  const hasChanges = useMemo(() => {
    if (!appUser) return false;
    return (
      localLimits.withdrawalLimitDaily !== (appUser.withdrawalLimitDaily || 5000) ||
      localLimits.withdrawalLimitMonthly !== (appUser.withdrawalLimitMonthly || 50000) ||
      localLimits.twoFactorThreshold !== (appUser.twoFactorThreshold || 1000) ||
      localLimits.twoFactorEnabled !== (appUser.twoFactorEnabled || false)
    );
  }, [localLimits, appUser]);

  const handleUpdateLimits = async () => {
    if (!user) return;
    try {
      await updateUserDetails(user.uid, localLimits);
      toast.success("Security limits updated successfully");
    } catch (error) {
      toast.error("Failed to update security limits");
    }
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1500);
  };

  const livePortfolioValue = useMemo(() => {
    const assetsValue = assets.reduce((acc, curr) => acc + curr.value, 0);
    return assetsValue + (appUser?.availableBalance || 0);
  }, [assets, appUser?.availableBalance]);

  useEffect(() => {
    if (user) {
      const unsubTransactions = subscribeToTransactions(user.uid, (data) => {
        const sorted = (data as Transaction[]).sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setTransactions(sorted);
      });

      const unsubDeposits = subscribeToDeposits(user.uid, (data) => {
        setDeposits(data as Transaction[]);
      });

      return () => {
        unsubTransactions();
        unsubDeposits();
      };
    }
  }, [user]);

  const sortedDeposits = useMemo(() => {
    return [...deposits].sort((a, b) => {
      const direction = sortConfig.direction === 'desc' ? -1 : 1;
      if (sortConfig.field === 'date') {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return (dateA - dateB) * direction;
      } else {
        const amountA = a.amountTo || 0;
        const amountB = b.amountTo || 0;
        return (amountA - amountB) * direction;
      }
    });
  }, [deposits, sortConfig]);

  const getAssetIcon = (symbol: string) => {
    const asset = assets.find(a => a.symbol === symbol || a.id === symbol);
    return asset?.icon || null;
  };

  if (!appUser) return null;

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <NotificationModal isOpen={showModal} onClose={() => setShowModal(false)} />
      <DepositModal isOpen={showDeposit} onClose={() => setShowDeposit(false)} />
      <WithdrawModal isOpen={showWithdraw} onClose={() => setShowWithdraw(false)} />

      {/* 2FA Setup Modal (Mock) */}
      <AnimatePresence>
        {show2FASetup && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShow2FASetup(false)}
              className="absolute inset-0 bg-bg-dark/90 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm glass-panel p-8 rounded-[40px] border border-white/10 relative z-10 tech-grid"
            >
              <button 
                onClick={() => setShow2FASetup(false)}
                className="absolute top-6 right-6 p-2 text-text-muted hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center text-brand border border-brand/20">
                  <Shield size={40} />
                </div>
                
                {faStep === 1 ? (
                  <>
                    <div className="space-y-2">
                      <h4 className="text-xl font-black italic">MFA Integration</h4>
                      <p className="text-xs text-text-muted font-bold uppercase tracking-widest leading-relaxed">
                        Scan the protocol key with your authenticator app
                      </p>
                    </div>
                    <div className="w-48 h-48 bg-white p-4 rounded-3xl shadow-2xl">
                      <img 
                        src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=NEXO_PROTOCOL_DEMO" 
                        alt="QR Code" 
                        className="w-full h-full"
                      />
                    </div>
                    <div className="p-3 bg-bg-dark/40 border border-white/10 rounded-xl w-full">
                      <code className="text-[10px] font-mono text-brand">NEXO-A7X-99P-QRX</code>
                    </div>
                    <button 
                      onClick={() => setFaStep(2)}
                      className="w-full py-4 bg-brand text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg"
                    >
                      Protocols Syced
                    </button>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <h4 className="text-xl font-black italic">Verification</h4>
                      <p className="text-xs text-text-muted font-bold uppercase tracking-widest">
                        Enter the generated 6-digit sequence
                      </p>
                    </div>
                    <input 
                      type="text" 
                      maxLength={6}
                      placeholder="000000"
                      value={faCode}
                      onChange={(e) => setFaCode(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full bg-bg-dark/40 border border-white/10 rounded-2xl p-5 text-2xl font-mono text-center tracking-[0.4em] outline-none focus:border-brand/50 transition-all text-brand"
                    />
                    <button 
                      onClick={() => {
                        if (faCode.length === 6) {
                          setLocalLimits(prev => ({ ...prev, twoFactorEnabled: true }));
                          setShow2FASetup(false);
                          toast.success("MFA Protocol Active");
                        }
                      }}
                      className="w-full py-4 bg-brand text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50"
                      disabled={faCode.length !== 6}
                    >
                      Authenticate
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Portfolio Overview */}
      <div className="glass-panel p-8 md:p-12 rounded-[40px] border border-white/10 relative overflow-hidden tech-grid shadow-2xl">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-brand/10 to-transparent" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-brand" />
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Total Portfolio Value</p>
            </div>
            <div className="space-y-2">
              <h2 className="text-5xl md:text-7xl font-black font-mono tracking-tighter text-white">
                ${formatNumber(livePortfolioValue, 2)}
              </h2>
              <div className="flex items-center gap-2 text-emerald-500 font-mono text-sm font-bold">
                <ArrowUpRight size={16} />
                <span>+4.28%</span>
                <span className="text-text-muted opacity-40 ml-2">(24H)</span>
              </div>
            </div>
          </div>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 w-full lg:w-auto">
              <button 
                onClick={() => setShowDeposit(true)}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-brand text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg neon-glow"
              >
                <Download size={18} /> Deposit
              </button>
              <button 
                onClick={() => setShowWithdraw(true)}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all shadow-lg"
              >
                <Send size={18} /> Withdraw
              </button>
            </div>
          </div>
        </div>

      {/* Security & Withdrawal Limits Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-6 bg-brand rounded-full" />
            <h3 className="text-lg font-black tracking-tight italic">Security & Withdrawal Protocol</h3>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={14} className={cn(hasChanges ? "text-amber-500 animate-pulse" : "text-brand")} />
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              hasChanges ? "text-amber-500" : "text-brand"
            )}>
              {hasChanges ? 'Unsaved Protocol Modifications' : 'Enhanced Protection Active'}
            </span>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-[32px] border border-white/10 bg-white/5 space-y-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-[100px] -z-10" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Daily Limit */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand/10 rounded-lg text-brand">
                  <Lock size={14} />
                </div>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Daily Withdrawal Limit</label>
              </div>
              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-brand font-black font-mono group-focus-within:scale-110 transition-transform">$</span>
                <input 
                  type="number"
                  value={localLimits.withdrawalLimitDaily}
                  onChange={(e) => setLocalLimits(prev => ({ ...prev, withdrawalLimitDaily: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-bg-dark/40 border border-white/10 rounded-2xl p-5 pl-10 text-base font-mono focus:border-brand/50 outline-none transition-all shadow-inner"
                  placeholder="0.00"
                />
              </div>
              <p className="text-[9px] text-text-muted font-medium italic px-2">Maximum amount per 24-hour cycle</p>
            </div>

            {/* Monthly Limit */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand/10 rounded-lg text-brand">
                  <Lock size={14} />
                </div>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Monthly Withdrawal Limit</label>
              </div>
              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-brand font-black font-mono group-focus-within:scale-110 transition-transform">$</span>
                <input 
                  type="number"
                  value={localLimits.withdrawalLimitMonthly}
                  onChange={(e) => setLocalLimits(prev => ({ ...prev, withdrawalLimitMonthly: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-bg-dark/40 border border-white/10 rounded-2xl p-5 pl-10 text-base font-mono focus:border-brand/50 outline-none transition-all shadow-inner"
                  placeholder="0.00"
                />
              </div>
              <p className="text-[9px] text-text-muted font-medium italic px-2">Total cap for the current calendar month</p>
            </div>

            {/* 2FA Threshold */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <Shield size={14} />
                </div>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">2FA Threshold (MFA)</label>
              </div>
              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500 font-black font-mono group-focus-within:scale-110 transition-transform">$</span>
                <input 
                  type="number"
                  value={localLimits.twoFactorThreshold}
                  onChange={(e) => setLocalLimits(prev => ({ ...prev, twoFactorThreshold: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-bg-dark/40 border border-white/10 rounded-2xl p-5 pl-10 text-base font-mono focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                  placeholder="0.00"
                />
              </div>
              <p className="text-[9px] text-text-muted font-medium italic px-2">Transactions above this require manual verification</p>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 p-4 bg-white/5 rounded-2xl border border-white/5 flex-1 w-full">
              <button 
                onClick={() => {
                  if (!localLimits.twoFactorEnabled) {
                    setFaStep(1);
                    setFaCode('');
                    setShow2FASetup(true);
                  } else {
                    setLocalLimits(prev => ({ ...prev, twoFactorEnabled: false }));
                  }
                }}
                className={cn(
                  "w-12 h-6 rounded-full relative transition-all duration-500 shadow-lg",
                  localLimits.twoFactorEnabled ? "bg-emerald-500" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-md",
                  localLimits.twoFactorEnabled ? "left-7" : "left-1"
                )} />
              </button>
              <div className="flex-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white block">Multi-Factor Authentication</span>
                <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest">
                  {localLimits.twoFactorEnabled ? 'Protocol: High Priority (ENABLED)' : 'Protocol: Standard (DISABLED - Setup Required)'}
                </span>
              </div>
              {!localLimits.twoFactorEnabled && (
                <button 
                  onClick={() => {
                    setFaStep(1);
                    setFaCode('');
                    setShow2FASetup(true);
                  }}
                  className="px-4 py-2 bg-brand/10 border border-brand/20 text-brand rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand/20 transition-all"
                >
                  Configure
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <button 
                onClick={() => {
                   if (appUser) {
                      setLocalLimits({
                        withdrawalLimitDaily: appUser.withdrawalLimitDaily || 5000,
                        withdrawalLimitMonthly: appUser.withdrawalLimitMonthly || 50000,
                        twoFactorThreshold: appUser.twoFactorThreshold || 1000,
                        twoFactorEnabled: appUser.twoFactorEnabled || false
                      });
                   }
                }}
                className="flex-1 md:flex-none px-10 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-white transition-colors"
              >
                Reset
              </button>
              <button 
                onClick={handleUpdateLimits}
                disabled={!hasChanges}
                className={cn(
                  "flex-1 md:flex-none px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all",
                  hasChanges 
                    ? "bg-brand text-bg-dark shadow-[0_10px_30px_rgba(0,255,194,0.3)] hover:scale-[1.02] active:scale-95" 
                    : "bg-white/5 text-text-muted cursor-not-allowed opacity-50"
                )}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Assets Breakdown & Deposit History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-12">
          {/* Asset Inventory */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-6 bg-brand rounded-full" />
                <h3 className="text-lg font-black tracking-tight italic">Asset Inventory</h3>
              </div>
            </div>
            
            <div className="glass-panel rounded-[32px] overflow-hidden border border-white/10">
              <div className="grid grid-cols-12 px-6 py-4 border-b border-white/5 bg-white/5 text-[10px] font-bold text-text-muted uppercase tracking-widest hidden md:grid">
                <div className="col-span-6">Instrument</div>
                <div className="col-span-3 text-right">Balance</div>
                <div className="col-span-3 text-right">Value (USD)</div>
              </div>

              <div className="flex flex-col">
                {assets.map((asset) => (
                  <div key={asset.id} className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 px-6 py-5 border-b border-white/5 hover:bg-white/5 transition-all group">
                    <div className="col-span-6 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl border border-white/10 glass-panel flex items-center justify-center p-2 group-hover:border-brand/30 transition-colors">
                        <img src={asset.icon} alt={asset.symbol} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-white tracking-tight">{asset.symbol}</h4>
                          <span className="text-[10px] font-bold text-text-muted">{asset.name}</span>
                        </div>
                        <p className="text-[10px] font-mono text-emerald-500/60 uppercase">Protocol Ready</p>
                      </div>
                    </div>
                    <div className="col-span-3 md:text-right">
                      <p className="font-mono font-black text-white">{formatNumber(asset.balance, 4)}</p>
                    </div>
                    <div className="col-span-3 md:text-right">
                      <p className="font-mono font-bold text-text-muted group-hover:text-white transition-colors">${formatNumber(asset.value, 2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Deposit History Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                <h3 className="text-lg font-black tracking-tight italic">Deposit History</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1 shadow-inner">
                  <div className="px-3 text-[8px] font-black text-text-muted uppercase tracking-widest hidden md:block border-r border-white/5 mr-1">Sort by</div>
                  <button 
                    onClick={() => setSortConfig(prev => ({ 
                      field: 'date', 
                      direction: prev.field === 'date' && prev.direction === 'desc' ? 'asc' : 'desc' 
                    }))}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all",
                      sortConfig.field === 'date' ? "bg-brand text-bg-dark shadow-lg shadow-brand/20" : "text-text-muted hover:text-white hover:bg-white/5"
                    )}
                  >
                    Time
                    {sortConfig.field === 'date' && (
                       sortConfig.direction === 'desc' ? <ArrowDown size={10} className="stroke-[3]" /> : <ArrowUp size={10} className="stroke-[3]" />
                    )}
                  </button>
                  <button 
                    onClick={() => setSortConfig(prev => ({ 
                      field: 'amount', 
                      direction: prev.field === 'amount' && prev.direction === 'desc' ? 'asc' : 'desc' 
                    }))}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all",
                      sortConfig.field === 'amount' ? "bg-brand text-bg-dark shadow-lg shadow-brand/20" : "text-text-muted hover:text-white hover:bg-white/5"
                    )}
                  >
                    Amount
                    {sortConfig.field === 'amount' && (
                       sortConfig.direction === 'desc' ? <ArrowDown size={10} className="stroke-[3]" /> : <ArrowUp size={10} className="stroke-[3]" />
                    )}
                  </button>
                </div>
                <div className="h-6 w-px bg-white/10 hidden sm:block" />
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest hidden sm:block">
                  {deposits.length} Records
                </p>
              </div>
            </div>
            
            <div className="glass-panel rounded-[32px] overflow-hidden border border-white/10 shadow-xl">
            <div className="grid grid-cols-12 px-6 py-4 border-b border-white/5 bg-white/5 text-[10px] font-bold text-text-muted uppercase tracking-widest hidden md:grid">
                <div className="col-span-4 capitalize">Deposit Asset / Hash</div>
                <div className="col-span-3 text-right">Settlement Amount</div>
                <div className="col-span-3 text-center">Deposit Status</div>
                <div className="col-span-2 text-right">Log</div>
              </div>

              <div className="flex flex-col">
                {sortedDeposits.length > 0 ? (
                  sortedDeposits.map((tx, idx) => (
                    <motion.div 
                      key={tx.id} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 px-6 py-5 border-b border-white/5 hover:bg-white/5 transition-all group"
                    >
                      <div className="col-span-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                          {getAssetIcon(tx.assetTo || '') ? (
                            <img src={getAssetIcon(tx.assetTo || '')!} alt={tx.assetTo} className="w-6 h-6 object-contain" />
                          ) : (
                            <Download size={18} />
                          )}
                        </div>
                        <div>
                          <p className="font-black text-white tracking-tight flex items-center gap-2">
                            {tx.assetTo || 'USD'}
                            <span className="text-[8px] font-mono text-emerald-400 border border-emerald-400/30 px-1 rounded uppercase tracking-tighter">Verified Node</span>
                          </p>
                          <div className="flex items-center gap-2 group/hash">
                            <p className="text-[9px] font-mono text-text-muted truncate max-w-[100px]">
                              {tx.txHash || 'Syncing chain data...'}
                            </p>
                            {tx.txHash && (
                              <button 
                                onClick={() => navigator.clipboard.writeText(tx.txHash!)}
                                className="opacity-0 group-hover/hash:opacity-100 transition-opacity text-brand hover:text-white flex items-center gap-1"
                                title="Copy Hash"
                              >
                                <ArrowDownToLine size={10} className="rotate-[-45deg]" />
                                <span className="text-[7px] font-black uppercase">Copy</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-3 md:text-right">
                        <p className="font-mono font-black text-emerald-400 text-sm">
                          {tx.amountTo > 0 ? (
                            tx.assetTo === 'USD' || !tx.assetTo 
                              ? `+$${formatNumber(tx.amountTo, 2)}` 
                              : `+${formatNumber(tx.amountTo, 6)} ${tx.assetTo}`
                          ) : (
                            <span className="text-text-muted text-[10px] italic">Awaiting Proof</span>
                          )}
                        </p>
                        <p className="text-[8px] font-bold text-text-muted uppercase tracking-wider">{new Date(tx.timestamp).toLocaleDateString()} @ {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="col-span-3 flex justify-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5",
                          tx.status === 'approved' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                          tx.status === 'pending' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                          "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        )}>
                          <div className={cn(
                            "w-1 h-1 rounded-full",
                            tx.status === 'approved' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : 
                            tx.status === 'pending' ? "bg-amber-500 animate-pulse" : "bg-rose-500"
                          )} />
                          {tx.status}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <button className="px-3 py-1.5 bg-brand/5 hover:bg-brand/10 text-brand rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all border border-brand/20 hover:border-brand/40 shadow-sm active:scale-95">
                          Audit
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/5">
                        <Download size={32} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">No Deposit History</p>
                        <p className="text-[9px] text-text-muted max-w-[200px]">Fuel your account to start trading on the NEXO protocol.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* System Activity */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-2 h-6 bg-orange-500 rounded-full" />
            <h3 className="text-lg font-black tracking-tight italic">Journal</h3>
          </div>
          
          <div className="glass-panel rounded-[32px] p-6 border border-white/10 space-y-6 tech-grid min-h-[400px]">
             {transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.slice(0, 8).map((tx, i) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          tx.type === 'deposit' ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                        )}>
                          {tx.type === 'deposit' ? <Download size={14} /> : <ArrowDownRight size={14} />}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest">{tx.type}</p>
                          <p className="text-[9px] font-mono text-text-muted lowercase">{new Date(tx.timestamp).toLocaleString().slice(0, 16)}</p>
                        </div>
                      </div>
                      <p className="font-mono text-[11px] font-black">
                        {tx.type === 'deposit' ? '+' : '-'}${tx.amountTo || tx.amountFrom}
                      </p>
                    </div>
                  ))}
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-text-muted">
                    <History size={32} />
                  </div>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">No logs detected</p>
                </div>
             )}
             <button 
                onClick={handleSync}
                className="w-full py-4 text-brand text-[10px] font-black uppercase tracking-widest hover:underline transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={12} className={cn(isSyncing && "animate-spin")} />
                {isSyncing ? 'Synchronizing...' : 'Sync History'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
