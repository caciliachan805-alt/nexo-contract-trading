import React, { useState, useMemo, useEffect } from 'react';
import { useMarket } from '../context/MarketContext';
import { formatCurrency, cn } from '../lib/utils';
import { TrendingUp, TrendingDown, Search, Filter, Star, Clock, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderBook } from './OrderBook';

export const MarketList: React.FC = () => {
  const { assets } = useMarket();
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<'All' | 'Gainers' | 'Losers'>('All');
  const [minChange, setMinChange] = useState<number | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const savedHistory = localStorage.getItem('marketSearchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse search history', e);
      }
    }
  }, []);

  const addToHistory = (query: string) => {
    if (!query.trim()) return;
    const cleanQuery = query.trim();
    setSearchHistory(prev => {
      const filtered = prev.filter(q => q !== cleanQuery);
      const newHistory = [cleanQuery, ...filtered].slice(0, 5);
      localStorage.setItem('marketSearchHistory', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const removeFromHistory = (query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory(prev => {
      const newHistory = prev.filter(q => q !== query);
      localStorage.setItem('marketSearchHistory', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('marketSearchHistory');
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const filteredAssets = useMemo(() => {
    let result = assets.filter(asset => 
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filterType === 'Gainers') {
      result = result.filter(a => a.change24h > 0).sort((a, b) => b.change24h - a.change24h);
    } else if (filterType === 'Losers') {
      result = result.filter(a => a.change24h < 0).sort((a, b) => a.change24h - b.change24h);
    }

    if (minChange !== null) {
      result = result.filter(a => Math.abs(a.change24h) >= minChange);
    }

    return result;
  }, [assets, searchQuery, filterType, minChange]);

  const favoriteAssets = useMemo(() => {
    return filteredAssets.filter(asset => favorites.includes(asset.id));
  }, [filteredAssets, favorites]);

  const otherAssets = useMemo(() => {
    return filteredAssets.filter(asset => !favorites.includes(asset.id));
  }, [filteredAssets, favorites]);

  return (
    <div className="flex flex-col gap-6 pb-24 px-4 overflow-y-auto no-scrollbar h-[calc(100vh-160px)]">
      {/* Search Header */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 relative">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl flex items-center px-4 py-3 gap-2 focus-within:border-brand/50 transition-colors">
            <Search size={16} className="text-text-dim" />
            <input 
              type="text" 
              placeholder="Search Assets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addToHistory(searchQuery);
                }
              }}
              className="bg-transparent text-xs font-bold outline-none w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-text-dim hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          <AnimatePresence>
            {isSearchFocused && searchHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
              >
                <div className="p-3 border-b border-white/10 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">Recent Searches</span>
                  <button 
                    onClick={clearHistory}
                    className="text-[8px] font-bold text-red-400/60 hover:text-red-400 uppercase tracking-widest flex items-center gap-1"
                  >
                    <Trash2 size={10} />
                    Clear
                  </button>
                </div>
                <div className="flex flex-col">
                  {searchHistory.map((query, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSearchQuery(query);
                        addToHistory(query);
                      }}
                      className="flex items-center justify-between px-4 py-3 hover:bg-white/5 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Clock size={12} className="text-text-dim" />
                        <span className="text-xs font-bold">{query}</span>
                      </div>
                      <X 
                        size={14} 
                        className="text-text-dim hover:text-white" 
                        onClick={(e) => removeFromHistory(query, e)}
                      />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <button className="aspect-square bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center p-3 text-text-dim">
            <Filter size={18} />
          </button>
        </div>

        {/* performance filters */}
        <div className="space-y-2">
          <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
            {(['All', 'Gainers', 'Losers'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  filterType === type 
                    ? "bg-brand text-bg-dark shadow-lg shadow-brand/20" 
                    : "text-text-dim hover:text-white"
                )}
              >
                {type === 'All' ? 'All' : `Top ${type}`}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {[null, 2, 5, 10].map((range) => (
              <button
                key={range ?? 'any'}
                onClick={() => setMinChange(range)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all whitespace-nowrap",
                  minChange === range
                    ? "bg-white/10 border-brand text-brand"
                    : "bg-white/5 border-white/10 text-text-dim hover:border-white/20"
                )}
              >
                {range === null ? 'Any Change' : `>${range}% Move`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Favorites Section */}
      <AnimatePresence mode="popLayout">
        {favoriteAssets.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-3"
          >
            <h3 className="text-xs font-black tracking-widest uppercase mb-1 px-2 text-brand flex items-center gap-2">
              <Star size={12} fill="currentColor" />
              Favorites
            </h3>
            {favoriteAssets.map((asset) => (
              <motion.div
                layout
                key={`fav-${asset.id}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-between p-4 glass-card rounded-2xl border border-brand/20 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-brand/5 blur-2xl rounded-full" />
                <div className="flex items-center gap-3 relative z-10">
                  <button 
                    onClick={(e) => toggleFavorite(asset.id, e)}
                    className="text-brand"
                  >
                    <Star size={16} fill="currentColor" />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-white/5 p-1.5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <img 
                      src={asset.icon} 
                      alt={asset.symbol} 
                      className="w-full h-full object-contain" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-xs uppercase">{asset.symbol}</h4>
                      <span className="text-[8px] font-bold text-brand/40 uppercase">USDT</span>
                    </div>
                    <p className="text-[8px] text-text-dim uppercase tracking-tighter">{asset.name}</p>
                  </div>
                </div>
                <div className="text-right relative z-10">
                  <p className="font-bold text-xs tracking-tight">{formatCurrency(asset.price)}</p>
                  <p className={cn(
                    "text-[10px] font-bold",
                    asset.change24h >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {asset.change24h >= 0 ? '+' : ''}{asset.change24h}%
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Movers */}
      <div>
        <h3 className="text-xs font-bold tracking-wider uppercase mb-4 px-2">Top Movers</h3>
        <div className="grid grid-cols-2 gap-3">
          {assets.slice(0, 2).map((asset) => (
            <motion.div 
              key={asset.id}
              whileTap={{ scale: 0.98 }}
              className="glass-card p-4 rounded-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <img 
                    src={asset.icon} 
                    alt={asset.symbol} 
                    className="w-6 h-6 object-contain" 
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[10px] font-bold uppercase">{asset.symbol}/USDT</span>
                </div>
                <button 
                  onClick={(e) => toggleFavorite(asset.id, e)}
                  className={cn(favorites.includes(asset.id) ? "text-brand" : "text-text-dim opacity-30")}
                >
                  <Star size={14} fill={favorites.includes(asset.id) ? "currentColor" : "none"} />
                </button>
              </div>
              <p className="text-lg font-bold tracking-tight mb-1">{formatCurrency(asset.price)}</p>
              <div className={cn(
                "text-[10px] font-bold flex items-center gap-1",
                asset.change24h >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {asset.change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {asset.change24h >= 0 ? '+' : ''}{asset.change24h}%
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Order Book Section */}
      <OrderBook basePrice={assets[0].price} symbol={assets[0].symbol} />

      {/* Full Market */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center px-2 text-[10px] font-bold text-text-dim uppercase tracking-widest">
          <span>Asset / Pairing</span>
          <span>Price / 24h Change</span>
        </div>
        {otherAssets.map((asset, index) => (
          <motion.div
            layout
            key={asset.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-4 glass-card rounded-2xl"
          >
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => toggleFavorite(asset.id, e)}
                className={cn(favorites.includes(asset.id) ? "text-brand" : "text-text-dim opacity-30")}
              >
                <Star size={16} fill={favorites.includes(asset.id) ? "currentColor" : "none"} />
              </button>
              <div className="w-8 h-8 rounded-full bg-white/5 p-1.5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <img 
                  src={asset.icon} 
                  alt={asset.symbol} 
                  className="w-full h-full object-contain" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs uppercase">{asset.symbol}</h4>
                  <span className="text-[8px] font-bold text-brand/40 uppercase">USDT</span>
                </div>
                <p className="text-[8px] text-text-dim uppercase tracking-tighter">{asset.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-xs tracking-tight">{formatCurrency(asset.price)}</p>
              <p className={cn(
                "text-[10px] font-bold",
                asset.change24h >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {asset.change24h >= 0 ? '+' : ''}{asset.change24h}%
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

