import React, { useState, useEffect, useMemo } from 'react';
import { cn, formatNumber } from '../lib/utils';
import { motion } from 'motion/react';

interface Order {
  price: number;
  amount: number;
  total: number;
  type: 'buy' | 'sell';
}

interface OrderWithDepth extends Order {
  cumulativeAmount: number;
  cumulativeValue: number;
}

export const OrderBook: React.FC<{ basePrice: number, symbol: string, initialViewMode?: 'book' | 'depth' }> = ({ basePrice, symbol, initialViewMode = 'book' }) => {
  const [orders, setOrders] = useState<{ buys: Order[], sells: Order[] }>({ buys: [], sells: [] });
  const [viewMode, setViewMode] = useState<'book' | 'depth'>(initialViewMode);

  useEffect(() => {
    // Generate initial dummy orders
    const generateOrders = () => {
      const sells: Order[] = [];
      const buys: Order[] = [];
      
      for (let i = 0; i < 15; i++) {
        const sellPrice = basePrice + (Math.random() * 1.5 + i * 0.3);
        const sellAmount = Math.random() * 8 + 2;
        sells.push({
          price: sellPrice,
          amount: sellAmount,
          total: sellPrice * sellAmount,
          type: 'sell'
        });

        const buyPrice = basePrice - (Math.random() * 1.5 + i * 0.3);
        const buyAmount = Math.random() * 8 + 2;
        buys.push({
          price: buyPrice,
          amount: buyAmount,
          total: buyPrice * buyAmount,
          type: 'buy'
        });
      }
      return { 
        sells: sells.sort((a, b) => b.price - a.price), 
        buys: buys.sort((a, b) => b.price - a.price) 
      };
    };

    setOrders(generateOrders());

    const interval = setInterval(() => {
      setOrders(prev => {
        const update = (list: Order[]) => {
          return list.map(o => {
            const newAmount = Math.max(0.1, o.amount + (Math.random() - 0.5) * 0.5);
            return {
              ...o,
              amount: newAmount,
              total: o.price * newAmount
            };
          });
        };
        return {
          buys: update(prev.buys),
          sells: update(prev.sells)
        };
      });
    }, 800);

    return () => clearInterval(interval);
  }, [basePrice]);

  const processedOrders = useMemo(() => {
    let cumulativeSellAmount = 0;
    let cumulativeSellValue = 0;
    // Calculate depth for sells: from lowest price upwards
    const sortedSells = [...orders.sells].sort((a, b) => a.price - b.price);
    const sellsWithDepth = sortedSells.map(order => {
      cumulativeSellAmount += order.amount;
      cumulativeSellValue += order.total;
      return { ...order, cumulativeAmount: cumulativeSellAmount, cumulativeValue: cumulativeSellValue };
    }).reverse(); // Reverse back for display: high price top

    let cumulativeBuyAmount = 0;
    let cumulativeBuyValue = 0;
    // Calculate depth for buys: from highest price downwards
    const sortedBuys = [...orders.buys].sort((a, b) => b.price - a.price);
    const buysWithDepth = sortedBuys.map(order => {
      cumulativeBuyAmount += order.amount;
      cumulativeBuyValue += order.total;
      return { ...order, cumulativeAmount: cumulativeBuyAmount, cumulativeValue: cumulativeBuyValue };
    });

    const maxCumulativeAmount = Math.max(cumulativeSellAmount, cumulativeBuyAmount, 1);
    const maxCumulativeValue = Math.max(cumulativeSellValue, cumulativeBuyValue, 1);

    return { 
      sells: sellsWithDepth, 
      buys: buysWithDepth, 
      maxCumulativeAmount, 
      maxCumulativeValue 
    };
  }, [orders]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center px-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-white">Order Book Engine</span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            <span className="text-[8px] font-bold text-brand uppercase tracking-tighter">Real-time Feed</span>
          </div>
        </div>
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
          <button 
            onClick={() => setViewMode('book')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase transition-all",
              viewMode === 'book' ? "bg-white/10 text-white" : "text-text-dim hover:text-white"
            )}
          >
            List View
          </button>
          <button 
            onClick={() => setViewMode('depth')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase transition-all",
              viewMode === 'depth' ? "bg-white/10 text-white" : "text-text-dim hover:text-white"
            )}
          >
            Depth Chart
          </button>
        </div>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden p-5 border border-white/5 shadow-2xl relative">
        {viewMode === 'book' ? (
          <>
            <div className="grid grid-cols-4 mb-3 text-[8px] font-black text-white/30 uppercase tracking-widest relative z-10 px-2">
              <span>Price ({symbol})</span>
              <span className="text-center">Size</span>
              <span className="text-center">Depth (Sum)</span>
              <span className="text-right">Total USDT</span>
            </div>

            <div className="flex flex-col gap-1 mb-3 max-h-[180px] overflow-hidden scrollbar-thin scrollbar-thumb-white/10">
              {processedOrders.sells.map((order, i) => {
                const percentage = (order.cumulativeAmount / processedOrders.maxCumulativeAmount) * 100;
                return (
                  <div key={`sell-${i}`} className="grid grid-cols-4 relative py-1.5 group px-2 rounded-lg hover:bg-white/5 transition-colors cursor-crosshair">
                    <div 
                      className="absolute inset-y-1 right-0 bg-red-500/10 transition-all duration-1000 pointer-events-none rounded-sm border-r-2 border-red-500/20" 
                      style={{ width: `${percentage}%` }}
                    />
                    <motion.span 
                      initial={false}
                      animate={{ color: '#ef4444' }}
                      className="text-[11px] font-black z-10"
                    >
                      {formatNumber(order.price, 2)}
                    </motion.span>
                    <span className="text-[10px] font-bold text-white/50 text-center z-10">{formatNumber(order.amount, 3)}</span>
                    <span className="text-[10px] font-bold text-white/80 text-center z-10">{formatNumber(order.cumulativeAmount, 3)}</span>
                    <span className="text-[10px] font-mono text-white/30 text-right z-10">{formatNumber(order.cumulativeValue, 2)}</span>
                  </div>
                );
              })}
            </div>

            <div className="py-4 border-y border-white/5 my-4 flex items-center justify-between px-3 bg-white/[0.02] rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(basePrice, 2)}</span>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-green-400 uppercase tracking-widest leading-none">+$124.50</span>
                  <span className="text-[7px] font-bold text-text-dim uppercase tracking-tighter mt-1">Spread: 0.01%</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-text-dim/40 uppercase block">Mark: {formatNumber(basePrice * 1.0001, 2)}</span>
                <span className="text-[9px] font-black text-text-dim/40 uppercase block mt-0.5">Index: {formatNumber(basePrice * 0.9998, 2)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 max-h-[180px] overflow-hidden scrollbar-thin scrollbar-thumb-white/10">
              {processedOrders.buys.map((order, i) => {
                const percentage = (order.cumulativeAmount / processedOrders.maxCumulativeAmount) * 100;
                return (
                  <div key={`buy-${i}`} className="grid grid-cols-4 relative py-1.5 group px-2 rounded-lg hover:bg-white/5 transition-colors cursor-crosshair">
                    <div 
                      className="absolute inset-y-1 right-0 bg-green-500/10 transition-all duration-1000 pointer-events-none rounded-sm border-r-2 border-green-500/20" 
                      style={{ width: `${percentage}%` }}
                    />
                    <motion.span 
                      initial={false}
                      animate={{ color: '#10b981' }}
                      className="text-[11px] font-black z-10"
                    >
                      {formatNumber(order.price, 2)}
                    </motion.span>
                    <span className="text-[10px] font-bold text-white/50 text-center z-10">{formatNumber(order.amount, 3)}</span>
                    <span className="text-[10px] font-bold text-white/80 text-center z-10">{formatNumber(order.cumulativeAmount, 3)}</span>
                    <span className="text-[10px] font-mono text-white/30 text-right z-10">{formatNumber(order.cumulativeValue, 2)}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-4 bg-[#10b981] hover:bg-[#059669] text-[#0a0f14] text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_8px_30px_rgba(16,185,129,0.3)] transition-all active:scale-95 group relative overflow-hidden">
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                <span className="relative z-10">Buy {symbol?.split('/')?.[0] || symbol || 'Asset'}</span>
              </button>
              <button className="flex-1 py-4 bg-[#ef4444] hover:bg-[#dc2626] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_8px_30px_rgba(239,68,68,0.3)] transition-all active:scale-95 group relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                <span className="relative z-10">Sell {symbol?.split('/')?.[0] || symbol || 'Asset'}</span>
              </button>
            </div>
          </>
        ) : (
          <div className="h-[400px] flex flex-col pt-4">
            <div className="flex-1 relative">
              <svg width="100%" height="100%" className="overflow-visible" preserveAspectRatio="none">
                {/* Bids Wall (Left/Bottom to Mid) */}
                <path
                  d={`
                    M 0 100 
                    ${processedOrders.buys.map((o, i) => {
                      const x = (i / processedOrders.buys.length) * 50;
                      const y = 100 - (o.cumulativeAmount / processedOrders.maxCumulativeAmount) * 100;
                      return `L ${x}% ${y}%`;
                    }).join(' ')}
                    L 50% 100% Z
                  `}
                  fill="url(#bidGradient)"
                  className="transition-all duration-500"
                />
                
                {/* Asks Wall (Mid to Right/Bottom) */}
                <path
                  d={`
                    M 50% 100%
                    ${[...processedOrders.sells].reverse().map((o, i) => {
                      const x = 50 + (i / processedOrders.sells.length) * 50;
                      const y = 100 - (o.cumulativeAmount / processedOrders.maxCumulativeAmount) * 100;
                      return `L ${x}% ${y}%`;
                    }).join(' ')}
                    L 100% 100% Z
                  `}
                  fill="url(#askGradient)"
                  className="transition-all duration-500"
                />

                <defs>
                  <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="askGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center Price Line */}
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 border-l border-white/20 z-10 flex items-center justify-center">
                 <div className="bg-bg-dark border border-white/10 p-2 rounded-lg shadow-xl backdrop-blur-md">
                    <p className="text-[10px] font-black text-white">{formatNumber(basePrice, 2)}</p>
                 </div>
              </div>
            </div>
            
            <div className="flex justify-between mt-4 px-2">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Buy Walls</span>
                <span className="text-[14px] font-bold text-white">{formatNumber(processedOrders.buys[processedOrders.buys.length-1]?.cumulativeAmount || 0, 2)} {symbol}</span>
              </div>
              <div className="text-right flex flex-col">
                <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Sell Walls</span>
                <span className="text-[14px] font-bold text-white">{formatNumber(processedOrders.sells[0]?.cumulativeAmount || 0, 2)} {symbol}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

