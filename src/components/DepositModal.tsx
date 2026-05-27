import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Info } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { DEPOSIT_ADDRESSES } from '../constants';
import { cn } from '../lib/utils';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ASSETS = [
  { id: 'BTC', name: 'Bitcoin', network: 'BTC' },
  { id: 'ETH', name: 'Ethereum', network: 'ERC20' },
  { id: 'USDT', name: 'Tether', network: 'ERC20/BEP20' },
  { id: 'USDC', name: 'USD Coin', network: 'ERC20' },
  { id: 'XRP', name: 'Ripple', network: 'Ripple' },
  { id: 'BNB', name: 'Binance Coin', network: 'BEP20' },
];

import { createTransaction } from '../lib/firestoreService';
import { useUser } from '../context/UserContext';
import { toast } from 'sonner';

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
  const { user } = useUser();
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]);
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const address = DEPOSIT_ADDRESSES[selectedAsset.id as keyof typeof DEPOSIT_ADDRESSES];

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Address copied to clipboard");
  };

  const handleSubmit = async () => {
    if (!txHash || !user) return;
    try {
      await createTransaction({
        id: `dep_${Math.random().toString(36).substring(7)}`,
        userId: user.uid,
        type: 'deposit',
        assetTo: selectedAsset.id,
        amountTo: 0, // Admin will set the amount during review
        timestamp: new Date().toISOString(),
        status: 'pending',
        txHash: txHash
      });
      setSubmitted(true);
      toast.success("Deposit submitted for review");
    } catch (error) {
      toast.error("Failed to submit deposit");
    }
  };

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
              <h3 className="text-sm font-black uppercase tracking-widest text-brand">Deposit Funds</h3>
              <button onClick={onClose} className="p-2 glass-card rounded-xl text-text-dim">
                <X size={18} />
              </button>
            </div>

            {!submitted ? (
              <div className="space-y-6 overflow-y-auto max-h-[70vh] no-scrollbar pb-6">
                {/* Asset Selection */}
                <div>
                  <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-3">Select Asset</p>
                  <div className="grid grid-cols-3 gap-2">
                    {ASSETS.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset)}
                        className={cn(
                          "py-2 rounded-xl text-[10px] font-bold border transition-all",
                          selectedAsset.id === asset.id 
                            ? "bg-brand/10 border-brand text-brand" 
                            : "glass-card border-transparent text-text-dim hover:border-white/10"
                        )}
                      >
                        {asset.id}
                      </button>
                    ))}
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="p-4 bg-white rounded-3xl">
                    <QRCodeSVG value={address} size={150} />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-text-dim uppercase mb-1">Network</p>
                    <p className="text-xs font-black text-brand">{selectedAsset.network}</p>
                  </div>
                </div>

                {/* Address Copy */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Deposit Address</p>
                  <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-4 border border-white/5">
                    <span className="text-[10px] font-mono break-all flex-1 text-white/70">{address}</span>
                    <button 
                      onClick={handleCopy}
                      className="p-2 glass-card rounded-lg text-brand active:scale-90 transition-transform"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                {/* Transaction Hash Tracking */}
                <div className="space-y-4 pt-2">
                  <div className="p-4 bg-brand/5 border border-brand/10 rounded-2xl flex gap-3">
                    <Info size={16} className="text-brand shrink-0" />
                    <p className="text-[9px] text-brand/80 leading-relaxed font-bold">
                      After sending your deposit, please provide the transaction ID (Hash) below for tracking and faster confirmation.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">TXID / Hash (Required)</p>
                    <input 
                      type="text" 
                      placeholder="Enter transaction hash"
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-brand/50 transition-colors"
                    />
                  </div>
                  <button 
                    disabled={!txHash}
                    onClick={handleSubmit}
                    className="w-full py-4 bg-brand text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl cyan-glow disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all"
                  >
                    Confirm Submission
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center text-center gap-6">
                <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center text-green-400">
                  <Check size={40} strokeWidth={3} />
                </div>
                <div>
                  <h4 className="text-xl font-black mb-2">Submission Received</h4>
                  <p className="text-xs text-text-dim leading-relaxed px-4">
                    Your deposit request for <span className="text-brand font-bold">{selectedAsset.id}</span> has been submitted. 
                    Our system will verify the hash <span className="text-brand font-mono text-[10px] break-all">{txHash}</span> within 5-15 minutes.
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-full py-4 glass-card border border-brand/20 text-brand rounded-2xl font-black text-xs uppercase tracking-widest mt-4"
                >
                  Done
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
