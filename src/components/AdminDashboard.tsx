import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Download, 
  History, 
  Check, 
  X, 
  Search, 
  Filter,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// Removed shadcn imports as they were deleted. Using raw Tailwind instead.
import { getAllUsers, getAllTransactions, getAllTrades, updateTransactionStatus, updateUserStatus } from '../lib/firestoreService';
import { User, Transaction, Trade } from '../types';
import { formatNumber, cn } from '../lib/utils';
import { toast } from "sonner";

// Simple helper components instead of full shadcn
const DashboardCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("p-4 rounded-2xl shadow-sm", className)}>{children}</div>
);

const Badge: React.FC<{ children: React.ReactNode; className?: string; variant?: 'default' | 'outline' | 'destructive' }> = ({ children, className, variant }) => (
  <span className={cn(
    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
    variant === 'destructive' ? "bg-rose-500 text-white" : "bg-blue-100 text-blue-600",
    className
  )}>
    {children}
  </span>
);

export const AdminDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('deposits');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allUsers, allTxs, allTrades] = await Promise.all([
        getAllUsers(),
        getAllTransactions(),
        getAllTrades()
      ]);
      setUsers(allUsers as User[]);
      setTransactions(allTxs as Transaction[]);
      setTrades(allTrades as Trade[]);
    } catch (error) {
      toast.error("Failed to fetch admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [reviewingTx, setReviewingTx] = useState<Transaction | null>(null);
  const [reviewAmount, setReviewAmount] = useState('');

  const handleReviewDeposit = async (status: 'approved' | 'rejected') => {
    if (!reviewingTx) return;
    try {
      const amount = status === 'approved' ? parseFloat(reviewAmount) : 0;
      await updateTransactionStatus(reviewingTx.id, status, amount);
      toast.success(`Deposit ${status} successfully`);
      setReviewingTx(null);
      setReviewAmount('');
      fetchData();
    } catch (error) {
      toast.error("Failed to update deposit status");
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'pending');

  return (
    <div className="fixed inset-0 bg-slate-50 z-[80] flex flex-col overflow-hidden max-w-md mx-auto shadow-2xl">
      <header className="p-4 bg-white border-b border-slate-200 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="text-blue-600" size={24} />
          Admin Panel
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <DashboardCard className="bg-blue-600 text-white">
            <h3 className="text-xs uppercase tracking-widest text-blue-100 flex items-center gap-2 mb-2">
              <Users size={14} /> Users
            </h3>
            <p className="text-2xl font-black">{users.length}</p>
          </DashboardCard>
          <DashboardCard className="bg-slate-900 text-white">
            <h3 className="text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-2">
              <TrendingUp size={14} /> Total Trades
            </h3>
            <p className="text-2xl font-black">{trades.length}</p>
          </DashboardCard>
        </div>

        <div className="w-full">
          <div className="grid grid-cols-3 w-full rounded-xl bg-slate-200/50 p-1 mb-4">
            <button 
              onClick={() => setActiveTab('deposits')}
              className={cn("py-2 rounded-lg font-bold text-sm", activeTab === 'deposits' ? "bg-white shadow-sm text-slate-900" : "text-slate-500")}
            >
              Deposits
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={cn("py-2 rounded-lg font-bold text-sm", activeTab === 'users' ? "bg-white shadow-sm text-slate-900" : "text-slate-500")}
            >
              Users
            </button>
            <button 
              onClick={() => setActiveTab('trades')}
              className={cn("py-2 rounded-lg font-bold text-sm", activeTab === 'trades' ? "bg-white shadow-sm text-slate-900" : "text-slate-500")}
            >
              Trades
            </button>
          </div>

          {activeTab === 'deposits' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                Pending Deposits
                {pendingDeposits.length > 0 && (
                  <Badge variant="destructive" className="rounded-full px-1.5 py-0 min-w-[20px] h-5 flex items-center justify-center">
                    {pendingDeposits.length}
                  </Badge>
                )}
              </h3>
              {pendingDeposits.length === 0 ? (
                <div className="border-dashed border-2 border-slate-200 bg-white rounded-2xl py-12 flex flex-col items-center justify-center text-center">
                  <Check className="text-slate-300 mb-2" size={32} />
                  <p className="text-slate-400 text-sm font-medium">No pending deposits to review</p>
                </div>
              ) : (
                pendingDeposits.map((tx) => (
                  <DashboardCard key={tx.id} className="bg-white">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-600 border-none uppercase text-[9px]">{tx.assetTo || 'USDT'}</Badge>
                        <span className="text-xs font-mono text-slate-400">TX: {tx.id?.slice(-8) || 'N/A'}</span>
                      </div>
                      <span className="text-sm font-black text-slate-800 tracking-tight">${tx.amountTo}</span>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Transaction Hash</p>
                        <p className="text-[10px] font-mono break-all text-slate-600 bg-slate-50 p-2 rounded-lg">{tx.txHash || 'N/A'}</p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => {
                            setReviewingTx(tx);
                            setReviewAmount('');
                          }}
                          className="flex-1 py-2 bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                        >
                          <Check size={14} /> Review
                        </button>
                      </div>
                    </div>
                  </DashboardCard>
                ))
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 rounded-xl font-medium outline-none focus:border-blue-500 transition-colors" 
                  placeholder="Search users by name or email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="space-y-3">
                {filteredUsers.map((u) => (
                  <DashboardCard key={u.uid} className="bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-sm font-bold border border-slate-200">
                        {u.displayName?.[0] || 'U'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{u.displayName}</h4>
                        <p className="text-[10px] text-slate-400 font-medium">{u.email}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div>
                        <p className="text-sm font-black text-slate-800">${formatNumber(u.availableBalance, 2)}</p>
                        <span className={cn(
                          "rounded-full px-2 py-0 h-5 text-[9px] font-bold uppercase",
                          u.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {u.status}
                        </span>
                      </div>
                      <button 
                        onClick={async () => {
                          const newStatus = u.status === 'active' ? 'suspended' : 'active';
                          await updateUserStatus(u.uid, newStatus); 
                          toast.success(`User ${newStatus}`);
                          fetchData();
                        }}
                        className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all active:scale-95",
                          u.status === 'active' ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                        )}
                      >
                        {u.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </div>
                  </DashboardCard>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'trades' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800">All Active Trades</h3>
              <div className="space-y-3">
                {trades.map((trade) => (
                  <DashboardCard key={trade.id} className="bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className={cn(
                          "uppercase text-[9px]",
                          trade.direction === 'up' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                        )}>
                          {trade.direction === 'up' ? 'Buy Up' : 'Buy Down'}
                        </Badge>
                        <h4 className="font-black text-sm">{trade.asset}</h4>
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">
                        {trade.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Amount</p>
                        <p className="text-xs font-black text-slate-700">${trade.amount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Entry Price</p>
                        <p className="text-xs font-black text-slate-700">${formatNumber(trade.priceAtEntry, 4)}</p>
                      </div>
                    </div>
                  </DashboardCard>
                ))}
                {trades.length === 0 && (
                  <p className="text-center py-12 text-slate-400 text-sm font-medium">No trades recorded yet</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Dialog Overlay */}
      <AnimatePresence>
        {reviewingTx && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Verify Deposit</h3>
                <button onClick={() => setReviewingTx(null)} className="text-slate-400"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">TX Hash (Scan Result)</p>
                  <p className="text-[10px] font-mono break-all text-blue-600 bg-blue-50 p-3 rounded-xl border border-blue-100">{reviewingTx.txHash}</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Confirm Amount to Credit</label>
                  <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-4 border border-slate-200">
                    <span className="text-sm font-black text-slate-400">$</span>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={reviewAmount}
                      onChange={(e) => setReviewAmount(e.target.value)}
                      className="bg-transparent text-sm font-black flex-1 outline-none text-slate-800"
                    />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{reviewingTx.assetTo}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium italic">* This will be added to the user's balance instantly.</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => handleReviewDeposit('rejected')}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Reject TX
                  </button>
                  <button 
                    onClick={() => handleReviewDeposit('approved')}
                    className="flex-none w-[60%] py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    Confirm & Credit
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
