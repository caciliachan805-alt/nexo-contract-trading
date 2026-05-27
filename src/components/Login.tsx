import React from 'react';
import { LogIn, Mail, Lock, ShieldCheck, Globe, Zap, Cpu } from 'lucide-react';
import { signInWithGoogle, auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { ethers } from 'ethers';

export const Login: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isEmailLogin, setIsEmailLogin] = React.useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Credential verification successful");
    } catch (error) {
      toast.error("Access Denied: Invalid cryptographic keys");
    }
  };

  const setDemo = (type: 'admin' | 'user') => {
    if (type === 'admin') {
      setEmail('admin@nexotrade.com');
      setPassword('admin123');
    } else {
      setEmail('john@example.com');
      setPassword('user1234');
    }
    setIsEmailLogin(true);
  };

  return (
    <div className="min-h-screen bg-bg-dark flex flex-col items-center justify-center p-6 relative overflow-hidden tech-grid">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-brand/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 md:p-12 rounded-[40px] border border-white/10 w-full max-w-lg relative z-10 shadow-2xl"
      >
        <div className="flex justify-center mb-10">
          <div className="relative">
            <div className="w-20 h-20 bg-brand/10 border border-brand/20 rounded-2xl flex items-center justify-center neon-glow">
              <span className="text-3xl font-black text-brand tracking-tighter">NX</span>
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-black border border-white/10 rounded-lg flex items-center justify-center">
              <ShieldCheck size={16} className="text-brand" />
            </div>
          </div>
        </div>
        
        <div className="text-center mb-10 space-y-2">
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter">AUTHENTICATION</h1>
          <p className="text-text-muted text-[10px] font-bold uppercase tracking-[0.3em]">Secure Terminal Entry Portal</p>
        </div>

        {!isEmailLogin ? (
          <div className="space-y-4">
            <button
              onClick={() => signInWithGoogle()}
              className="w-full py-5 bg-white text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
            >
              <Globe size={18} />
              Identity Provider (Google)
            </button>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest text-text-muted">
                <span className="bg-bg-dark px-4">Legacy Access</span>
              </div>
            </div>

            <button
              onClick={() => setIsEmailLogin(true)}
              className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 transition-all font-mono"
            >
              <Mail size={16} className="text-brand/60" />
              Email-based Authentication
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Access Identity</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-brand" size={16} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm font-bold outline-none focus:border-brand/40 transition-all text-white font-mono"
                  placeholder="IDENTITY_STRING"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Cryptographic Key</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-brand" size={16} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm font-bold outline-none focus:border-brand/40 transition-all text-white font-mono"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-5 bg-brand text-bg-dark rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl neon-glow"
            >
              Verify & Authorize
            </button>
            <button
              type="button"
              onClick={() => setIsEmailLogin(false)}
              className="w-full text-text-muted text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors"
            >
              Back to entry options
            </button>
          </form>
        )}

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Cpu size={14} className="text-brand/40" />
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Simulator Shortcuts</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setDemo('admin')}
              className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-brand uppercase tracking-widest hover:bg-brand/10 transition-all"
            >
              ADMIN_ACCESS
            </button>
            <button 
              onClick={() => setDemo('user')}
              className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              USER_ACCESS
            </button>
          </div>
        </div>
      </motion.div>

      <div className="mt-12 flex gap-8 items-center opacity-20 hover:opacity-50 transition-opacity">
        <Zap size={20} />
        <Globe size={20} />
        <Cpu size={20} />
      </div>
    </div>
  );
};
