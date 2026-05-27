import React, { useState, useEffect, useMemo } from 'react';
import { Newspaper, ExternalLink, Clock, ChevronRight, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  body: string;
  published_on: number;
  imageurl: string;
}

interface NewsFeedProps {
  filterSymbol?: string;
  className?: string;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ filterSymbol: propFilterSymbol, className }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
  const [localFilterSymbol, setLocalFilterSymbol] = useState(propFilterSymbol || '');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (propFilterSymbol) {
      setLocalFilterSymbol(propFilterSymbol);
    }
  }, [propFilterSymbol]);

  const CATEGORIES = ['All', 'Cryptocurrency', 'Stocks', 'Forex', 'Exchanges', 'Mining'];
  const SOURCES = ['All', 'CryptoCompare', 'CoinDesk', 'Reuters', 'CoinTelegraph', 'NewsBTC'];

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        // We can pass categories to the API if needed, but for better UX in demo we'll filter a larger set
        const categoryParam = selectedCategory !== 'All' ? `&categories=${selectedCategory.toLowerCase()}` : '';
        const response = await fetch(`https://min-api.cryptocompare.com/data/v2/news/?lang=EN${categoryParam}`);
        const data = await response.json();
        if (Array.isArray(data.Data)) {
          setNews(data.Data);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [selectedCategory]);

  const filteredNews = useMemo(() => {
    let results = [...news];
    
    // Filter by symbol/keyword
    if (localFilterSymbol) {
      results = results.filter(item => 
        item.title.toLowerCase().includes(localFilterSymbol.toLowerCase()) || 
        item.body.toLowerCase().includes(localFilterSymbol.toLowerCase()) ||
        item.source.toLowerCase().includes(localFilterSymbol.toLowerCase()) ||
        (item as any).categories?.toLowerCase().includes(localFilterSymbol.toLowerCase())
      );
    }

    if (selectedSource !== 'All') {
      results = results.filter(item => item.source.toLowerCase().includes(selectedSource.toLowerCase()));
    }

    // Sort
    results.sort((a, b) => {
      if (sortBy === 'newest') return b.published_on - a.published_on;
      return a.published_on - b.published_on;
    });

    return results.slice(0, 10);
  }, [news, selectedSource, localFilterSymbol, sortBy]);

  return (
    <div className={cn("px-4 pb-6", className)}>
      <div className="flex justify-between items-end mb-4 px-2">
        <h3 className="text-sm font-bold tracking-wider uppercase flex items-center gap-2">
          <Newspaper size={16} className="text-brand" />
          Market News
        </h3>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "text-[10px] font-bold tracking-widest uppercase flex items-center gap-1 transition-colors",
            showFilters ? "text-brand" : "text-text-dim hover:text-white"
          )}
        >
          <Filter size={12} />
          Filters
        </button>
      </div>

      {/* Filter Bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6 space-y-4"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center px-2">
                <p className="text-[8px] font-black text-text-dim uppercase tracking-widest">Symbol Search</p>
                {localFilterSymbol && (
                  <button 
                    onClick={() => setLocalFilterSymbol('')}
                    className="text-[8px] font-bold text-brand uppercase hover:underline"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              <div className="px-1">
                <div className="relative group">
                  <input 
                    type="text"
                    placeholder="Search keywords or symbols (BTC, ETH)..."
                    value={localFilterSymbol}
                    onChange={(e) => setLocalFilterSymbol(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold text-white outline-none focus:border-brand/50 transition-all placeholder:text-text-dim/30"
                  />
                  {propFilterSymbol && localFilterSymbol !== propFilterSymbol && (
                    <button 
                      onClick={() => setLocalFilterSymbol(propFilterSymbol)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[7px] font-black bg-brand/10 text-brand px-1.5 py-0.5 rounded uppercase tracking-tighter hover:bg-brand/20 transition-all"
                    >
                      Reset to {propFilterSymbol}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[8px] font-black text-text-dim uppercase tracking-widest px-2">Sort By</p>
              <div className="flex gap-2 px-1">
                {[
                  { id: 'newest', label: 'Newest First' },
                  { id: 'oldest', label: 'Oldest First' },
                ].map(sort => (
                  <button
                    key={sort.id}
                    onClick={() => setSortBy(sort.id as 'newest' | 'oldest')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-[10px] font-bold transition-all border",
                      sortBy === sort.id 
                        ? "bg-brand/10 border-brand text-brand" 
                        : "bg-white/5 border-transparent text-text-dim hover:bg-white/10"
                    )}
                  >
                    {sort.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[8px] font-black text-text-dim uppercase tracking-widest px-2">Categories</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all border shrink-0",
                      selectedCategory === cat 
                        ? "bg-brand/10 border-brand text-brand" 
                        : "bg-white/5 border-transparent text-text-dim hover:bg-white/10"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[8px] font-black text-text-dim uppercase tracking-widest px-2">Sources</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
                {SOURCES.map(source => (
                  <button
                    key={source}
                    onClick={() => setSelectedSource(source)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all border shrink-0",
                      selectedSource === source 
                        ? "bg-brand/10 border-brand text-brand" 
                        : "bg-white/5 border-transparent text-text-dim hover:bg-white/10"
                    )}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-4">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="glass-card p-4 rounded-2xl border border-white/5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-white/5 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-full" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : filteredNews.length > 0 ? (
          filteredNews.map((item, index) => (
            <motion.a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-4 rounded-2xl border border-white/5 hover:border-brand/30 transition-all group"
            >
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10">
                  <img 
                    src={item.imageurl} 
                    alt="" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-black text-brand uppercase tracking-widest">{item.source}</span>
                    <span className="text-[8px] text-text-dim flex items-center gap-1">
                      <Clock size={8} />
                      {new Date(item.published_on * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold leading-tight line-clamp-2 group-hover:text-brand transition-colors mb-2">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-1 text-[8px] font-bold text-text-dim uppercase tracking-tighter">
                    Read article <ExternalLink size={8} />
                  </div>
                </div>
              </div>
            </motion.a>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
            <Newspaper size={32} className="mb-2" />
            <p className="text-[10px] font-bold uppercase tracking-widest">No news found</p>
          </div>
        )}
      </div>
    </div>
  );
};
