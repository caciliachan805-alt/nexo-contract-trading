import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-bg-dark/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-xs glass-card rounded-3xl p-6 relative z-10 border border-brand/20 shadow-2xl cyan-glow"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-text-dim hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-6">
              <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                New Message <Bell size={16} className="text-brand animate-swing" />
              </h3>
            </div>

            <div className="p-4 bg-brand/5 border border-brand/10 rounded-2xl mb-6">
              <p className="text-xs font-bold text-brand mb-2">Dear NexTrade user,</p>
              <p className="text-[10px] text-white/80 leading-relaxed">
                Hey, Man. You need to deposit more money. 😉 🤑
              </p>
            </div>

            <button 
              onClick={onClose}
              className="w-full py-3 bg-brand text-bg-dark font-black text-[10px] uppercase tracking-[0.2em] rounded-xl active:scale-95 transition-all"
            >
              Acknowledge
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
