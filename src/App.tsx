/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Header } from './components/Header';
import { BottomNav, Tab } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { MiningDashboard } from './components/MiningDashboard';
import { MarketList } from './components/MarketList';
import { AccountProfile } from './components/AccountProfile';
import { AssetDashboard } from './components/AssetDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { TradeDetail } from './components/TradeDetail';
import { Login } from './components/Login';
import { UserProvider, useUser } from './context/UserContext';
import { MarketProvider } from './context/MarketContext';
import { Sidebar } from './components/Sidebar';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import { Ban } from 'lucide-react';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showAdmin, setShowAdmin] = useState(false);
  const { user, appUser, loading } = useUser();

  useEffect(() => {
    const handleShowAdmin = () => setShowAdmin(true);
    const handleChangeTab = (e: any) => setActiveTab(e.detail);
    window.addEventListener('show-admin', handleShowAdmin);
    window.addEventListener('change-tab', handleChangeTab);
    return () => {
      window.removeEventListener('show-admin', handleShowAdmin);
      window.removeEventListener('change-tab', handleChangeTab);
    };
  }, []);

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <Dashboard />;
      case 'assets':
        return <AssetDashboard />;
      case 'trade':
        return <TradeDetail onBack={() => setActiveTab('home')} />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (appUser?.status === 'suspended') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center text-white">
        <div className="w-20 h-20 bg-rose-500/20 border border-rose-500/30 rounded-3xl flex items-center justify-center text-rose-500 mb-6">
          <Ban size={40} />
        </div>
        <h2 className="text-2xl font-black mb-2 tracking-tight">Account Suspended</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Your account has been suspended for violating platform terms. <br/>
          Please contact support if you believe this is an error.
        </p>
        <button 
          onClick={() => signOut(auth)}
          className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
        >
          Logout & Exit
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark text-white flex overflow-hidden font-sans">
      <Toaster position="top-right" richColors />
      
      {/* Sidebar - Desktop Only */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Header />
        
        <main className="flex-1 overflow-y-auto no-scrollbar pb-24 md:pb-0">
          <div className="max-w-5xl mx-auto p-4 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderScreen()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>

      <AnimatePresence>
        {showAdmin && (
          <div className="fixed inset-0 z-50">
            <AdminDashboard onBack={() => setShowAdmin(false)} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <UserProvider>
      <MarketProvider>
        <AppContent />
      </MarketProvider>
    </UserProvider>
  );
}
