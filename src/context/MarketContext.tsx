import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_ASSETS } from '../constants';
import { Asset } from '../types';

interface MarketContextType {
  assets: Asset[];
  getAssetPrice: (symbol: string) => number;
}

const MarketContext = createContext<MarketContextType>({
  assets: INITIAL_ASSETS,
  getAssetPrice: (symbol) => 0,
});

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);

  useEffect(() => {
    // Simulate a real-time WebSocket feed
    const interval = setInterval(() => {
      setAssets(prevAssets => 
        prevAssets.map(asset => {
          // Add a small random fluctuation (-0.1% to +0.1%)
          const fluctuation = 1 + (Math.random() - 0.5) * 0.002;
          const newPrice = asset.price * fluctuation;
          
          // Update value based on balance
          const newValue = newPrice * asset.balance;
          
          return {
            ...asset,
            price: newPrice,
            value: newValue,
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getAssetPrice = (symbol: string) => {
    const asset = assets.find(a => a.symbol === symbol);
    return asset ? asset.price : 0;
  };

  return (
    <MarketContext.Provider value={{ assets, getAssetPrice }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => useContext(MarketContext);
