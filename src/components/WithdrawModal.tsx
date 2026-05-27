import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { formatCurrency, cn } from '../lib/utils';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ASSETS = [
  { id: 'USDT', name: 'Tether (USDT)', network: 'ERC20/BEP20' },
  { id: 'BTC', name: 'Bitcoin (BTC)', network: 'BTC' },
  { id: 'ETH', name: 'Ethereum (ETH)', network: 'ERC20' },
];

import { createTransaction } from '../lib/firestoreService';
import { toast } from 'sonner';

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose }) => {
  const { user, appUser } = useUser();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleNext = () => {
    if (!appUser) return;
    if (step === 1) {
      if (!amount || parseFloat(amount) <= 0) return;
      const numAmount = parseFloat(amount);
      
      // Daily Limit Check
      if (appUser.withdrawalLimitDaily && numAmount > appUser.withdrawalLimitDaily) {
        toast.error(`Daily limit exceeded. Your cap is $${appUser.withdrawalLimitDaily}`);
        return;
      }
      
      // Monthly Limit Check (Simplified for prototype, real version would sum current month's TXs)
      if (appUser.withdrawalLimitMonthly && numAmount > appUser.withdrawalLimitMonthly) {
        toast.error(`Monthly limit exceeded. Your cap is $${appUser.withdrawalLimitMonthly}`);
        return;
      }

      if (appUser.availableBalance < numAmount) {
        toast.error("Insufficient available balance");
        return;
      }
    }
    if (step === 2 && !address) return;
    
    // Check if 2FA is needed after confirmation step
    if (step === 3) {
      const threshold = appUser.twoFactorThreshold || 1000;
      const isAboveThreshold = parseFloat(amount) >= threshold;
      
      if (appUser.twoFactorEnabled && isAboveThreshold) {
        setStep(5); // 2FA Step
        return;
      }
      handleWithdraw();
      return;
    }
    setStep(step + 1);
  };

  const handleVerify2FA = () => {
    if (twoFactorCode.length !== 6) {
      toast.error("Invalid 2FA code");
      return;
    }
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      handleWithdraw();
    }, 1500);
  };

  const handleWithdraw = async () => {
    if (!user || !amount || !address) return;
    try {
      await createTransaction({
        id: `with_${Math.random().toString(36).substring(7)}`,
        userId: user.uid,
        type: 'withdrawal',
        assetTo: selectedAsset.id,
        amountTo: parseFloat(amount),
        timestamp: new Date().toISOString(),
        status: 'pending',
        toAddress: address
      });
      setStep(4);
      toast.success("Withdrawal request submitted");
    } catch (error) {
      toast.error("Withdrawal failed");
    }
  };

  if (!appUser) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-bg-dark/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-md glass-card rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 relative z-10 border-t sm:border border-white/10"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-brand">Withdraw Funds</h3>
              <button 
                onClick={() => {
                  onClose();
                  setTimeout(() => setStep(1), 300);
                }} 
                className="p-2 glass-card rounded-xl text-text-dim"
              >
                <X size={18} />
              </button>
            </div>

            {step === 4 ? (
               <div className="py-12 flex flex-col items-center text-center gap-6">
                <div className="w-20 h-20 bg-brand/10 border border-brand/20 rounded-full flex items-center justify-center text-brand">
                  <ShieldCheck size={40} strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-xl font-black mb-2">Processing Request</h4>
                  <p className="text-xs text-text-dim leading-relaxed px-4">
                    Your withdrawal of <span className="text-brand font-bold">{amount} {selectedAsset.id}</span> to 
                    <span className="text-white font-mono text-[10px] block mt-1">{address}</span>
                    is currently being reviewed for security compliance.
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-brand text-bg-dark rounded-xl font-black text-xs uppercase tracking-widest"
                >
                  Confirm & Close
                </button>
              </div>
            ) : (
              <div className="space-y-6 pb-6">
                {/* Progress Bar */}
                <div className="flex gap-2">
                  {[1, 2, 3].map((s) => (
                    <div 
                      key={s} 
                      className={cn(
                        "h-1 flex-1 rounded-full transition-all",
                        s <= step ? "bg-brand" : "bg-white/10"
                      )} 
                    />
                  ))}
                </div>

                {step === 1 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Select Asset</p>
                      <div className="flex flex-col gap-2">
                        {ASSETS.map((asset) => (
                          <button
                            key={asset.id}
                            onClick={() => setSelectedAsset(asset)}
                            className={cn(
                              "p-4 rounded-2xl flex items-center justify-between border transition-all",
                              selectedAsset.id === asset.id 
                                ? "bg-brand/10 border-brand" 
                                : "glass-card border-transparent"
                            )}
                          >
                            <span className="text-xs font-bold">{asset.name}</span>
                            <span className="text-[10px] text-text-dim">{asset.network}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-text-dim uppercase">
                        <span>Withdraw Amount</span>
                        <span>Balance: {formatCurrency(appUser.availableBalance)}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-4 border border-white/5">
                        <input 
                          type="number" 
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="bg-transparent text-sm font-bold flex-1 outline-none text-brand"
                        />
                        <span className="text-xs font-bold opacity-50 px-2 uppercase">{selectedAsset.id}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div className="p-4 bg-red-400/5 border border-red-400/20 rounded-2xl flex gap-3">
                      <AlertCircle size={16} className="text-red-400 shrink-0" />
                      <p className="text-[9px] text-red-400/80 leading-relaxed font-bold uppercase">
                        Double check your address. Transactions sent to wrong addresses cannot be recovered.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Destination Address</p>
                      <textarea 
                        rows={3}
                        placeholder="Paste your wallet address here"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-mono outline-none focus:border-brand/50 transition-colors"
                      />
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                    <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
                      <div className="flex justify-between items-center pb-4 border-b border-white/5">
                        <span className="text-[10px] font-bold text-text-dim uppercase">Asset</span>
                        <span className="text-xs font-bold text-brand">{selectedAsset.name}</span>
                      </div>
                      <div className="flex justify-between items-center pb-4 border-b border-white/5">
                        <span className="text-[10px] font-bold text-text-dim uppercase">Amount</span>
                        <span className="text-xs font-bold text-brand">{amount} {selectedAsset.id}</span>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-text-dim uppercase">To Address</span>
                        <p className="text-[10px] font-mono break-all text-white/50">{address}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 5 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                        <ShieldCheck size={32} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-lg font-black tracking-tight uppercase italic">Security Verification</h4>
                        <p className="text-[9px] text-text-dim uppercase font-bold tracking-widest">A 2FA code is required for this amount</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest text-center">Enter 6-digit Code</p>
                      <div className="flex justify-center">
                        <input 
                          type="text" 
                          maxLength={6}
                          placeholder="000000"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                          className="bg-white/5 border border-white/10 rounded-2xl p-4 text-2xl font-mono text-center tracking-[0.5em] w-48 outline-none focus:border-brand/50 transition-all text-brand"
                        />
                      </div>
                    </div>

                    <p className="text-[8px] text-text-dim text-center uppercase tracking-widest">
                      Check your authenticated device for the security protocol
                    </p>
                  </motion.div>
                )}

                <button 
                  onClick={step === 5 ? handleVerify2FA : (step === 3 ? handleNext : handleNext)}
                  disabled={isVerifying}
                  className="w-full py-4 bg-brand text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl cyan-glow flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <>
                      {step === 5 ? 'Verify & Authorize' : step === 3 ? 'Confirm Withdrawal' : 'Continue'}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
