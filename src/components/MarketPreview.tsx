import React from 'react';
import { useMarket } from '../context/MarketContext';
import { cn } from '../lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const MarketPreview: React.FC = () => {
  const { assets } = useMarket();

  return (
    <div className="bg-transparent overflow-hidden">
      <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 bg-white/5 text-[10px] font-bold text-text-muted uppercase tracking-widest hidden md:grid">
        <div className="col-span-4">Asset</div>
        <div className="col-span-4 text-right">Price (USD)</div>
        <div className="col-span-4 text-right">Performance</div>
      </div>

      <div className="flex flex-col">
        {assets.map((asset) => (
          <div 
            key={asset.id} 
            onClick={() => {
              window.dispatchEvent(new CustomEvent('select-asset', { detail: asset.symbol }));
              window.dispatchEvent(new CustomEvent('change-tab', { detail: 'trade' }));
            }}
            className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 px-6 py-5 border-b border-white/5 hover:bg-brand/5 transition-all cursor-pointer group active:scale-[0.99]"
          >
            <div className="col-span-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl overflow-hidden glass-panel border border-white/10 group-hover:border-brand/40 transition-colors">
                <img src={asset.icon} alt={asset.symbol} className="w-full h-full object-cover p-1.5" referrerPolicy="no-referrer" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-white group-hover:text-brand transition-colors tracking-tight">{asset.symbol}</h4>
                  <span className="text-[10px] font-bold text-text-muted uppercase">/{'USDT'}</span>
                </div>
                <p className="text-[10px] font-mono text-text-muted">Network: <span className="text-white/40 uppercase">{asset.symbol === 'BTC' ? 'Bitcoin' : 'EVM'}</span></p>
              </div>
            </div>
            
            <div className="col-span-4 md:text-right">
              <p className="text-sm md:text-lg font-black font-mono text-white tracking-tighter">
                {asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
              </p>
            </div>
            
            <div className="col-span-4 flex items-center md:justify-end gap-3">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black font-mono shadow-sm",
                asset.change24h >= 0 ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
              )}>
                {asset.change24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
