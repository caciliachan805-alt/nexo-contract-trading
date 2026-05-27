import React, { useState, useEffect, useMemo } from 'react';
import { useMarket } from '../context/MarketContext';
import { formatCurrency, formatNumber, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Clock, ChevronDown, X, Wallet, Info, ArrowUpRight, ArrowDownRight, Timer, TrendingUp, TrendingDown, CheckCircle2, Activity, Zap, Cpu, History, ShieldCheck, Bell, Plus, Minus, Trash2, AlertCircle, ZoomIn, ZoomOut, Search, Calendar, Filter, Edit2, Save, Star } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, AreaChart, XAxis, YAxis, CartesianGrid, Bar, Area, Tooltip, ReferenceLine } from 'recharts';
import { placeTrade, createTransaction, createAlert, deleteAlert, updateAlertStatus, subscribeToUserAlerts, subscribeToUserTrades } from '../lib/firestoreService';
import { useUser } from '../context/UserContext';
import { OrderBook } from './OrderBook';
import { AlertsD3Chart } from './AlertsD3Chart';
import { DateRangePicker } from './DateRangePicker';
import { Trade, PriceAlert } from '../types';
import { toast } from 'sonner';

interface TradeDetailProps {
  onBack: () => void;
}

export const TradeDetail: React.FC<TradeDetailProps> = ({ onBack }) => {
  const { assets } = useMarket();
  const { appUser, user } = useUser();
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const asset = assets.find(a => a.symbol === selectedSymbol) || assets[0] || { symbol: 'BTC', price: 80886.47, change24h: 0.5 };
  
  const [direction, setDirection] = useState<'Upward' | 'Down'>('Upward');
  const [tradeType, setTradeType] = useState<'market' | 'limit' | 'stop-loss' | 'take-profit'>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [limitPriceError, setLimitPriceError] = useState<string | null>(null);
  const [triggerPrice, setTriggerPrice] = useState('');
  const [triggerPriceError, setTriggerPriceError] = useState<string | null>(null);
  const [deliveryTime, setDeliveryTime] = useState('60 S');
  const [quantity, setQuantity] = useState('');
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [orderSize, setOrderSize] = useState('');
  const [orderSizeError, setOrderSizeError] = useState<string | null>(null);
  const [tpError, setTpError] = useState<string | null>(null);
  const [slError, setSlError] = useState<string | null>(null);
  const [isSlEnabled, setIsSlEnabled] = useState(false);
  const [isTpEnabled, setIsTpEnabled] = useState(false);
  const [isTrading, setIsTrading] = useState(false);
  const [activeTrade, setActiveTrade] = useState<Trade | null>(null);
  const [countdown, setCountdown] = useState(0);

  const [chartData, setChartData] = useState<any[]>([]);
  const [zoomLevel, setZoomLevel] = useState(60); 
  const [userTrades, setUserTrades] = useState<Trade[]>([]);

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [alertFilterAsset, setAlertFilterAsset] = useState<'current' | 'all'>('current');
  const [alertFilterStatus, setAlertFilterStatus] = useState<'all' | 'active' | 'triggered'>('all');
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above');
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'activity' | 'depth' | 'book' | 'alerts'>('book');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [pendingStopLoss, setPendingStopLoss] = useState<string | null>(null);
  const [pendingTakeProfit, setPendingTakeProfit] = useState<string | null>(null);
  const [tradeFilter, setTradeFilter] = useState<'all' | 'pending' | 'won' | 'lost'>('all');
  const [tradeAssetFilter, setTradeAssetFilter] = useState<string>('all');
  const [tradeDirectionFilter, setTradeDirectionFilter] = useState<'all' | 'up' | 'down'>('all');
  const [showCurrentAssetOnly, setShowCurrentAssetOnly] = useState(false);
  const [tradeSearch, setTradeSearch] = useState('');
  const [tradeAmountMin, setTradeAmountMin] = useState('');
  const [tradeAmountMax, setTradeAmountMax] = useState('');
  const [tradeDateFrom, setTradeDateFrom] = useState<string>(() => {
    try {
      return localStorage.getItem('trade_date_from') || '';
    } catch (e) {
      return '';
    }
  });
  const [tradeDateTo, setTradeDateTo] = useState<string>(() => {
    try {
      return localStorage.getItem('trade_date_to') || '';
    } catch (e) {
      return '';
    }
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [showSymbolModal, setShowSymbolModal] = useState(false);
  const [autoTrade, setAutoTrade] = useState(false);

  // States for post-placement order editing
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [editedPrice, setEditedPrice] = useState<string>('');
  const [editedTakeProfit, setEditedTakeProfit] = useState<string>('');
  const [editedStopLoss, setEditedStopLoss] = useState<string>('');

  const [modalCategory, setModalCategory] = useState<'all' | 'favorites' | 'most-traded' | 'new'>('all');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('asset_favorites');
      return saved ? JSON.parse(saved) : ['BTC', 'ETH', 'SOL'];
    } catch (e) {
      return ['BTC', 'ETH', 'SOL'];
    }
  });

  const mostTradedSymbols = useMemo(() => ['BTC', 'ETH', 'SOL', 'BNB', 'DOGE', 'PEPE', 'USDT'], []);
  const newSymbols = useMemo(() => ['PEPE', 'APT', 'ARB', 'OP', 'STX', 'NEAR', 'SHIB'], []);

  useEffect(() => {
    try {
      if (tradeDateFrom) {
        localStorage.setItem('trade_date_from', tradeDateFrom);
      } else {
        localStorage.removeItem('trade_date_from');
      }
    } catch (e) {
      console.error(e);
    }
  }, [tradeDateFrom]);

  useEffect(() => {
    try {
      if (tradeDateTo) {
        localStorage.setItem('trade_date_to', tradeDateTo);
      } else {
        localStorage.removeItem('trade_date_to');
      }
    } catch (e) {
      console.error(e);
    }
  }, [tradeDateTo]);

  const toggleFavorite = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation(); // Prevent selecting the asset
    setFavorites(prev => {
      const updated = prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol];
      try {
        localStorage.setItem('asset_favorites', JSON.stringify(updated));
      } catch (err) {
        console.error("Storage error:", err);
      }
      return updated;
    });
    const isNowFavorite = !favorites.includes(symbol);
    toast.success(isNowFavorite ? `${symbol} synced to favorites` : `${symbol} removed from favorites`, {
      icon: <Star className={cn("text-amber-400", isNowFavorite && "fill-amber-400")} size={14} />
    });
  };

  const filteredAssets = assets.filter(a => 
    a.symbol.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
    a.name.toLowerCase().includes(assetSearchQuery.toLowerCase())
  );

  const modalFilteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchesSearch = a.symbol.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
                            a.name.toLowerCase().includes(assetSearchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (modalCategory === 'favorites') {
        return favorites.includes(a.symbol);
      }
      if (modalCategory === 'most-traded') {
        return mostTradedSymbols.includes(a.symbol);
      }
      if (modalCategory === 'new') {
        return newSymbols.includes(a.symbol);
      }
      return true;
    });
  }, [assets, assetSearchQuery, modalCategory, favorites, mostTradedSymbols, newSymbols]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesAsset = alertFilterAsset === 'all' || alert.asset === asset.symbol;
      const matchesStatus = alertFilterStatus === 'all' || alert.status === alertFilterStatus;
      return matchesAsset && matchesStatus;
    });
  }, [alerts, alertFilterAsset, alertFilterStatus, asset.symbol]);

  const openTradesForCurrentAsset = useMemo(() => {
    return userTrades.filter(t => t.asset === asset.symbol && t.status === 'pending');
  }, [userTrades, asset.symbol]);
  const [winProbability, setWinProbability] = useState(70);
  const [leverage, setLeverage] = useState(20);
  const [leverageInput, setLeverageInput] = useState('20');
  const [leverageError, setLeverageError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const unsubscribeAlerts = subscribeToUserAlerts(user.uid, setAlerts);
      const unsubscribeTrades = subscribeToUserTrades(user.uid, (trades) => {
        // Sort trades by timestamp descending
        const sortedTrades = [...trades].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setUserTrades(sortedTrades);
      });
      return () => {
        unsubscribeAlerts();
        unsubscribeTrades();
      };
    }
  }, [user]);

  // Real-time chart update logic
  useEffect(() => {
    // Initial data generation
    const basePrice = asset.price;
    const initialData = Array.from({ length: 500 }, (_, i) => {
      const p = basePrice + (Math.random() - 0.5) * 200;
      return {
        time: i,
        price: p,
        volume: Math.random() * 1000 + 500
      };
    });
    setChartData(initialData);

    // Live update interval
    const interval = setInterval(() => {
      setChartData(prev => {
        const lastPoint = prev[prev.length - 1];
        const nextTime = lastPoint.time + 1;
        const volatility = asset.price * 0.0005; 
        const nextPrice = lastPoint.price + (Math.random() - 0.5) * volatility;
        
        const newDataPoint = {
          time: nextTime,
          price: nextPrice,
          volume: Math.random() * 1000 + 500
        };

        // Keep a healthy buffer of 1000 points for zooming
        const updated = [...prev, newDataPoint].slice(-1000);
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [asset.symbol]); // Re-init on asset change

  // Alert monitoring logic
  useEffect(() => {
    const activeAlerts = alerts.filter(a => a.status === 'active' && a.asset === asset.symbol);
    activeAlerts.forEach(async (alert) => {
      const isAbove = alert.condition === 'above';
      const triggered = isAbove ? asset.price >= alert.threshold : asset.price <= alert.threshold;
      
      if (triggered) {
        toast.info(`NETWORK ALERT: ${alert.asset} has breached terminal threshold of ${formatCurrency(alert.threshold)}`, {
          icon: <Bell className="text-brand" />,
          duration: 8000
        });
        await updateAlertStatus(alert.id, 'triggered');
      }
    });
  }, [asset.price, alerts, asset.symbol]);

  const handleCreateAlert = async () => {
    if (!user) {
      toast.error("Auth session required");
      return;
    }
    const price = parseFloat(alertPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Invalid threshold value");
      return;
    }

    try {
      await createAlert({
        id: `alt_${Math.random().toString(36).substring(7)}`,
        userId: user.uid,
        asset: asset.symbol,
        threshold: price,
        condition: alertCondition,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      setShowAlertForm(false);
      setAlertPrice('');
      toast.success("Protocol alert synchronized");
    } catch (e) {
      toast.error("Alert sync failed");
    }
  };

  useEffect(() => {
    const handleSelectAsset = (e: any) => setSelectedSymbol(e.detail);
    window.addEventListener('select-asset', handleSelectAsset);
    return () => window.removeEventListener('select-asset', handleSelectAsset);
  }, []);

  const deliveryTimes = [
    { time: '60 S', seconds: 60, return: '40 %', rate: 0.4 },
    { time: '120 S', seconds: 120, return: '50 %', rate: 0.5 },
    { time: '170 S', seconds: 170, return: '70 %', rate: 0.7 },
    { time: '300 S', seconds: 300, return: '100 %', rate: 1.0 },
  ];

  const handlePlaceTrade = async () => {
    if (!user || !appUser) {
      toast.error("Authentication required");
      return;
    }

    const amount = parseFloat(quantity);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid execution amount");
      return;
    }

    if (tradeType === 'limit') {
      const price = parseFloat(limitPrice);
      if (isNaN(price) || price <= 0) {
        toast.error("Invalid limit price");
        return;
      }
      if (direction === 'Upward' && price >= asset.price) {
        toast.error("Limit price for Long must be below current price");
        return;
      }
      if (direction === 'Down' && price <= asset.price) {
        toast.error("Limit price for Short must be above current price");
        return;
      }
    }

    if (tradeType === 'stop-loss' || tradeType === 'take-profit') {
      const price = parseFloat(triggerPrice);
      if (isNaN(price) || price <= 0) {
        toast.error(`Invalid ${tradeType === 'stop-loss' ? 'stop' : 'profit'} target price`);
        return;
      }
      if (tradeType === 'stop-loss') {
        if (direction === 'Upward' && price >= asset.price) {
          toast.error("Stop loss trigger for Long must be below current price");
          return;
        }
        if (direction === 'Down' && price <= asset.price) {
          toast.error("Stop loss trigger for Short must be above current price");
          return;
        }
      } else {
        if (direction === 'Upward' && price <= asset.price) {
          toast.error("Take profit trigger for Long must be above current price");
          return;
        }
        if (direction === 'Down' && price >= asset.price) {
          toast.error("Take profit trigger for Short must be below current price");
          return;
        }
      }
    }

    if (amount > (appUser.availableBalance || 0)) {
      toast.error("Insufficient liquidity");
      return;
    }

    const selectedTime = deliveryTimes.find(t => t.time === deliveryTime)!;
    
    const tradeId = Math.random().toString(36).substring(7);
    let entryPrice = asset.price;
    if (tradeType === 'limit') entryPrice = parseFloat(limitPrice);
    if (tradeType === 'stop-loss' || tradeType === 'take-profit') entryPrice = parseFloat(triggerPrice);

    // TP/SL Validation
    if (takeProfit) {
      const tp = parseFloat(takeProfit);
      if (direction === 'Upward' && tp <= entryPrice) {
        toast.error("Take Profit must be above entry for Long positions");
        return;
      }
      if (direction === 'Down' && tp >= entryPrice) {
        toast.error("Take Profit must be below entry for Short positions");
        return;
      }
    }

    if (stopLoss) {
      const sl = parseFloat(stopLoss);
      if (direction === 'Upward' && sl >= entryPrice) {
        toast.error("Stop Loss must be below entry for Long positions");
        return;
      }
      if (direction === 'Down' && sl <= entryPrice) {
        toast.error("Stop Loss must be above entry for Short positions");
        return;
      }
    }

    const newTrade: Trade = {
      id: tradeId,
      userId: user.uid,
      asset: asset.symbol,
      direction: direction === 'Upward' ? 'up' : 'down',
      duration: selectedTime.seconds,
      amount: amount,
      leverage: leverage,
      priceAtEntry: entryPrice,
      returnRate: selectedTime.rate,
      tradeType: tradeType,
      ...(isSlEnabled && stopLoss ? { stopLoss: parseFloat(stopLoss) } : {}),
      ...(isTpEnabled && takeProfit ? { takeProfit: parseFloat(takeProfit) } : {}),
      timestamp: new Date().toISOString(),
      endTime: new Date(Date.now() + selectedTime.seconds * 1000).toISOString(),
      status: 'pending',
    };

    try {
      setIsTrading(true);
      await placeTrade(newTrade);
      setActiveTrade(newTrade);
      setCountdown(selectedTime.seconds);
      toast.success("Position opened successfully");
      setStep(1);
      setQuantity('');
      setStopLoss('');
      setTakeProfit('');
      setPendingStopLoss(null);
      setPendingTakeProfit(null);
      setQuantityError(null);

      await createTransaction({
        id: `tx_${tradeId}`,
        userId: user.uid,
        type: 'transfer',
        amountTo: -amount,
        timestamp: new Date().toISOString(),
        status: 'approved',
      });
    } catch (error) {
      toast.error("Execution failed");
      setIsTrading(false);
    }
  };

  useEffect(() => {
    if (countdown > 0 && isTrading) {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (countdown === 0 && isTrading && activeTrade) {
      settleTrade();
    }
  }, [countdown, isTrading]);

  useEffect(() => {
    if (isTrading && activeTrade) {
      const tp = activeTrade.takeProfit;
      const sl = activeTrade.stopLoss;
      const dir = activeTrade.direction;
      const currentPrice = asset.price;

      if (dir === 'up') {
        if (tp && currentPrice >= tp) {
          settleTrade(true);
        } else if (sl && currentPrice <= sl) {
          settleTrade(false);
        }
      } else {
        if (tp && currentPrice <= tp) {
          settleTrade(true);
        } else if (sl && currentPrice >= sl) {
          settleTrade(false);
        }
      }
    }
  }, [asset.price, isTrading, activeTrade]);

  const settleTrade = async (forcedResult?: boolean) => {
    if (!activeTrade || !user) return;
    
    // Determine result based on Auto-Trade protocol or direct forcedResult
    let won: boolean;
    if (forcedResult !== undefined) {
      won = forcedResult;
    } else if (autoTrade) {
      won = Math.random() < (winProbability / 100);
    } else {
      // Realistic check based on price movement
      const entry = activeTrade.priceAtEntry;
      const exit = asset.price;
      if (activeTrade.direction === 'up') {
        won = exit > entry;
      } else {
        won = exit < entry;
      }
    }

    const profit = won ? activeTrade.amount * (1 + activeTrade.returnRate) : 0;
    
    const settledTrade: Trade = {
      ...activeTrade,
      status: won ? 'won' : 'lost',
      profit: won ? profit : -activeTrade.amount,
      priceAtExit: asset.price
    };

    try {
      await placeTrade(settledTrade);
      if (won) {
        await createTransaction({
          id: `win_${activeTrade.id}`,
          userId: user.uid,
          type: 'trade_profit',
          amountTo: profit,
          timestamp: new Date().toISOString(),
          status: 'approved',
        });
        toast.success(`PROFIT SECURED: +$${profit.toFixed(2)}`, { icon: <Zap className="text-emerald-500" /> });
      } else {
        toast.error("POSITION LIQUIDATED");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsTrading(false);
      setActiveTrade(null);
    }
  };

  const handleSaveEditedTrade = async (tradeId: string) => {
    const originalTrade = userTrades.find(t => t.id === tradeId);
    if (!originalTrade) return;

    const newPriceVal = parseFloat(editedPrice);
    if (isNaN(newPriceVal) || newPriceVal <= 0) {
      toast.error("Invalid target/limit price");
      return;
    }

    // Determine current asset price
    const tradeAsset = assets.find(a => a.symbol === originalTrade.asset);
    const currentPrice = tradeAsset ? tradeAsset.price : asset.price;

    // Validate limit order price updates
    if (originalTrade.tradeType === 'limit') {
      if (originalTrade.direction === 'up') {
        if (newPriceVal >= currentPrice) {
          toast.error(`Limit price for Long must be less than current price ($${currentPrice.toFixed(2)})`);
          return;
        }
      } else if (originalTrade.direction === 'down') {
        if (newPriceVal <= currentPrice) {
          toast.error(`Limit price for Short must be greater than current price ($${currentPrice.toFixed(2)})`);
          return;
        }
      }
    }

    let tpVal: number | undefined = undefined;
    if (editedTakeProfit.trim() !== '') {
      tpVal = parseFloat(editedTakeProfit);
      if (isNaN(tpVal) || tpVal <= 0) {
        toast.error("Invalid Take Profit price");
        return;
      }
      if (originalTrade.direction === 'up' && tpVal <= newPriceVal) {
        toast.error("Take Profit must be above entry price for Long positions");
        return;
      }
      if (originalTrade.direction === 'down' && tpVal >= newPriceVal) {
        toast.error("Take Profit must be below entry price for Short positions");
        return;
      }
    }

    let slVal: number | undefined = undefined;
    if (editedStopLoss.trim() !== '') {
      slVal = parseFloat(editedStopLoss);
      if (isNaN(slVal) || slVal <= 0) {
        toast.error("Invalid Stop Loss price");
        return;
      }
      if (originalTrade.direction === 'up' && slVal >= newPriceVal) {
        toast.error("Stop Loss must be below entry price for Long positions");
        return;
      }
      if (originalTrade.direction === 'down' && slVal <= newPriceVal) {
        toast.error("Stop Loss must be above entry price for Short positions");
        return;
      }
    }

    // Now construct the updated trade
    const updatedTrade: Trade = {
      ...originalTrade,
      priceAtEntry: newPriceVal,
      ...(tpVal !== undefined ? { takeProfit: tpVal } : {}),
      ...(slVal !== undefined ? { stopLoss: slVal } : {})
    };

    // If takeProfit or stopLoss are empty in inputs, we should make sure they are removed
    if (editedTakeProfit.trim() === '') {
      delete updatedTrade.takeProfit;
    }
    if (editedStopLoss.trim() === '') {
      delete updatedTrade.stopLoss;
    }

    try {
      await placeTrade(updatedTrade);
      toast.success("Order updated successfully");
      setEditingTradeId(null);
    } catch (err) {
      toast.error("Could not update order");
    }
  };

  const filteredTrades = useMemo(() => {
    return userTrades.filter(t => {
      const matchesFilter = tradeFilter === 'all' || t.status === tradeFilter;
      const matchesAssetFilter = tradeAssetFilter === 'all' || t.asset === tradeAssetFilter;
      const assetInfo = assets.find(a => a.symbol === t.asset);
      const matchesSearch = t.asset.toLowerCase().includes(tradeSearch.toLowerCase()) || 
                           `${t.asset}/USDT`.toLowerCase().includes(tradeSearch.toLowerCase()) ||
                           `${t.asset}USDT`.toLowerCase().includes(tradeSearch.toLowerCase()) ||
                           (assetInfo?.name.toLowerCase().includes(tradeSearch.toLowerCase()) ?? false);
      const matchesDirection = tradeDirectionFilter === 'all' || t.direction === tradeDirectionFilter;
      const matchesCurrentAsset = !showCurrentAssetOnly || t.asset === asset.symbol;

      // Amount Filter
      const amount = t.amount;
      const min = tradeAmountMin ? parseFloat(tradeAmountMin) : -Infinity;
      const max = tradeAmountMax ? parseFloat(tradeAmountMax) : Infinity;
      const matchesAmount = (isNaN(min) || amount >= min) && (isNaN(max) || amount <= max);

      // Date Filter - Use string comparison to avoid timezone shifts
      const tradeDateStr = t.timestamp.split('T')[0];
      const matchesDate = (!tradeDateFrom || tradeDateStr >= tradeDateFrom) && (!tradeDateTo || tradeDateStr <= tradeDateTo);

      return matchesFilter && matchesAssetFilter && matchesSearch && matchesDirection && matchesCurrentAsset && matchesAmount && matchesDate;
    });
  }, [userTrades, tradeFilter, tradeAssetFilter, tradeSearch, tradeDirectionFilter, showCurrentAssetOnly, asset.symbol, assets, tradeAmountMin, tradeAmountMax, tradeDateFrom, tradeDateTo]);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAutoTradeModal, setShowAutoTradeModal] = useState(false);
  const [showStopLossModal, setShowStopLossModal] = useState(false);
  const [showTakeProfitModal, setShowTakeProfitModal] = useState(false);
  const [acceptedRisks, setAcceptedRisks] = useState(false);
  const [acceptedAutoTradeRisks, setAcceptedAutoTradeRisks] = useState(false);
  const [step, setStep] = useState(1);

  const validateTp = (value: string) => {
    if (!value) {
      setTpError(null);
      return true;
    }
    const tp = parseFloat(value);
    if (isNaN(tp) || tp <= 0) {
      setTpError("Invalid price target");
      return false;
    }
    const referencePrice = tradeType === 'limit' ? (parseFloat(limitPrice) || asset.price) : asset.price;
    if (direction === 'Upward') {
      if (tp <= referencePrice) {
        setTpError(`Price must be > entry (${referencePrice.toFixed(2)})`);
        return false;
      }
    } else {
      if (tp >= referencePrice) {
        setTpError(`Price must be < entry (${referencePrice.toFixed(2)})`);
        return false;
      }
    }
    setTpError(null);
    return true;
  };

  const validateSl = (value: string) => {
    if (!value) {
      setSlError(null);
      return true;
    }
    const sl = parseFloat(value);
    if (isNaN(sl) || sl <= 0) {
      setSlError("Invalid stop price");
      return false;
    }
    const referencePrice = tradeType === 'limit' ? (parseFloat(limitPrice) || asset.price) : asset.price;
    if (direction === 'Upward') {
      if (sl >= referencePrice) {
        setSlError(`Stop must be < entry (${referencePrice.toFixed(2)})`);
        return false;
      }
    } else {
      if (sl <= referencePrice) {
        setSlError(`Stop must be > entry (${referencePrice.toFixed(2)})`);
        return false;
      }
    }
    setSlError(null);
    return true;
  };

  const calculatePnL = (targetPrice: string) => {
    const target = parseFloat(targetPrice);
    const amt = parseFloat(quantity);
    if (isNaN(target) || isNaN(amt) || !asset.price || amt <= 0) return 0;
    
    const entryPrice = tradeType === 'limit' ? parseFloat(limitPrice) : asset.price;
    if (isNaN(entryPrice) || entryPrice <= 0) return 0;

    const priceDiff = (target - entryPrice) / entryPrice;
    const multiplier = direction === 'Upward' ? 1 : -1;
    return priceDiff * amt * leverage * multiplier;
  };

  const calculateRR = () => {
    if (!takeProfit || !stopLoss || !!tpError || !!slError) return null;
    const tpPnL = Math.abs(calculatePnL(takeProfit));
    const slPnL = Math.abs(calculatePnL(stopLoss));
    if (slPnL === 0) return null;
    return (tpPnL / slPnL).toFixed(2);
  };

  useEffect(() => {
    if (takeProfit) validateTp(takeProfit);
    if (stopLoss) validateSl(stopLoss);
  }, [direction]);

  const validateLeverage = (value: string) => {
    if (!value || value.trim() === '') {
      setLeverageError("Leverage amount is required");
      return false;
    }
    const num = parseInt(value);
    if (isNaN(num)) {
      setLeverageError("Please enter a valid numerical leverage");
      return false;
    }
    if (num < 1) {
      setLeverageError("Minimum leverage is 1x");
      return false;
    }
    if (num > 100) {
      setLeverageError("Maximum protocol leverage is 100x");
      return false;
    }
    setLeverageError(null);
    return true;
  };

  const validateQuantity = (value: string) => {
    const amount = parseFloat(value);
    if (!value) {
      setQuantityError(null);
      return false;
    }
    if (isNaN(amount) || amount <= 0) {
      setQuantityError("Order size must be a positive number");
      return false;
    }
    if (amount > (appUser?.availableBalance || 0)) {
      setQuantityError("Insufficient liquidity in protocol wallet");
      return false;
    }
    setQuantityError(null);
    return true;
  };

  const validateOrderSize = (value: string) => {
    const size = parseFloat(value);
    if (!value) {
      setOrderSizeError(null);
      return false;
    }
    if (isNaN(size) || size <= 0) {
      setOrderSizeError("Order size must be a positive number");
      return false;
    }
    setOrderSizeError(null);
    return true;
  };

  useEffect(() => {
    const qty = parseFloat(quantity);
    if (!isNaN(qty) && qty > 0 && leverage > 0) {
      const size = (qty * leverage).toFixed(2);
      if (size !== orderSize) {
        setOrderSize(size);
        setOrderSizeError(null);
      }
    } else if (orderSize !== '') {
      setOrderSize('');
    }
  }, [leverage, quantity]);

  const validateLimitPrice = (value: string) => {
    if (!value) {
      setLimitPriceError(null);
      return true;
    }
    const price = parseFloat(value);
    if (isNaN(price) || price <= 0) {
      setLimitPriceError("Invalid price");
      return false;
    }
    if (direction === 'Upward') {
      if (price >= asset.price) {
        setLimitPriceError(`Limit must be < current (${asset.price.toFixed(2)})`);
        return false;
      }
    } else if (direction === 'Down') {
      if (price <= asset.price) {
        setLimitPriceError(`Limit must be > current (${asset.price.toFixed(2)})`);
        return false;
      }
    }
    setLimitPriceError(null);
    return true;
  };

  const validateTriggerPrice = (value: string) => {
    if (!value) {
      setTriggerPriceError(null);
      return true;
    }
    const price = parseFloat(value);
    if (isNaN(price) || price <= 0) {
      setTriggerPriceError("Invalid trigger price");
      return false;
    }
    
    if (tradeType === 'stop-loss') {
      if (direction === 'Upward') {
        if (price >= asset.price) {
          setTriggerPriceError(`Stop must be < current (${asset.price.toFixed(2)})`);
          return false;
        }
      } else {
        if (price <= asset.price) {
          setTriggerPriceError(`Stop must be > current (${asset.price.toFixed(2)})`);
          return false;
        }
      }
    } else if (tradeType === 'take-profit') {
      if (direction === 'Upward') {
        if (price <= asset.price) {
          setTriggerPriceError(`Target must be > current (${asset.price.toFixed(2)})`);
          return false;
        }
      } else {
        if (price >= asset.price) {
          setTriggerPriceError(`Target must be < current (${asset.price.toFixed(2)})`);
          return false;
        }
      }
    }
    
    setTriggerPriceError(null);
    return true;
  };

  useEffect(() => {
    if (tradeType === 'limit' && limitPrice) {
      validateLimitPrice(limitPrice);
    }
    if ((tradeType === 'stop-loss' || tradeType === 'take-profit') && triggerPrice) {
      validateTriggerPrice(triggerPrice);
    }
  }, [direction, asset.price, tradeType, limitPrice, triggerPrice]);

  useEffect(() => {
    if (tradeType === 'limit') {
      const offset = asset.price * 0.05;
      const target = direction === 'Upward' ? asset.price - offset : asset.price + offset;
      setLimitPrice(target.toFixed(2));
      setLimitPriceError(null);
    }
    if (tradeType === 'stop-loss') {
      const offset = asset.price * 0.05;
      const target = direction === 'Upward' ? asset.price - offset : asset.price + offset;
      setTriggerPrice(target.toFixed(2));
      setTriggerPriceError(null);
    }
    if (tradeType === 'take-profit') {
      const offset = asset.price * 0.05;
      const target = direction === 'Upward' ? asset.price + offset : asset.price - offset;
      setTriggerPrice(target.toFixed(2));
      setTriggerPriceError(null);
    }
  }, [tradeType, direction]);

  const handleNextStep = () => {
    if (step === 1) {
      if (tradeType === 'limit') {
        const isValid = validateLimitPrice(limitPrice);
        if (!isValid || !limitPrice) {
          if (!limitPrice) setLimitPriceError("Limit price required");
          return;
        }
      }
      if (tradeType === 'stop-loss' || tradeType === 'take-profit') {
        const isValid = validateTriggerPrice(triggerPrice);
        if (!isValid || !triggerPrice) {
          if (!triggerPrice) setTriggerPriceError("Trigger price required");
          return;
        }
      }
    }
    if (step === 2) {
      const isQuantityValid = validateQuantity(quantity);
      const isLeverageValid = validateLeverage(leverageInput);
      const isOrderSizeValid = validateOrderSize(orderSize);
      const isTpValid = isTpEnabled ? validateTp(takeProfit) : true;
      const isSlValid = isSlEnabled ? validateSl(stopLoss) : true;
      
      if (!isQuantityValid || !isLeverageValid || !isOrderSizeValid || (isTpEnabled && !isTpValid) || (isSlEnabled && !isSlValid)) {
        return;
      }
    }
    if (step === 3) {
      setShowConfirmModal(true);
      return;
    }
    setStep(prev => Math.min(prev + 1, 3));
  };

  const isNextDisabled = () => {
    if (step === 2) {
      return !!leverageError || (quantity !== '' && !!quantityError) || (orderSize !== '' && !!orderSizeError) || quantity === '' || orderSize === '' || (isTpEnabled && !!tpError) || (isSlEnabled && !!slError);
    }
    return false;
  };

  const handlePrevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  return (
    <div className="fixed inset-0 bg-bg-dark text-white overflow-hidden font-sans z-[60] flex flex-col md:flex-row">
      {/* Left Sidebar - Symbol Browser (Hidden on Mobile) */}
      <div className="hidden lg:flex w-72 flex-shrink-0 flex-col border-r border-white/5 bg-black/40 tech-grid">
         <div className="p-6 border-b border-white/5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
               <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">Terminal Asset List</h3>
               <button onClick={onBack} className="text-text-muted hover:text-white"><ArrowLeft size={18} /></button>
            </div>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search..." 
                value={assetSearchQuery}
                onChange={(e) => setAssetSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold outline-none focus:border-brand/40 placeholder:text-text-muted/30"
              />
            </div>
         </div>
         <div className="flex-1 overflow-y-auto no-scrollbar">
            {filteredAssets.map(a => (
              <button 
                key={a.symbol}
                onClick={() => {
                  setSelectedSymbol(a.symbol);
                  setStep(1); // Reset to step 1 on asset change
                  setQuantityError(null);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-6 py-4 border-b border-white/5 transition-all text-left",
                  selectedSymbol === a.symbol ? "bg-brand/10 border-l-2 border-l-brand" : "hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <img src={a.icon} alt={a.symbol} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                  <div>
                    <p className={cn("text-xs font-black", selectedSymbol === a.symbol ? "text-brand" : "text-white")}>{a.symbol}/USDT</p>
                    <p className="text-[10px] text-text-muted uppercase font-mono">{a.price.toFixed(2)}</p>
                  </div>
                </div>
                <span className={cn("text-[10px] font-mono font-bold", a.change24h >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {a.change24h > 0 ? '+' : ''}{a.change24h.toFixed(2)}%
                </span>
              </button>
            ))}
         </div>
      </div>

      {/* Main Terminal Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-black/40 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-text-muted"><ArrowLeft size={20} /></button>
            <button 
              onClick={() => setShowSymbolModal(true)}
              className="flex items-center gap-2 group active:scale-95 transition-transform"
            >
               <div className="relative">
                 <img src={asset.icon} className="w-6 h-6 rounded-full" />
                 <div className="absolute -bottom-1 -right-1 bg-brand rounded-full p-0.5 border border-bg-dark">
                   <ChevronDown size={8} className="text-bg-dark" />
                 </div>
               </div>
               <div>
                 <div className="flex items-center gap-1">
                   <h2 className="text-sm font-black tracking-tight">{asset.symbol}/USDT</h2>
                   <ChevronDown size={12} className="text-text-muted" />
                 </div>
                 <div className="flex items-center gap-2">
                   <span className={cn("text-[9px] font-mono font-bold", asset.change24h >= 0 ? "text-emerald-500" : "text-rose-500")}>
                     {asset.price.toFixed(2)}
                   </span>
                   <span className={cn("text-[8px] font-mono", asset.change24h >= 0 ? "text-emerald-500/70" : "text-rose-500/70")}>
                     {asset.change24h > 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                   </span>
                 </div>
               </div>
            </button>
          </div>
          <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-mono leading-none bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             LIVE
          </div>
        </header>

        {/* Desktop Header Stats */}
        <div className="hidden lg:flex items-center gap-12 px-8 py-4 bg-black/20 border-b border-white/5">
           <div className="flex items-center gap-4">
              <img src={asset.icon} className="w-10 h-10 rounded-xl glass-panel p-1.5" />
              <div>
                <h1 className="text-xl font-black tracking-tighter leading-none">{asset.symbol}/USDT</h1>
                <p className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                  <Activity size={10} /> Liquidity Protocol Active
                </p>
              </div>
           </div>

           <div className="space-y-1">
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Mark Price</p>
              <p className={cn("text-xl font-black font-mono tracking-tighter leading-none", asset.change24h >= 0 ? "text-emerald-500" : "text-rose-500")}>
                {asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
           </div>

           <div className="space-y-1">
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">24H Change</p>
              <p className={cn("text-sm font-black font-mono leading-none", asset.change24h >= 0 ? "text-emerald-500" : "text-rose-500")}>
                {asset.change24h > 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
              </p>
           </div>

           <div className="w-24 h-10 hidden xl:block ml-4">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={chartData.slice(-30)}>
                 <Area 
                   type="monotone" 
                   dataKey="price" 
                   stroke={asset.change24h >= 0 ? "#10b981" : "#f43f5e"} 
                   fill={asset.change24h >= 0 ? "#10b98110" : "#f43f5e10"} 
                   strokeWidth={2} 
                   isAnimationActive={false} 
                 />
               </AreaChart>
             </ResponsiveContainer>
           </div>
           
           <div className="ml-auto flex items-center gap-4">
              <button 
                onClick={() => {
                  setAlertPrice(asset.price.toFixed(2));
                  setShowAlertForm(true);
                }}
                className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand/10 hover:border-brand/30 transition-all text-text-muted hover:text-brand"
              >
                <Bell size={12} /> Set Pulse Alert
              </button>
              <div className="flex flex-col items-end">
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Network Load</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => <div key={i} className={cn("w-1 h-3 rounded-full", i < 4 ? "bg-brand" : "bg-white/10")} />)}
                </div>
              </div>
           </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 bg-bg-dark relative flex flex-col pt-4">
           {/* Active Trade Banner */}
            <AnimatePresence>
              {isTrading && activeTrade && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-brand text-bg-dark overflow-hidden flex-shrink-0"
                >
                  <div className="px-8 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-black/10 px-3 py-1 rounded-full border border-black/5">
                        <Timer size={14} className="animate-spin-slow" />
                        <span className="text-xs font-black font-mono">{countdown}S</span>
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest">Position: {activeTrade.direction === 'up' ? 'LONG' : 'SHORT'} • ${activeTrade.amount}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase italic">
                       Execution in Progress <div className="w-1 h-1 rounded-full bg-bg-dark animate-ping" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

           <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
              <div className="flex bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-2xl group hover:border-brand/40 transition-all">
                <button 
                  onClick={() => setZoomLevel(prev => Math.min(prev + 30, 1000))}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-text-muted hover:text-white transition-all active:scale-95"
                  title="Zoom Out (More View)"
                >
                  <ZoomOut size={14} />
                </button>
                
                <div className="w-[80px] sm:w-[120px] px-2 flex items-center">
                   <input 
                     type="range"
                     min="30"
                     max="1000"
                     step="10"
                     value={zoomLevel}
                     onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                     className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-brand"
                   />
                </div>

                <button 
                  onClick={() => setZoomLevel(prev => Math.max(prev - 30, 30))}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-text-muted hover:text-white transition-all active:scale-95"
                  title="Zoom In (More Detail)"
                >
                  <ZoomIn size={14} />
                </button>
              </div>

              <div className="flex bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-2xl">
                {[60, 300, 600, 1000].map(level => (
                  <button
                    key={level}
                    onClick={() => setZoomLevel(level)}
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      zoomLevel === level 
                       ? "bg-brand text-bg-dark shadow-[0_0_15px_rgba(0,242,255,0.3)]" 
                       : "text-text-muted hover:text-white hover:bg-white/5"
                    )}
                  >
                    {level === 60 ? '1M' : level === 300 ? '5M' : level === 600 ? '10M' : 'MAX'}
                  </button>
                ))}
              </div>

              <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl px-2 py-1 flex items-center gap-2 shadow-2xl">
                 <Activity size={10} className="text-brand/60" />
                 <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">
                   {zoomLevel < 1000 ? `${zoomLevel}PTS` : 'MAX'}
                 </span>
              </div>

              {autoTrade && (
                <div className="bg-brand/10 backdrop-blur-md border border-brand/30 rounded-lg px-2 py-1 flex items-center gap-2 animate-pulse">
                   <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                   <span className="text-[9px] font-black text-brand uppercase tracking-tighter">BIAS ACTIVE: {winProbability}%</span>
                </div>
              )}
           </div>

           <div className="flex-1 min-h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData.slice(-zoomLevel)}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={['auto', 'auto']} orientation="right" tick={{ fontSize: 10, fill: '#8e9299', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(5, 5, 5, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#00f2ff', fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Area type="monotone" dataKey="price" stroke="var(--color-brand)" strokeWidth={2} fillOpacity={1} fill="url(#chartGradient)" isAnimationActive={false} />
                  
                  {/* Visual line indicators for open trades (Entry, Stop Loss, Take Profit) */}
                  {openTradesForCurrentAsset.flatMap((trade) => {
                    const shortId = trade.id.substring(0, 4).toUpperCase();
                    const directionSign = trade.direction === 'up' ? '▲' : '▼';
                    const lines = [];

                    lines.push(
                      <ReferenceLine
                        key={`entry-${trade.id}`}
                        y={trade.priceAtEntry}
                        stroke="rgba(59, 130, 246, 0.75)"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        label={{
                          value: `[${shortId}] ENTRY ${directionSign} $${formatNumber(trade.priceAtEntry, 2)}`,
                          fill: '#3b82f6',
                          position: 'insideLeft',
                          fontSize: 9,
                          fontWeight: 800,
                          fontFamily: 'JetBrains Mono',
                          dy: -8,
                        }}
                      />
                    );

                    if (trade.takeProfit) {
                      lines.push(
                        <ReferenceLine
                          key={`tp-${trade.id}`}
                          y={trade.takeProfit}
                          stroke="rgba(16, 185, 129, 0.7)"
                          strokeWidth={1.2}
                          strokeDasharray="3 3"
                          label={{
                            value: `[${shortId}] TAKE PROFIT $${formatNumber(trade.takeProfit, 2)}`,
                            fill: '#10b981',
                            position: 'insideLeft',
                            fontSize: 9,
                            fontWeight: 800,
                            fontFamily: 'JetBrains Mono',
                            dy: -8,
                          }}
                        />
                      );
                    }

                    if (trade.stopLoss) {
                      lines.push(
                        <ReferenceLine
                          key={`sl-${trade.id}`}
                          y={trade.stopLoss}
                          stroke="rgba(244, 63, 94, 0.7)"
                          strokeWidth={1.2}
                          strokeDasharray="3 3"
                          label={{
                            value: `[${shortId}] STOP LOSS $${formatNumber(trade.stopLoss, 2)}`,
                            fill: '#f43f5e',
                            position: 'insideLeft',
                            fontSize: 9,
                            fontWeight: 800,
                            fontFamily: 'JetBrains Mono',
                            dy: -8,
                          }}
                        />
                      );
                    }

                    return lines;
                  })}
                </ComposedChart>
             </ResponsiveContainer>
           </div>

           {/* Quick Zoom Buttons (Explicitly requested) */}
           <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20">
              <button 
                onClick={() => setZoomLevel(prev => Math.max(prev - 30, 30))}
                className="w-10 h-10 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-brand/20 hover:border-brand transition-all active:scale-95 shadow-2xl group"
                title="Zoom In"
              >
                <Plus size={18} className="group-hover:text-brand transition-colors" />
              </button>
              <button 
                onClick={() => setZoomLevel(prev => Math.min(prev + 30, 1000))}
                className="w-10 h-10 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-brand/20 hover:border-brand transition-all active:scale-95 shadow-2xl group"
                title="Zoom Out"
              >
                <Minus size={18} className="group-hover:text-brand transition-colors" />
              </button>
           </div>
        </div>

        {/* Order History (Bottom) */}
        <motion.div 
          initial={false}
          animate={{ height: isHistoryCollapsed ? 48 : 480 }}
          className="border-t border-white/5 bg-black/20 overflow-hidden flex flex-col transition-all duration-300"
        >
           <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between bg-black/10 flex-shrink-0">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                  className="flex items-center gap-2 hover:opacity-80"
                >
                   <History size={14} className="text-text-muted" />
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted">Terminal Data</h3>
                   <ChevronDown size={14} className={cn("text-text-muted transition-transform", isHistoryCollapsed && "rotate-180")} />
                </button>
                
                {!isHistoryCollapsed && (
                  <div className="flex items-center gap-4">
                    <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
                      <button 
                        onClick={() => setViewMode('book')}
                        className={cn(
                          "px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                          viewMode === 'book' ? "bg-white/10 text-white" : "text-text-muted hover:text-white"
                        )}
                      >
                        Order Book
                      </button>
                      <button 
                        onClick={() => setViewMode('depth')}
                        className={cn(
                          "px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                          viewMode === 'depth' ? "bg-white/10 text-white" : "text-text-muted hover:text-white"
                        )}
                      >
                        Depth Chart
                      </button>
                      <button 
                        onClick={() => setViewMode('activity')}
                        className={cn(
                          "px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                          viewMode === 'activity' ? "bg-white/10 text-white" : "text-text-muted hover:text-white"
                        )}
                      >
                        History
                        {userTrades.filter(t => t.status === 'pending').length > 0 && (
                          <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                        )}
                      </button>
                      <button 
                        onClick={() => setViewMode('alerts')}
                        className={cn(
                          "px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                          viewMode === 'alerts' ? "bg-white/10 text-white" : "text-text-muted hover:text-white"
                        )}
                      >
                        Alerts
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {!isHistoryCollapsed && <button className="text-[9px] font-bold text-brand uppercase tracking-widest hover:underline">System Status</button>}
           </div>
           
           {!isHistoryCollapsed && (
             <div className="flex-1 flex overflow-hidden">
                {viewMode === 'book' ? (
                  <div className="flex-1 p-6 overflow-y-auto no-scrollbar">
                    <OrderBook key="book" basePrice={asset.price} symbol={asset.symbol} initialViewMode="book" />
                  </div>
                ) : viewMode === 'alerts' ? (
                  <div className="flex-1 flex overflow-hidden">
                    {/* Alert Creation Form */}
                    <div className="w-80 border-r border-white/5 p-6 space-y-6 overflow-y-auto no-scrollbar bg-black/20">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Bell size={14} className="text-brand" />
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Create Pulse Alert</h3>
                        </div>
                        
                        <div className="space-y-3">
                          <p className="text-[9px] font-black uppercase text-text-muted tracking-widest px-1">Threshold Condition</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={() => setAlertCondition('above')}
                              className={cn(
                                "py-2.5 rounded-lg border text-[9px] font-black uppercase transition-all",
                                alertCondition === 'above' ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-white/5 border-white/5 text-text-muted hover:border-white/10"
                              )}
                            >
                              Price Above
                            </button>
                            <button 
                              onClick={() => setAlertCondition('below')}
                              className={cn(
                                "py-2.5 rounded-lg border text-[9px] font-black uppercase transition-all",
                                alertCondition === 'below' ? "bg-rose-500/20 border-rose-500/50 text-rose-400" : "bg-white/5 border-white/5 text-text-muted hover:border-white/10"
                              )}
                            >
                              Price Below
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-[9px] font-black uppercase text-text-muted tracking-widest px-1">Target Price (USDT)</p>
                          <div className="relative">
                            <input 
                              type="number"
                              value={alertPrice}
                              onChange={(e) => setAlertPrice(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm font-black font-mono outline-none focus:border-brand/50 transition-all text-white placeholder:text-white/5"
                              placeholder={asset.price.toFixed(2)}
                            />
                          </div>
                        </div>

                        <button 
                          onClick={handleCreateAlert}
                          className="w-full py-4 bg-brand text-bg-dark rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                        >
                          Deploy Alert Monitor
                        </button>
                      </div>

                      <div className="p-4 rounded-xl bg-brand/5 border border-brand/10 space-y-2">
                        <div className="flex items-center gap-2 text-brand">
                          <Info size={12} />
                          <span className="text-[9px] font-black uppercase">Technical Spec</span>
                        </div>
                        <p className="text-[9px] font-medium text-text-muted leading-relaxed uppercase">
                          Alerts are finalized on-chain and will trigger terminal notifications when the threshold is breached.
                        </p>
                      </div>
                    </div>                    {/* Alerts List */}
                    <div className="flex-1 p-6 overflow-y-auto no-scrollbar flex flex-col gap-6">
                      <AlertsD3Chart alerts={alerts} currentPrice={asset.price} symbol={asset.symbol} />

                      {/* Filter Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
                        <div className="flex items-center gap-2">
                          <Filter size={12} className="text-brand" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">Alert Filter</span>
                        </div>
                        
                        <div className="flex items-center gap-4 flex-wrap">
                          {/* Asset Filter */}
                          <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
                            <button
                              onClick={() => setAlertFilterAsset('current')}
                              className={cn(
                                "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all",
                                alertFilterAsset === 'current' ? "bg-white/10 text-white" : "text-text-muted hover:text-white"
                              )}
                            >
                              {asset.symbol} Only
                            </button>
                            <button
                              onClick={() => setAlertFilterAsset('all')}
                              className={cn(
                                "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all",
                                alertFilterAsset === 'all' ? "bg-white/10 text-white" : "text-text-muted hover:text-white"
                              )}
                            >
                              All Assets
                            </button>
                          </div>

                          {/* Status Filter */}
                          <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
                            <button
                              onClick={() => setAlertFilterStatus('all')}
                              className={cn(
                                "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all",
                                alertFilterStatus === 'all' ? "bg-white/10 text-white" : "text-text-muted hover:text-white"
                              )}
                            >
                              All Status
                            </button>
                            <button
                              onClick={() => setAlertFilterStatus('active')}
                              className={cn(
                                "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all",
                                alertFilterStatus === 'active' ? "bg-white/10 text-emerald-400" : "text-text-muted hover:text-white"
                              )}
                            >
                              Active
                            </button>
                            <button
                              onClick={() => setAlertFilterStatus('triggered')}
                              className={cn(
                                "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all",
                                alertFilterStatus === 'triggered' ? "bg-white/10 text-rose-400" : "text-text-muted hover:text-white"
                              )}
                            >
                              Triggered
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Display List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredAlerts.length === 0 ? (
                          <div className="col-span-full h-64 flex flex-col items-center justify-center text-center opacity-30">
                            <Bell size={48} className="mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest">No matching alerts found</p>
                          </div>
                        ) : (
                          filteredAlerts.slice().reverse().map(alert => (
                            <div 
                              key={alert.id}
                              className={cn(
                                "glass-panel p-5 rounded-2xl border transition-all relative group",
                                alert.status === 'triggered' ? "bg-white/[0.01] border-white/5 opacity-50" : "bg-white/5 border-white/10 hover:border-brand/30"
                              )}
                            >
                              <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-2 h-2 rounded-full", alert.status === 'triggered' ? "bg-rose-500" : "bg-emerald-500 animate-pulse")} />
                                  <span className="text-[10px] font-black uppercase text-white">{alert.asset}/USDT</span>
                                </div>
                                <button 
                                  onClick={() => deleteAlert(alert.id)}
                                  className="text-text-muted hover:text-rose-500 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">
                                  {alert.condition === 'above' ? 'Breach Above' : 'Breach Below'}
                                </p>
                                <p className="text-lg font-black font-mono text-white">${formatNumber(alert.threshold, 2)}</p>
                              </div>

                              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                <span className="text-[8px] font-bold text-text-muted uppercase">Created: {new Date(alert.createdAt).toLocaleTimeString()}</span>
                                <span className={cn(
                                  "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                                  alert.status === 'triggered' ? "bg-rose-500/20 text-rose-500" : "bg-emerald-500/20 text-emerald-500"
                                )}>
                                  {alert.status}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                       </div>
                    </div>
                  </div>
                ) : viewMode === 'activity' ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Execution Filter Bar */}
                    <div className="border-b border-white/5 bg-black/40 px-6 py-3 flex flex-col xl:flex-row xl:items-center justify-between flex-shrink-0 gap-4">
                       <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
                        {/* Mobile Dropdown / Desktop Segmented Control */}
                        <div className="md:hidden flex flex-col gap-2 w-full">
                          <div className="relative group">
                            <select 
                              value={tradeFilter}
                              onChange={(e) => setTradeFilter(e.target.value as any)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest appearance-none outline-none pr-8 cursor-pointer text-brand focus:border-brand/40"
                            >
                              <option value="all" className="bg-bg-dark text-white">ALL STATUS</option>
                              <option value="pending" className="bg-bg-dark text-white">PENDING ORDERS</option>
                              <option value="won" className="bg-bg-dark text-white">WON TRADES</option>
                              <option value="lost" className="bg-bg-dark text-white font-black">LOST TRADES</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-brand pointer-events-none" />
                          </div>

                          <div className="relative group">
                            <select 
                              value={tradeAssetFilter}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTradeAssetFilter(val);
                                if (val !== 'all' && val !== asset.symbol) {
                                  setShowCurrentAssetOnly(false);
                                }
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest appearance-none outline-none pr-8 cursor-pointer text-white focus:border-brand/40"
                            >
                              <option value="all" className="bg-bg-dark text-white">ALL CRYPTOS</option>
                              {assets.map((a) => (
                                <option key={a.symbol} value={a.symbol} className="bg-bg-dark text-white">
                                  {a.symbol} / USDT
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mr-2">
                          <Activity size={10} className="text-text-muted" />
                          <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Status</span>
                        </div>
                        <div className="hidden md:flex bg-white/5 rounded-lg p-0.5 border border-white/5 shadow-inner">
                          {(['all', 'pending', 'won', 'lost'] as const).map((filter) => {
                             const count = userTrades.filter(t => 
                               (filter === 'all' || t.status === filter) && 
                               t.asset.toLowerCase().includes(tradeSearch.toLowerCase()) &&
                               (tradeDirectionFilter === 'all' || t.direction === tradeDirectionFilter) &&
                               (!showCurrentAssetOnly || t.asset === asset.symbol)
                             ).length;
                            
                            const isActive = tradeFilter === filter;
                            
                            return (
                              <button
                                key={filter}
                                onClick={() => setTradeFilter(filter)}
                                className={cn(
                                  "px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 relative",
                                  isActive ? "text-bg-dark" : "text-text-muted hover:text-white"
                                )}
                              >
                                {isActive && (
                                  <motion.div 
                                    layoutId="tradeFilterBg"
                                    className={cn(
                                      "absolute inset-0 rounded-md z-0",
                                      filter === 'won' ? "bg-emerald-500" : 
                                      filter === 'lost' ? "bg-rose-500" :
                                      filter === 'pending' ? "bg-amber-500" : "bg-brand"
                                    )}
                                  />
                                )}
                                <span className="relative z-10">
                                  {filter === 'all' ? 'All' : filter === 'pending' ? 'Pending' : filter === 'won' ? 'Won' : 'Lost'}
                                </span>
                                <span className={cn(
                                  "text-[8px] px-1.5 rounded-full font-mono relative z-10 transition-colors",
                                  isActive ? "bg-black/20 text-bg-dark" : "bg-white/5 text-text-muted"
                                )}>
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        
                        <div className="h-4 w-px bg-white/10 hidden xl:block" />

                        {/* Direction Filter */}
                        <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
                           {(['all', 'up', 'down'] as const).map((dir) => (
                             <button
                               key={dir}
                               onClick={() => setTradeDirectionFilter(dir)}
                               className={cn(
                                 "px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all relative",
                                 tradeDirectionFilter === dir ? "bg-white/10 text-white" : "text-text-muted hover:text-white"
                               )}
                             >
                               {dir === 'all' ? 'Sides' : dir === 'up' ? 'Long' : 'Short'}
                             </button>
                           ))}
                        </div>

                        {/* Current Asset Toggle */}
                        <button 
                          onClick={() => setShowCurrentAssetOnly(!showCurrentAssetOnly)}
                          className={cn(
                            "px-3 py-2 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                            showCurrentAssetOnly 
                              ? "bg-brand/10 border-brand/40 text-brand" 
                              : "bg-white/5 border-white/10 text-text-muted hover:border-white/20"
                          )}
                        >
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            showCurrentAssetOnly ? "bg-brand animate-pulse" : "bg-white/20"
                          )} />
                          {asset.symbol} Only
                        </button>

                        {/* Asset Filter Dropdown */}
                        <div className="relative group hidden sm:flex items-center bg-white/5 rounded-lg border border-white/10 hover:border-brand/35 transition-all shadow-inner px-2.5 py-1.5 gap-1.5 focus-within:border-brand/40 animate-fade-in">
                          <span className="text-[8px] font-black text-text-muted uppercase tracking-widest whitespace-nowrap">Asset</span>
                          <select 
                            value={tradeAssetFilter}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTradeAssetFilter(val);
                              if (val !== 'all' && val !== asset.symbol) {
                                  setShowCurrentAssetOnly(false);
                              }
                            }}
                            className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none pr-4 cursor-pointer text-white focus:text-brand transition-colors appearance-none min-w-[75px]"
                          >
                            <option value="all" className="bg-bg-dark text-white font-bold">ALL</option>
                            {assets.map((a) => (
                              <option key={a.symbol} value={a.symbol} className="bg-bg-dark text-white font-bold">
                                {a.symbol}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={10} className="text-text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                        </div>

                          {/* Search Field */}
                          <div className="relative group min-w-[160px] flex-1">
                             <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none group-focus-within:text-brand transition-colors">
                               <Search size={10} />
                             </div>
                             <input 
                               type="text"
                               placeholder="SEARCH ASSET SYMBOL (e.g. BTC)..."
                               value={tradeSearch}
                               onChange={(e) => setTradeSearch(e.target.value)}
                               className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-8 pr-3 text-[9px] font-black uppercase tracking-widest outline-none focus:border-brand/40 focus:bg-white/10 transition-all placeholder:text-white/10"
                             />
                             {tradeSearch && (
                               <button 
                                 onClick={() => setTradeSearch('')}
                                 className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                               >
                                 <X size={10} />
                               </button>
                             )}
                          </div>

                          {(tradeFilter !== 'all' || tradeAssetFilter !== 'all' || tradeSearch !== '' || tradeDirectionFilter !== 'all' || showCurrentAssetOnly || tradeAmountMin !== '' || tradeAmountMax !== '' || tradeDateFrom !== '' || tradeDateTo !== '') && (
                            <button 
                              onClick={() => {
                                setTradeFilter('all');
                                setTradeAssetFilter('all');
                                setTradeSearch('');
                                setTradeDirectionFilter('all');
                                setShowCurrentAssetOnly(false);
                                setTradeAmountMin('');
                                setTradeAmountMax('');
                                setTradeDateFrom('');
                                setTradeDateTo('');
                              }}
                              className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-400 transition-colors flex items-center gap-1.5 px-2"
                            >
                              <X size={10} />
                              Reset
                            </button>
                          )}
                          
                          <button 
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={cn(
                              "px-3 py-2 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ml-auto sm:ml-0",
                              showAdvancedFilters 
                                ? "bg-brand/10 border-brand/40 text-brand" 
                                : "bg-white/5 border-white/10 text-text-muted hover:border-white/20"
                            )}
                          >
                            <Filter size={10} />
                            Filters
                          </button>
                       </div>

                       <div className="flex items-center gap-6">
                         {/* Filtered stats summary */}
                         <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest">
                            <div className="flex flex-col">
                              <span className="text-text-muted text-[8px] font-bold leading-none mb-1 text-right">Filtered Vol</span>
                              <span className="text-white text-right">${formatNumber(filteredTrades.reduce((acc, t) => acc + t.amount, 0), 0)}</span>
                            </div>
                            <div className="w-px h-6 bg-white/5" />
                            <div className="flex flex-col">
                              <span className="text-text-muted text-[8px] font-bold leading-none mb-1 text-right">Net Yield</span>
                              <span className={cn(
                                "text-right",
                                filteredTrades.reduce((acc, t) => acc + (t.profit || 0), 0) >= 0 ? "text-emerald-500" : "text-rose-500"
                              )}>
                                {filteredTrades.reduce((acc, t) => acc + (t.profit || 0), 0) >= 0 ? '+' : ''}
                                ${formatNumber(filteredTrades.reduce((acc, t) => acc + (t.profit || 0), 0), 2)}
                              </span>
                            </div>
                            <div className="w-px h-6 bg-white/5" />
                            <div className="flex flex-col">
                              <span className="text-text-muted text-[8px] font-bold leading-none mb-1 text-right">Trades</span>
                              <span className="text-brand text-right">{filteredTrades.length}</span>
                            </div>
                         </div>
                       </div>
                    </div>

                    <AnimatePresence>
                      {showAdvancedFilters && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-b border-white/5 bg-black/60 px-6 py-4 overflow-hidden"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="space-y-4">
                              <label htmlFor="amount-min" className="text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                                <Wallet size={10} /> Amount Range (USDT)
                              </label>
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <input 
                                    id="amount-min"
                                    type="number"
                                    placeholder="MIN"
                                    value={tradeAmountMin}
                                    onChange={(e) => setTradeAmountMin(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-[10px] font-black font-mono outline-none focus:border-brand/40 focus:bg-white/10 placeholder:text-white/10 transition-all"
                                  />
                                </div>
                                <span className="text-text-muted font-mono text-xs opacity-30">—</span>
                                <div className="relative flex-1">
                                  <input 
                                    id="amount-max"
                                    type="number"
                                    placeholder="MAX"
                                    value={tradeAmountMax}
                                    onChange={(e) => setTradeAmountMax(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-[10px] font-black font-mono outline-none focus:border-brand/40 focus:bg-white/10 placeholder:text-white/10 transition-all"
                                  />
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                 {[
                                   { label: '< $100', min: '', max: '100' },
                                   { label: '$100 - $1k', min: '100', max: '1000' },
                                   { label: '> $1k', min: '1000', max: '' }
                                 ].map(p => (
                                   <button
                                     key={p.label}
                                     onClick={() => { setTradeAmountMin(p.min); setTradeAmountMax(p.max); }}
                                     className={cn(
                                       "px-2.5 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all",
                                       tradeAmountMin === p.min && tradeAmountMax === p.max 
                                         ? "bg-brand text-bg-dark border-brand shadow-[0_0_10px_rgba(0,242,255,0.2)]" 
                                         : "bg-white/5 border-white/5 text-text-muted hover:border-white/20 hover:text-white"
                                     )}
                                   >
                                     {p.label}
                                   </button>
                                 ))}
                              </div>
                            </div>

                            {/* Date Filter */}
                            <div className="space-y-4 lg:col-span-2">
                              <label className="text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={10} /> Temporal Period Range
                              </label>
                              <DateRangePicker 
                                startDate={tradeDateFrom}
                                endDate={tradeDateTo}
                                tradesCount={filteredTrades.length}
                                onChange={(start, end) => {
                                  setTradeDateFrom(start);
                                  setTradeDateTo(end);
                                }}
                              />
                            </div>

                            <div className="flex items-end justify-end">
                               <button 
                                 id="clear-advanced-filters"
                                 onClick={() => {
                                   setTradeAmountMin('');
                                   setTradeAmountMax('');
                                   setTradeDateFrom('');
                                   setTradeDateTo('');
                                 }}
                                 className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-[9px] font-black text-text-muted uppercase tracking-widest hover:text-white hover:border-white/30 transition-all hover:bg-white/10 active:scale-95"
                               >
                                 Flush Filters
                               </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex-1 flex overflow-hidden">
                      {/* Internal logs */}
                      <div className="flex-1 overflow-y-auto no-scrollbar px-6 border-r border-white/5 flex flex-col">
                        <table className="w-full text-left">
                        <thead>
                          <tr className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] h-12 border-b border-white/10 sticky top-0 bg-bg-dark/80 backdrop-blur-xl z-20">
                            <th className="font-black">Instrument Source</th>
                            <th className="font-black">Execution Signal</th>
                            <th className="font-black text-right">Volume</th>
                            <th className="font-black text-right">Leverage</th>
                            <th className="font-black text-right">Entry Vector</th>
                            <th className="font-black text-right">SL/TP Target</th>
                            <th className="font-black text-right">Net Yield</th>
                            <th className="font-black text-right">Terminal Status</th>
                          </tr>
                        </thead>
                        <tbody className="text-[10px] font-mono">
                          {filteredTrades.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-text-muted italic opacity-50">
                                 No matching executions detected in node history
                              </td>
                            </tr>
                          ) : (
                            filteredTrades
                              .map(trade => {
                                const isEditing = editingTradeId === trade.id;
                                return (
                                <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group min-h-[44px]">
                                  {isEditing ? (
                                    <>
                                      <td className="text-white font-bold py-2 py-2">
                                        <div>{trade.asset}/USDT</div>
                                        {trade.tradeType && trade.tradeType !== 'market' && (
                                          <div className="text-[7px] font-bold text-brand uppercase tracking-widest">{trade.tradeType}</div>
                                        )}
                                      </td>
                                      <td className={trade.direction === 'up' ? "text-emerald-500 font-bold py-2" : "text-rose-500 font-bold py-2"}>
                                        {trade.direction === 'up' ? "LONG" : "SHORT"}
                                      </td>
                                      <td className="text-right text-text-muted font-black py-2">${trade.amount}</td>
                                      <td className="text-right text-brand font-black py-2">{trade.leverage || 1}X</td>
                                      <td className="text-right font-black font-mono py-2">
                                        <div className="flex justify-end items-center gap-1">
                                          <span className="text-text-muted text-[8px]">$</span>
                                          <input 
                                            type="number" 
                                            step="any"
                                            value={editedPrice} 
                                            onChange={(e) => setEditedPrice(e.target.value)}
                                            className="w-20 bg-black/60 border border-brand/50 rounded px-1.5 py-1 text-right text-white text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-brand font-black neon-border"
                                          />
                                        </div>
                                      </td>
                                      <td className="text-right font-black font-mono text-[9px] py-2">
                                        <div className="flex flex-col items-end gap-1">
                                          <div className="flex items-center gap-1">
                                            <span className="text-emerald-500/70 text-[8px]">TP:$</span>
                                            <input 
                                              type="number" 
                                              step="any"
                                              placeholder="None"
                                              value={editedTakeProfit} 
                                              onChange={(e) => setEditedTakeProfit(e.target.value)}
                                              className="w-16 bg-black/60 border border-emerald-500/30 rounded px-1 py-0.5 text-right text-emerald-400 text-[9px] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            />
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-rose-500/70 text-[8px]">SL:$</span>
                                            <input 
                                              type="number" 
                                              step="any"
                                              placeholder="None"
                                              value={editedStopLoss} 
                                              onChange={(e) => setEditedStopLoss(e.target.value)}
                                              className="w-16 bg-black/60 border border-rose-500/30 rounded px-1 py-0.5 text-right text-rose-400 text-[9px] font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                                            />
                                          </div>
                                        </div>
                                      </td>
                                      <td className="text-right font-black text-brand py-2">{(trade.returnRate * 100).toFixed(0)}%</td>
                                      <td className="text-right py-2">
                                        <div className="flex justify-end items-center gap-1.5 pl-2">
                                          <button 
                                            onClick={() => handleSaveEditedTrade(trade.id)}
                                            className="p-1 rounded bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 transition-all font-bold cursor-pointer"
                                            title="Save Changes"
                                          >
                                            <Save size={12} />
                                          </button>
                                          <button 
                                            onClick={() => setEditingTradeId(null)}
                                            className="p-1 rounded bg-white/5 text-text-muted hover:text-white hover:bg-white/10 transition-all font-bold cursor-pointer"
                                            title="Cancel"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="text-white font-bold py-2.5">
                                        <div>{trade.asset}/USDT</div>
                                        {trade.tradeType && trade.tradeType !== 'market' && (
                                          <div className="text-[7.5px] font-bold text-brand uppercase tracking-widest">{trade.tradeType}</div>
                                        )}
                                      </td>
                                      <td className={trade.direction === 'up' ? "text-emerald-500 py-2.5" : "text-rose-500 py-2.5"}>
                                        {trade.direction === 'up' ? "LONG" : "SHORT"}
                                      </td>
                                      <td className="text-right text-text-muted font-black py-2.5">${trade.amount}</td>
                                      <td className="text-right text-brand font-black py-2.5">{trade.leverage || 1}X</td>
                                      <td className="text-right font-black font-mono text-white/90 py-2.5">${formatNumber(trade.priceAtEntry, 2)}</td>
                                      <td className="text-right font-black font-mono text-[9px] py-2.5">
                                        <div className="flex flex-col items-end">
                                          <span className="text-emerald-500/70">{trade.takeProfit ? `$${trade.takeProfit}` : '-'}</span>
                                          <span className="text-rose-500/70">{trade.stopLoss ? `$${trade.stopLoss}` : '-'}</span>
                                        </div>
                                      </td>
                                      <td className="text-right font-black text-brand py-2.5">{(trade.returnRate * 100).toFixed(0)}%</td>
                                      <td className="text-right py-2.5">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <span className={cn(
                                            "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                            trade.status === 'won' ? "bg-emerald-500/20 text-emerald-500" :
                                            trade.status === 'lost' ? "bg-rose-500/20 text-rose-500" :
                                            trade.status === 'pending' ? "bg-amber-500/20 text-amber-500" :
                                            "bg-white/10 text-text-muted"
                                          )}>
                                            {trade.status}
                                          </span>
                                          {trade.status === 'pending' && (
                                            <button
                                              onClick={() => {
                                                setEditingTradeId(trade.id);
                                                setEditedPrice(String(trade.priceAtEntry));
                                                setEditedTakeProfit(trade.takeProfit ? String(trade.takeProfit) : '');
                                                setEditedStopLoss(trade.stopLoss ? String(trade.stopLoss) : '');
                                              }}
                                              className="p-1 rounded bg-white/5 border border-white/10 text-text-muted hover:text-white hover:border-brand/40 transition-colors"
                                              title="Edit order prices"
                                            >
                                              <Edit2 size={10} />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </>
                                  )}
                                </tr>
                              );})
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Alerts sidebar list */}
                    <div className="w-64 overflow-y-auto no-scrollbar bg-black/10">
                      <div className="p-4 space-y-2">
                        {alerts.length === 0 ? (
                          <div className="h-32 flex flex-col items-center justify-center text-center px-4">
                             <Bell size={24} className="text-white/5 mb-2" />
                             <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">No active network monitors established</p>
                          </div>
                        ) : (
                          alerts.slice().reverse().map(alert => (
                            <div 
                              key={alert.id}
                              className={cn(
                                "p-3 rounded-xl border transition-all relative group",
                                alert.status === 'triggered' ? "bg-white/[0.02] border-white/5 opacity-60" : "bg-white/5 border-white/10 hover:border-brand/30"
                              )}
                            >
                              <div className="flex justify-between items-start mb-1">
                                 <span className={cn(
                                   "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                                   alert.status === 'triggered' ? "bg-text-muted/20 text-text-muted" : "bg-brand/20 text-brand"
                                 )}>
                                   {alert.asset}
                                 </span>
                                 <button 
                                  onClick={() => deleteAlert(alert.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 hover:text-rose-400"
                                 >
                                   <Trash2 size={12} />
                                 </button>
                              </div>
                              <div className="flex justify-between items-end">
                                 <div>
                                   <p className="text-[10px] font-bold text-white uppercase tracking-tighter">
                                     {alert.condition === 'above' ? 'Price Above' : 'Price Below'}
                                   </p>
                                   <p className="text-xs font-black font-mono text-white">${formatNumber(alert.threshold, 2)}</p>
                                 </div>
                                 {alert.status === 'triggered' && (
                                   <span className="text-[8px] font-black text-rose-500 uppercase italic">Triggered</span>
                                 )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                ) : (
                  <div className="flex-1 p-6 flex flex-col">
                    <OrderBook key="depth" basePrice={asset.price} symbol={asset.symbol} initialViewMode="depth" />
                  </div>
                )}
             </div>
           )}
        </motion.div>
      </div>

      {/* Right Sidebar - Trade Execution */}
      <div className="w-full md:w-80 lg:w-96 flex-shrink-0 border-l border-white/5 bg-surface-dark tech-grid flex flex-col">
         {/* Step Indicator */}
         <div className="flex border-b border-white/5">
            {[1, 2, 3].map(i => (
              <div 
                key={i} 
                className={cn(
                  "flex-1 h-1 transition-all duration-500",
                  i <= step ? "bg-brand" : "bg-white/5"
                )} 
              />
            ))}
         </div>

         <div className="p-8 space-y-8 flex-1 overflow-y-auto no-scrollbar">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">Type</h3>
                      <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5 flex-wrap">
                        <button 
                          onClick={() => setTradeType('market')}
                          className={cn(
                            "px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all",
                            tradeType === 'market' ? "bg-white/10 text-white" : "text-text-muted hover:text-white"
                          )}
                        >
                          Market
                        </button>
                        <button 
                          onClick={() => setTradeType('limit')}
                          className={cn(
                            "px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all",
                            tradeType === 'limit' ? "bg-white/10 text-white" : "text-text-muted hover:text-white"
                          )}
                        >
                          Limit
                        </button>
                        <button 
                          onClick={() => setTradeType('take-profit')}
                          className={cn(
                            "px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all",
                            tradeType === 'take-profit' ? "bg-white/10 text-white" : "text-text-muted hover:text-white"
                          )}
                        >
                          TP Order
                        </button>
                        <button 
                          onClick={() => setTradeType('stop-loss')}
                          className={cn(
                            "px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all",
                            tradeType === 'stop-loss' ? "bg-white/10 text-white" : "text-text-muted hover:text-white"
                          )}
                        >
                          SL Order
                        </button>
                      </div>
                    </div>

                    {tradeType === 'market' && (
                      <div className="space-y-2 p-4 bg-brand/5 border border-brand/10 rounded-xl">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase tracking-widest text-brand">Market Execution Price</label>
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                            <span className="text-[10px] font-black text-brand uppercase">Live</span>
                          </div>
                        </div>
                        <p className="text-2xl font-black font-mono text-white">${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <p className="text-[9px] font-medium text-text-muted uppercase">Orders will be filled at the best available protocol rate.</p>
                      </div>
                    )}

                    {tradeType === 'limit' && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label className="text-[10px] font-black uppercase tracking-widest text-brand">Limit Price</label>
                          <span className="text-[9px] font-mono text-text-muted">Current: {asset.price.toFixed(2)}</span>
                        </div>
                        <div className="relative">
                          <input 
                            type="number"
                            value={limitPrice}
                            onChange={(e) => {
                              setLimitPrice(e.target.value);
                              validateLimitPrice(e.target.value);
                            }}
                            className={cn(
                              "w-full bg-white/5 border rounded-xl py-3 px-4 text-sm font-black font-mono outline-none transition-all",
                              limitPriceError ? "border-rose-500/50 focus:border-rose-500" : "border-white/10 focus:border-brand/50"
                            )}
                            placeholder={`Target ${direction === 'Upward' ? 'buy' : 'sell'} price...`}
                          />
                          {limitPriceError && (
                            <p className="text-[9px] text-rose-500 mt-1 font-bold">{limitPriceError}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {(tradeType === 'stop-loss' || tradeType === 'take-profit') && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label className="text-[10px] font-black uppercase tracking-widest text-brand">
                            {tradeType === 'stop-loss' ? 'Stop Trigger Price' : 'Profit Trigger Price'}
                          </label>
                          <span className="text-[9px] font-mono text-text-muted">Current: {asset.price.toFixed(2)}</span>
                        </div>
                        <div className="relative">
                          <input 
                            type="number"
                            value={triggerPrice}
                            onChange={(e) => {
                              setTriggerPrice(e.target.value);
                              validateTriggerPrice(e.target.value);
                            }}
                            className={cn(
                              "w-full bg-white/5 border rounded-xl py-3 px-4 text-sm font-black font-mono outline-none transition-all",
                              triggerPriceError ? "border-rose-500/50 focus:border-rose-500" : "border-white/10 focus:border-brand/50"
                            )}
                            placeholder={`Enter ${tradeType === 'stop-loss' ? 'stop' : 'target'} price...`}
                          />
                          {triggerPriceError && (
                            <p className="text-[9px] text-rose-500 mt-1 font-bold">{triggerPriceError}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">1. Strategy</h3>
                      <span className="text-[10px] font-bold text-brand">PHASE_ALPHA</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setDirection('Upward')} className={cn("py-5 rounded-xl font-black text-xs uppercase tracking-widest transition-all", direction === 'Upward' ? "bg-emerald-500 text-bg-dark neon-glow" : "bg-white/5 text-text-muted border border-white/10 hover:border-emerald-500/30")}>BUY / LONG</button>
                      <button onClick={() => setDirection('Down')} className={cn("py-5 rounded-xl font-black text-xs uppercase tracking-widest transition-all", direction === 'Down' ? "bg-rose-500 text-bg-dark neon-glow" : "bg-white/5 text-text-muted border border-white/10 hover:border-rose-500/30")}>SELL / SHORT</button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                       <span className="text-text-muted">2. Resolution</span>
                       <Clock size={14} className="text-brand/60" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       {deliveryTimes.map(t => (
                         <button key={t.time} onClick={() => setDeliveryTime(t.time)} className={cn("py-3 rounded-lg text-xs font-black font-mono transition-all border", deliveryTime === t.time ? "border-brand bg-brand/10 text-brand" : "border-white/5 bg-white/5 text-text-muted hover:border-white/20")}>
                           {t.time}
                         </button>
                       ))}
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center group hover:border-brand/20 transition-colors">
                       <div>
                         <p className="text-[9px] font-black uppercase text-text-muted mb-1">Contract Yield</p>
                         <p className="text-lg font-black text-brand">+{deliveryTimes.find(t => t.time === deliveryTime)?.return}</p>
                       </div>
                       <Zap size={24} className="text-brand/20 group-hover:text-brand transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cpu size={14} className={cn("transition-colors", autoTrade ? "text-brand" : "text-text-muted")} />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted">Autonomous Protocol</h3>
                      </div>
                      <button 
                        onClick={() => {
                          if (!autoTrade) {
                            setShowAutoTradeModal(true);
                          } else {
                            setAutoTrade(false);
                          }
                        }}
                        className={cn(
                          "w-8 h-4 rounded-full relative transition-all duration-300",
                          autoTrade ? "bg-brand" : "bg-white/10"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300",
                          autoTrade ? "translate-x-4" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    <AnimatePresence>
                      {autoTrade && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-4 overflow-hidden"
                        >
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[9px] font-bold text-text-muted uppercase italic">Quantum Win Bias</span>
                            <div className="flex items-center gap-3">
                      <input 
                        type="number"
                        min="10"
                        max="99"
                        value={winProbability}
                        onChange={(e) => setWinProbability(Math.max(10, Math.min(99, parseInt(e.target.value) || 10)))}
                        className="w-12 bg-white/5 border border-white/10 rounded text-[10px] font-black font-mono text-brand text-center outline-none focus:border-brand/40"
                      />
                      <span className="text-[11px] font-black font-mono text-brand tracking-tighter">% B.PROB</span>
                    </div>
                          </div>
                          <input 
                            type="range"
                            min="10"
                            max="99"
                            step="1"
                            value={winProbability}
                            onChange={(e) => setWinProbability(parseInt(e.target.value))}
                            className="w-full accent-brand bg-white/5 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="p-3 rounded-lg bg-brand/5 border border-brand/10">
                            <p className="text-[8px] font-medium text-brand/70 uppercase leading-relaxed tracking-wider">
                              AI-Driven execution override enabled. Trades will automatically settle with calibrated probability bias.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">2. Capital</h3>
                      <span className="text-[10px] font-bold text-brand">PHASE_BETA</span>
                    </div>
                    {/* Trade Execution Configuration Group */}
                    <div className="p-4 bg-white/5 rounded-3xl border border-white/5 space-y-6">
                      <div className="space-y-4">
                        <motion.div 
                          animate={leverageError ? { x: [-1, 2, -2, 2, 0] } : {}}
                          transition={{ duration: 0.4 }}
                          className="flex flex-col gap-6"
                        >
                          {/* Large Leverage Display */}
                          <div className="flex items-center justify-center py-8 bg-brand/5 rounded-3xl border border-brand/10 relative overflow-hidden group shadow-inner">
                            <motion.div 
                              className={cn(
                                "absolute inset-0 opacity-10 blur-3xl transition-all duration-700",
                                leverage <= 10 ? "bg-emerald-500" : leverage <= 50 ? "bg-amber-500" : "bg-rose-500"
                              )} 
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 4, repeat: Infinity }}
                            />
                            <div className="flex flex-col items-center relative z-10">
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-[0.2em] mb-2",
                                leverage <= 10 ? "text-emerald-500" : leverage <= 50 ? "text-amber-500" : "text-rose-500"
                              )}>
                                {leverage <= 10 ? 'SAFE PROTOCOL' : leverage <= 50 ? 'AGRESSIVE RISK' : 'TERMINAL SECTOR'}
                              </span>
                              <div className="flex items-baseline gap-2">
                                <motion.span 
                                  key={leverage}
                                  initial={{ y: 5, opacity: 0 }}
                                  animate={{ y: 0, opacity: 1 }}
                                  className="text-6xl font-black font-mono text-white leading-none tracking-tighter"
                                >
                                  {leverage}
                                </motion.span>
                                <span className={cn(
                                  "text-2xl font-black",
                                  leverage <= 10 ? "text-emerald-500/60" : leverage <= 50 ? "text-amber-500/60" : "text-rose-500/60"
                                )}>X</span>
                              </div>
                              <p className="text-[8px] text-text-muted uppercase font-bold tracking-tighter italic mt-3 opacity-60">Multiplication Sector Active</p>
                            </div>
                          </div>

                          <div className="px-1 space-y-5">
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-brand" />
                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Risk Spectrum Control</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-brand/60 uppercase tracking-widest bg-brand/5 px-2 py-0.5 rounded border border-brand/10">1x - 100x</span>
                                <div className="relative w-16 group/input">
                                  <input 
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={leverageInput}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setLeverageInput(val);
                                      const isValid = validateLeverage(val);
                                      if (isValid) {
                                        const num = parseInt(val);
                                        setLeverage(num);
                                        
                                        // Update orderSize
                                        const qty = parseFloat(quantity);
                                        if (!isNaN(qty) && qty > 0 && num > 0) {
                                          setOrderSize((qty * num).toFixed(2));
                                        }
                                      }
                                    }}
                                    className={cn(
                                      "w-full bg-black/40 border rounded-lg py-1 text-center text-xs font-black font-mono outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                      leverageError ? "border-rose-500 text-rose-500" : "border-white/10 text-brand focus:border-brand/40"
                                    )}
                                  />
                                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-black text-brand/40">X</span>
                                </div>
                              </div>
                            </div>
                            
                            {leverageError && (
                              <p className="text-[9px] text-rose-500 font-bold uppercase tracking-tight px-1">
                                {leverageError}
                              </p>
                            )}
                            
                            <div className="relative h-12 flex items-center group/slider px-4">
                                {/* Risk Spectrum Track */}
                                <div className="absolute inset-x-4 h-2.5 rounded-full overflow-hidden bg-white/5 border border-white/10 shadow-inner">
                                  <div 
                                    className="absolute inset-0 opacity-20 transition-all duration-700"
                                    style={{ 
                                      background: 'linear-gradient(to right, #10b981 0%, #10b981 10%, #f59e0b 50%, #f43f5e 100%)' 
                                    }} 
                                  />
                                  {/* Selection Fill */}
                                  <motion.div 
                                    className={cn(
                                      "absolute inset-y-0 left-0 transition-colors duration-500",
                                      leverage <= 10 ? "bg-emerald-500 shadow-[0_0_15px_#10b981]" : 
                                      leverage <= 50 ? "bg-amber-500 shadow-[0_0_15px_#f59e0b]" : 
                                      "bg-rose-500 shadow-[0_0_20px_#f43f5e]"
                                    )}
                                    initial={false}
                                    animate={{ width: `${leverage}%` }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                  />
                                </div>

                                <input 
                                  type="range"
                                  min="1"
                                  max="100"
                                  step="1"
                                  value={leverage}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLeverageInput(val);
                                    const num = parseInt(val);
                                    setLeverage(num);
                                    setLeverageError(null);

                                    // Update orderSize based on current quantity and selected leverage
                                    const qty = parseFloat(quantity);
                                    if (!isNaN(qty) && qty > 0 && num > 0) {
                                      const size = (qty * num).toFixed(2);
                                      setOrderSize(size);
                                      validateOrderSize(size);
                                    }
                                  }}
                                  className="absolute inset-x-4 w-[calc(100%-32px)] h-full bg-transparent appearance-none cursor-pointer z-20 opacity-0"
                                />
                                
                                {/* Visible Custom Thumb */}
                                <motion.div 
                                  className={cn(
                                    "absolute w-8 h-8 rounded-xl border-2 border-white shadow-[0_0_30px_rgba(0,0,0,0.8)] z-10 flex items-center justify-center cursor-pointer pointer-events-none",
                                    leverage <= 10 ? "bg-emerald-500" : leverage <= 50 ? "bg-amber-500" : "bg-rose-500"
                                  )}
                                  animate={{ left: `calc(${leverage}% + (${(1 - leverage / 100) * 16}px) - 8px)` }}
                                  style={{ transform: 'translateX(-50%)' }}
                                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                >
                                  <div className="w-0.5 h-3 bg-white/40 rounded-full" />
                                </motion.div>


                                {/* Thumb Highlight Glow */}
                                <motion.div 
                                  className={cn(
                                    "absolute w-16 h-16 rounded-full blur-2xl pointer-events-none z-0 opacity-40 group-hover/slider:opacity-60 transition-opacity",
                                    leverage <= 10 ? "bg-emerald-500" : leverage <= 50 ? "bg-amber-500" : "bg-rose-500"
                                  )}
                                  animate={{ left: `calc(${leverage}% + (${(1 - leverage / 100) * 16}px) - 8px)` }}
                                  style={{ transform: 'translateX(-50%)' }}
                                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                                
                                {/* Marks */}
                                <div className="absolute inset-x-4 -bottom-6 flex justify-between">
                                  {[1, 25, 50, 75, 100].map((m) => (
                                    <div key={m} className="flex flex-col items-center gap-1">
                                      <div className="w-0.5 h-1.5 bg-white/10 rounded-full" />
                                      <span className="text-[7px] font-black text-text-muted/40 uppercase">{m}x</span>
                                    </div>
                                  ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-6 gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/5 mt-8">
                                {[1, 10, 25, 50, 75, 100].map(val => (
                                  <button 
                                    key={val}
                                    type="button"
                                    onClick={() => {
                                      setLeverageInput(val.toString());
                                      setLeverage(val);
                                      setLeverageError(null);
                                      
                                      // Sync orderSize
                                      const qty = parseFloat(quantity);
                                      if (!isNaN(qty) && qty > 0) {
                                        setOrderSize((qty * val).toFixed(2));
                                      }
                                    }}
                                    className={cn(
                                      "text-[9px] font-black transition-all py-1.5 rounded-md",
                                      leverage === val && !leverageError
                                        ? "bg-brand text-bg-dark shadow-lg shadow-brand/20 scale-[1.02]" 
                                        : "text-text-muted hover:text-white hover:bg-white/5"
                                    )}
                                  >
                                    {val}X
                                  </button>
                                ))}
                              </div>
                            </div>
                        </motion.div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <label htmlFor="order-size-input" className="text-[10px] font-black uppercase tracking-widest text-brand">
                            Notional Exposure (USDT)
                          </label>
                          <div className="flex items-center gap-1.5 opacity-50">
                             <ShieldCheck size={10} className="text-brand" />
                             <span className="text-[8px] font-black uppercase tracking-tighter">Total Position Value</span>
                          </div>
                        </div>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-brand transition-colors px-2 py-1 bg-white/5 rounded-md z-10">
                             <span className="text-[10px] font-black">TOTAL</span>
                          </div>
                          <input 
                            id="order-size-input"
                            type="number"
                            value={orderSize}
                            onChange={(e) => {
                              const val = e.target.value;
                              setOrderSize(val);
                              validateOrderSize(val);
                              
                              // Sync with quantity (margin)
                              const size = parseFloat(val);
                              if (!isNaN(size) && size > 0 && leverage > 0) {
                                const qty = (size / leverage).toFixed(2);
                                setQuantity(qty);
                                validateQuantity(qty);
                              } else if (val === '') {
                                setQuantity('');
                              }
                            }}
                            placeholder="Position exposure..."
                            className={cn(
                              "w-full bg-black/40 border rounded-2xl py-5 pl-20 pr-6 text-xl font-black font-mono outline-none transition-all text-white placeholder:text-white/5",
                              orderSizeError ? "border-rose-500/50 focus:border-rose-500" : "border-white/5 focus:border-brand/40"
                            )}
                          />
                        </div>
                        {orderSizeError && (
                          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tight px-1">
                            Error: {orderSizeError}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <label htmlFor="quantity-input" className="text-[10px] font-black uppercase tracking-widest text-brand">
                          Order Size (USDT)
                        </label>
                        <span className="text-[10px] font-bold text-text-muted uppercase">
                          Wallet: <span className="text-white">${formatNumber(appUser?.availableBalance || 0, 2)}</span>
                        </span>
                      </div>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-brand transition-colors px-2 py-1 bg-white/5 rounded-md z-10">
                           <span className="text-[10px] font-black">COST</span>
                        </div>
                        <input 
                          id="quantity-input"
                          type="number"
                          value={quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQuantity(val);
                            validateQuantity(val);
                          }}
                          placeholder="0.00"
                          className={cn(
                            "w-full bg-black/40 border rounded-2xl py-6 pl-20 pr-6 text-2xl font-black font-mono outline-none transition-all text-white placeholder:text-white/5",
                            quantityError ? "border-rose-500/50 focus:border-rose-500" : "border-white/5 focus:border-brand/40"
                          )}
                        />
                        {quantity && !isNaN(parseFloat(quantity)) && (
                          <div className="absolute right-4 bottom-2 text-[8px] font-black text-brand/40 uppercase tracking-tighter">
                            ≈ {(parseFloat(quantity) / asset.price).toFixed(6)} {asset.symbol}
                          </div>
                        )}
                      </div>
                    </div>
                    {quantityError && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] font-bold text-rose-500 uppercase tracking-tight px-1"
                      >
                        Error: {quantityError}
                      </motion.p>
                    )}
                    <div className="grid grid-cols-4 gap-2">
                       {['25%', '50%', '75%', '100%'].map(p => (
                         <button 
                           key={p} 
                           onClick={() => {
                             const balance = appUser?.availableBalance || 0;
                             const pct = parseInt(p) / 100;
                             const val = (balance * pct).toFixed(2);
                             setQuantity(val);
                             validateQuantity(val);
                           }}
                           className="py-2.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black text-text-muted hover:bg-brand/10 hover:text-brand hover:border-brand/20 transition-all"
                         >
                           {p}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-brand/10 rounded-xl border border-brand/20">
                          <ShieldCheck size={16} className="text-brand" />
                        </div>
                        <div>
                          <h3 className="text-[11px] font-black uppercase tracking-widest text-white">Risk Parameters</h3>
                          <p className="text-[8px] font-bold text-text-muted uppercase tracking-tighter">Automated Protective Orders</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(isTpEnabled && isSlEnabled) && calculateRR() && (
                          <div className="px-2 py-1 bg-brand/10 rounded text-[8px] font-black text-brand uppercase tracking-widest border border-brand/20 animate-pulse">
                            R:R {calculateRR()}
                          </div>
                        )}
                        <span className="px-2 py-1 bg-white/5 rounded text-[8px] font-black text-brand uppercase tracking-widest border border-white/5">Optional</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                      {/* Take Profit Field */}
                      <div className={cn("space-y-4 p-4 rounded-2xl border transition-all", isTpEnabled ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/5 border-white/5 opacity-60")}>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2">
                            <div className={cn("w-1.5 h-1.5 rounded-full transition-all", isTpEnabled ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-text-muted/30")} />
                            <span className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", isTpEnabled ? "text-emerald-500" : "text-text-muted")}>Take Profit</span>
                          </label>
                          <button 
                            onClick={() => setIsTpEnabled(!isTpEnabled)}
                            className={cn(
                              "w-8 h-4 rounded-full relative transition-all duration-300",
                              isTpEnabled ? "bg-emerald-500" : "bg-white/10"
                            )}
                          >
                            <div className={cn(
                              "absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300",
                              isTpEnabled ? "translate-x-4" : "translate-x-0"
                            )} />
                          </button>
                        </div>

                        {isTpEnabled && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="space-y-3"
                          >
                            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                              {[0.25, 0.50, 1.00].map(pct => (
                                <button 
                                  key={pct}
                                  onClick={() => {
                                    const target = direction === 'Upward' 
                                      ? asset.price * (1 + (pct / leverage)) 
                                      : asset.price * (1 - (pct / leverage));
                                    const val = target.toFixed(2);
                                    setTakeProfit(val);
                                    validateTp(val);
                                  }}
                                  className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-500 hover:bg-emerald-500/20 transition-all uppercase whitespace-nowrap"
                                >
                                  {pct * 100}%
                                </button>
                              ))}
                            </div>
                            <div className="relative group">
                              <input 
                                type="number"
                                step="0.01"
                                value={takeProfit}
                                onChange={(e) => {
                                  setTakeProfit(e.target.value);
                                  validateTp(e.target.value);
                                }}
                                placeholder="Price..."
                                className={cn(
                                  "w-full bg-black/40 border rounded-xl py-3 pl-10 pr-8 text-xs font-black font-mono outline-none transition-all text-emerald-400 placeholder:text-white/5",
                                  tpError ? "border-rose-500/50 focus:border-rose-500" : "border-white/5 focus:border-emerald-500/40"
                                )}
                              />
                              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                <TrendingUp size={12} className="text-emerald-500/40" />
                              </div>
                            </div>
                            {tpError ? (
                              <p className="text-[8px] font-bold text-rose-500 uppercase tracking-tight leading-tight px-1">
                                {tpError}
                              </p>
                            ) : takeProfit && (
                              <div className="flex flex-col gap-0.5 px-1">
                                <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-tight">
                                  PROFIT: <span className="text-white ml-0.5 font-mono">${formatNumber(calculatePnL(takeProfit), 2)}</span>
                                </p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>

                      {/* Stop Loss Field */}
                      <div className={cn("space-y-4 p-4 rounded-2xl border transition-all", isSlEnabled ? "bg-rose-500/5 border-rose-500/20" : "bg-white/5 border-white/5 opacity-60")}>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2">
                            <div className={cn("w-1.5 h-1.5 rounded-full transition-all", isSlEnabled ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "bg-text-muted/30")} />
                            <span className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", isSlEnabled ? "text-rose-500" : "text-text-muted")}>Stop Loss</span>
                          </label>
                          <button 
                            onClick={() => setIsSlEnabled(!isSlEnabled)}
                            className={cn(
                              "w-8 h-4 rounded-full relative transition-all duration-300",
                              isSlEnabled ? "bg-rose-500" : "bg-white/10"
                            )}
                          >
                            <div className={cn(
                              "absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300",
                              isSlEnabled ? "translate-x-4" : "translate-x-0"
                            )} />
                          </button>
                        </div>

                        {isSlEnabled && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="space-y-3"
                          >
                            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                              {[0.05, 0.10, 0.25].map(pct => (
                                <button 
                                  key={pct}
                                  onClick={() => {
                                    const target = direction === 'Upward' 
                                      ? asset.price * (1 - (pct / leverage)) 
                                      : asset.price * (1 + (pct / leverage));
                                    const val = target.toFixed(2);
                                    setStopLoss(val);
                                    validateSl(val);
                                  }}
                                  className="px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-[8px] font-black text-rose-500 hover:bg-rose-500/20 transition-all uppercase whitespace-nowrap"
                                >
                                  {pct * 100}%
                                </button>
                              ))}
                            </div>
                            <div className="relative group">
                              <input 
                                type="number"
                                step="0.01"
                                value={stopLoss}
                                onChange={(e) => {
                                  setStopLoss(e.target.value);
                                  validateSl(e.target.value);
                                }}
                                placeholder="Price..."
                                className={cn(
                                  "w-full bg-black/40 border rounded-xl py-3 pl-10 pr-8 text-xs font-black font-mono outline-none transition-all text-rose-400 placeholder:text-white/5",
                                  slError ? "border-rose-500/50 focus:border-rose-500" : "border-white/5 focus:border-rose-500/40"
                                )}
                              />
                              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                <TrendingDown size={12} className="text-rose-500/40" />
                              </div>
                            </div>
                            {slError ? (
                              <p className="text-[8px] font-bold text-rose-500 uppercase tracking-tight leading-tight px-1">
                                {slError}
                              </p>
                            ) : stopLoss && (
                              <div className="flex flex-col gap-0.5 px-1">
                                <p className="text-[8px] font-bold text-rose-500 uppercase tracking-tight">
                                  MAX LOSS: <span className="text-white ml-0.5 font-mono">${formatNumber(Math.abs(calculatePnL(stopLoss)), 2)}</span>
                                </p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 flex gap-3 items-start">
                     <Info size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
                     <p className="text-[10px] font-medium text-orange-500/80 leading-relaxed uppercase tracking-tighter">
                       Ensure liquidity matches execution capacity. Terminal fees may apply during high network congestion.
                     </p>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">3. Summary</h3>
                    <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                       <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-text-muted uppercase">Instrument</span>
                          <span className="text-xs font-black">{asset.symbol}/USDT</span>
                       </div>
                       <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center px-6">
                          <span className="text-[10px] font-bold text-text-muted uppercase">Order Type</span>
                          <span className="text-xs font-black uppercase text-brand">{tradeType}</span>
                       </div>
                       {tradeType === 'limit' && (
                         <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center px-6">
                            <span className="text-[10px] font-bold text-text-muted uppercase">Limit Price</span>
                            <span className="text-xs font-black font-mono text-brand">${formatNumber(parseFloat(limitPrice), 2)}</span>
                         </div>
                       )}
                       <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center px-6">
                          <span className="text-[10px] font-bold text-text-muted uppercase">Execution</span>
                          <span className={cn("text-xs font-black", direction === 'Upward' ? "text-emerald-500" : "text-rose-500")}>
                             {direction === 'Upward' ? 'BUY / LONG ↑' : 'SELL / SHORT ↓'}
                          </span>
                       </div>
                       <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-text-muted uppercase">Resolution</span>
                          <span className="text-xs font-black font-mono">{deliveryTime}</span>
                       </div>
                       <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-text-muted uppercase">Leverage</span>
                          <span className="text-xs font-black font-mono text-white">{leverage}X</span>
                       </div>
                       <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-text-muted uppercase">Capital</span>
                          <span className="text-xs font-black font-mono text-brand">${formatNumber(parseFloat(quantity), 2)}</span>
                       </div>
                       {isTpEnabled && takeProfit && (
                         <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-text-muted uppercase text-emerald-500/80">Take Profit</span>
                              <span className="text-[8px] text-text-muted uppercase font-bold">ROI: {((calculatePnL(takeProfit) / (parseFloat(quantity) || 1)) * 100).toFixed(1)}%</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black font-mono text-emerald-500 block">${formatNumber(parseFloat(takeProfit), 2)}</span>
                              <span className="text-[8px] text-emerald-500/60 uppercase font-black tracking-tighter">EST. ${formatNumber(calculatePnL(takeProfit), 2)}</span>
                            </div>
                         </div>
                       )}
                       {isSlEnabled && stopLoss && (
                         <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-text-muted uppercase text-rose-500/80">Stop Loss</span>
                              <span className="text-[8px] text-text-muted uppercase font-bold">ROI: {((calculatePnL(stopLoss) / (parseFloat(quantity) || 1)) * 100).toFixed(1)}%</span>
                            </div>
                            <div className="text-right">
                               <span className="text-xs font-black font-mono text-rose-500 block">${formatNumber(parseFloat(stopLoss), 2)}</span>
                               <span className="text-[8px] text-rose-500/60 uppercase font-black tracking-tighter">EST. -${formatNumber(Math.abs(calculatePnL(stopLoss)), 2)}</span>
                            </div>
                         </div>
                       )}
                       {calculateRR() && (
                         <div className="px-6 py-3 border-b border-white/5 bg-brand/5 flex justify-between items-center">
                            <span className="text-[9px] font-black text-brand uppercase tracking-widest">Risk/Reward Profile</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black font-mono text-brand">{calculateRR()}</span>
                              <div className={cn(
                                "text-[8px] font-black px-1.5 py-0.5 rounded uppercase",
                                parseFloat(calculateRR() || '0') >= 2 ? "bg-emerald-500/20 text-emerald-500" : "bg-brand/20 text-brand"
                              )}>
                                {parseFloat(calculateRR() || '0') >= 2 ? 'High Alpha' : 'Standard'}
                              </div>
                            </div>
                         </div>
                       )}
                       <div className="px-6 py-5 bg-brand/[0.03] space-y-4">
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-brand uppercase">Win Projection</span>
                              <span className="text-[8px] text-text-muted uppercase font-bold">Target Yield</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black text-emerald-500 block">
                                +${(isTpEnabled && takeProfit) 
                                  ? formatNumber(calculatePnL(takeProfit), 2) 
                                  : (parseFloat(quantity) * (deliveryTimes.find(t => t.time === deliveryTime)?.rate || 0)).toFixed(2)}
                              </span>
                              <span className="text-[9px] font-black text-emerald-500/60 font-mono">
                                {(isTpEnabled && takeProfit) 
                                  ? `ROI: ${((calculatePnL(takeProfit) / (parseFloat(quantity) || 1)) * 100).toFixed(1)}%`
                                  : `FIXED: ${(deliveryTimes.find(t => t.time === deliveryTime)?.rate || 0) * 100}%`}
                              </span>
                            </div>
                          </div>
                          {isSlEnabled && stopLoss ? (
                            <div className="flex justify-between items-center pt-3 border-t border-white/5">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-rose-500 uppercase">Loss Projection</span>
                                <span className="text-[8px] text-text-muted uppercase font-bold">Stop Threshold</span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-black text-rose-500 block">
                                  -${formatNumber(Math.abs(calculatePnL(stopLoss)), 2)}
                                </span>
                                <span className="text-[9px] font-black text-rose-500/60 font-mono">
                                  ROI: {((calculatePnL(stopLoss) / (parseFloat(quantity) || 1)) * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center pt-3 border-t border-white/5">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-rose-500 uppercase">Potential Loss</span>
                                <span className="text-[8px] text-text-muted uppercase font-bold">Full Liquidation</span>
                              </div>
                              <span className="text-sm font-black text-rose-500">-${formatNumber(parseFloat(quantity), 2)}</span>
                            </div>
                          )}
                       </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     <p className="text-[10px] font-black text-text-muted uppercase italic">Verifying node availability...</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
         </div>

         <div className="p-8 border-t border-white/5 bg-black/40 space-y-4">
            <div className="flex gap-4">
              {step > 1 && (
                <button 
                  onClick={handlePrevStep}
                  className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Return
                </button>
              )}
              {step < 3 ? (
                <button 
                  onClick={handleNextStep}
                  disabled={isNextDisabled()}
                  className={cn(
                    "flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl",
                    isNextDisabled() 
                      ? "bg-white/5 text-text-muted cursor-not-allowed border border-white/5" 
                      : "bg-white text-bg-dark hover:scale-[1.02] active:scale-95"
                  )}
                >
                  Next Component
                </button>
              ) : (
                <button 
                  onClick={() => setShowConfirmModal(true)}
                  disabled={isTrading}
                  className={cn(
                    "flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-[0.98]",
                    direction === 'Upward' ? "bg-emerald-500 text-bg-dark shadow-emerald-500/20" : "bg-rose-500 text-bg-dark shadow-rose-500/20",
                    isTrading && "opacity-50 cursor-wait"
                  )}
                >
                  {isTrading ? 'INITIALIZING...' : direction === 'Upward' ? 'INITIALIZE BUY' : 'INITIALIZE SELL'}
                </button>
              )}
            </div>
         </div>
      </div>

      <AnimatePresence>
        {showAlertForm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAlertForm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm glass-panel p-8 rounded-[32px] border border-white/10 shadow-2xl space-y-6 overflow-hidden"
            >
              {/* Branding elements */}
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                 <Bell size={120} className="text-brand rotate-12" />
              </div>

              <div className="text-center space-y-2 relative">
                <div className="w-16 h-16 bg-brand/10 border border-brand/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Bell size={32} className="text-brand" />
                </div>
                <h3 className="text-xl font-black tracking-tight italic">PULSE_MONITOR</h3>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest text-balance px-4">Initialize target threshold for {asset.symbol}/USDT</p>
              </div>

              <div className="space-y-6 relative">
                 <div className="space-y-3">
                    <p className="text-[9px] font-black uppercase text-text-muted tracking-widest px-1">Threshold Condition</p>
                    <div className="grid grid-cols-2 gap-2">
                       <button 
                        onClick={() => setAlertCondition('above')}
                        className={cn(
                          "py-3 rounded-xl border text-[10px] font-black uppercase transition-all",
                          alertCondition === 'above' ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-white/5 border-white/5 text-text-muted hover:border-white/10"
                        )}
                       >
                         Price Above
                       </button>
                       <button 
                        onClick={() => setAlertCondition('below')}
                        className={cn(
                          "py-3 rounded-xl border text-[10px] font-black uppercase transition-all",
                          alertCondition === 'below' ? "bg-rose-500/20 border-rose-500/50 text-rose-400" : "bg-white/5 border-white/5 text-text-muted hover:border-white/10"
                        )}
                       >
                         Price Below
                       </button>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <p className="text-[9px] font-black uppercase text-text-muted tracking-widest px-1">Execute Value</p>
                    <div className="relative">
                      <input 
                        type="number"
                        value={alertPrice}
                        onChange={(e) => setAlertPrice(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 px-6 text-xl font-black font-mono outline-none focus:border-brand/50 transition-all text-white"
                        placeholder="0.00"
                        autoFocus
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/5 px-2 py-1 rounded text-[10px] font-black text-text-muted">USDT</div>
                    </div>
                    <p className="text-[10px] font-medium text-text-muted italic px-1">
                      Current Mark: <span className="text-white">${formatNumber(asset.price, 2)}</span>
                    </p>
                 </div>

                 <div className="pt-2 flex flex-col gap-3">
                    <button 
                      onClick={handleCreateAlert}
                      className="w-full py-4 bg-brand text-bg-dark rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                    >
                      Establish Pulse Monitor
                    </button>
                    <button 
                      onClick={() => setShowAlertForm(false)}
                      className="w-full py-3 text-text-muted text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                    >
                      Abort Sequence
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}

        {showAutoTradeModal && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAutoTradeModal(false);
                setAcceptedAutoTradeRisks(false);
              }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm glass-panel p-8 rounded-[32px] border border-brand/20 shadow-[0_0_50px_rgba(0,242,255,0.1)] space-y-6 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand to-transparent" />
              
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-brand/10 border border-brand/20 rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
                  <Cpu size={32} className="text-brand" />
                  <div className="absolute inset-0 bg-brand/20 blur-xl rounded-full animate-pulse" />
                </div>
                <h3 className="text-xl font-black tracking-tight italic text-brand">AUTONOMOUS_PROTOCOL</h3>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-4">Confirm execution override calibration</p>
              </div>

              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Target Probability</p>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number"
                        min="10"
                        max="99"
                        value={winProbability}
                        onChange={(e) => setWinProbability(Math.max(10, Math.min(99, parseInt(e.target.value) || 10)))}
                        className="w-16 bg-white/10 border border-brand/30 rounded-lg text-lg font-black font-mono text-brand text-center outline-none focus:border-brand shadow-[0_0_10px_rgba(0,242,255,0.1)]"
                      />
                      <span className="text-2xl font-black text-brand font-mono">%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <input 
                      type="range"
                      min="10"
                      max="99"
                      step="1"
                      value={winProbability}
                      onChange={(e) => setWinProbability(parseInt(e.target.value))}
                      className="w-full accent-brand bg-white/10 h-2 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden flex relative">
                      <div 
                        className="h-full bg-brand shadow-[0_0_15px_rgba(0,242,255,0.5)] transition-all duration-500" 
                        style={{ width: `${winProbability}%` }} 
                      />
                      <div className="absolute top-0 left-1/2 h-full w-px bg-white/20" />
                      <div className="absolute top-0 left-1/4 h-full w-px bg-white/10" />
                      <div className="absolute top-0 left-3/4 h-full w-px bg-white/10" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Protocol Mode</span>
                    <span className="text-[10px] font-black text-brand uppercase tracking-widest">AUTONOMOUS_SETTLEMENT</span>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Projected Yield</span>
                    <span className="text-[10px] font-black text-white font-mono">{(winProbability / 100).toFixed(2)}:1.00</span>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Bias Coefficient</span>
                    <span className="text-[10px] font-black text-white font-mono">{winProbability/100} QBIT</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-brand/5 border border-brand/10 flex gap-3 items-start">
                  <ShieldCheck size={16} className="text-brand flex-shrink-0" />
                  <p className="text-[9px] font-medium text-text-muted leading-relaxed uppercase tracking-tighter">
                    Activating this protocol will bypass standard market variance. All subsequent trade outcomes will be calculated based on this quantum bias coefficient.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 px-1">
                <button 
                  onClick={() => setAcceptedAutoTradeRisks(!acceptedAutoTradeRisks)}
                  className={cn(
                    "flex-shrink-0 w-5 h-5 rounded border transition-all flex items-center justify-center",
                    acceptedAutoTradeRisks ? "bg-brand border-brand" : "bg-white/5 border-white/10 hover:border-brand/50"
                  )}
                >
                  {acceptedAutoTradeRisks && <ShieldCheck size={12} className="text-bg-dark" />}
                </button>
                <p className="text-[9px] font-medium text-text-muted leading-relaxed uppercase">
                  I confirm that I understand the implications of activating the autonomous settlement protocol and explicitly authorize the use of this probability bias.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    if (!acceptedAutoTradeRisks) {
                      toast.error("Acknowledgement required");
                      return;
                    }
                    setAutoTrade(true);
                    setShowAutoTradeModal(false);
                    setAcceptedAutoTradeRisks(false);
                    toast.success("Autonomous Protocol Engaged", {
                      icon: <ShieldCheck className="text-brand" />
                    });
                  }}
                  disabled={!acceptedAutoTradeRisks}
                  className={cn(
                    "w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                    !acceptedAutoTradeRisks 
                      ? "bg-white/5 text-text-muted cursor-not-allowed" 
                      : "bg-brand text-bg-dark hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(0,242,255,0.3)]"
                  )}
                >
                  Engage Override
                </button>
                <button 
                  onClick={() => {
                    setShowAutoTradeModal(false);
                    setAcceptedAutoTradeRisks(false);
                  }}
                  className="w-full py-3 text-text-muted text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                >
                  Cancel Calibration
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowConfirmModal(false);
                setAcceptedRisks(false);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm glass-panel p-8 rounded-[32px] border border-white/10 shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-brand/10 border border-brand/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={32} className="text-brand" />
                </div>
                <h3 className="text-xl font-black tracking-tight italic">ORDER_REVIEW</h3>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Manual Multi-Signature Authorization</p>
              </div>

              <div className="space-y-3 bg-white/5 p-5 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-text-muted uppercase">Asset</span>
                  <span className="font-black text-white">{asset.symbol} / USDT</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-text-muted uppercase">Direction</span>
                  <span className={cn("font-black", direction === 'Upward' ? "text-emerald-400" : "text-rose-400")}>
                    {tradeType === 'limit' 
                      ? (direction === 'Upward' ? 'LIMIT BUY / LONG (CALL)' : 'LIMIT SELL / SHORT (PUT)') 
                      : (direction === 'Upward' ? 'CALL (BUY)' : 'PUT (SELL)')}
                  </span>
                </div>
                {tradeType === 'limit' && limitPrice && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-text-muted uppercase">Limit Price</span>
                    <span className="font-black text-brand font-mono">${formatNumber(parseFloat(limitPrice), 2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-text-muted uppercase">Leverage</span>
                  <span className="font-black text-white">{leverage}X EXECUTION</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-text-muted uppercase">Amount</span>
                  <span className="font-black text-white font-mono">${formatNumber(parseFloat(quantity), 2)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-text-muted uppercase">Duration</span>
                  <span className="font-black text-white font-mono">{deliveryTime}</span>
                </div>
                {isTpEnabled && takeProfit && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-text-muted uppercase">Take Profit</span>
                    <span className="font-black text-emerald-500 font-mono">${formatNumber(parseFloat(takeProfit), 2)}</span>
                  </div>
                )}
                {isSlEnabled && stopLoss && (
                   <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-text-muted uppercase">Stop Loss</span>
                    <span className="font-black text-rose-500 font-mono">${formatNumber(parseFloat(stopLoss), 2)}</span>
                  </div>
                )}
                <div className="pt-3 mt-3 border-t border-white/10 space-y-2">
                  {autoTrade && (
                    <div className="flex justify-between items-center bg-brand/5 px-2 py-1.5 rounded-lg border border-brand/10 mb-1">
                      <div className="flex items-center gap-1.5">
                        <Cpu size={10} className="text-brand" />
                        <span className="text-[9px] font-black text-brand uppercase tracking-widest">Autonomous Protocol</span>
                      </div>
                      <span className="text-[10px] font-black text-brand font-mono">{winProbability}% BIAS</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-brand uppercase">Win Projection</span>
                      <span className="text-[8px] text-text-muted uppercase font-bold">Target Est.</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-400 block">
                        +${(isTpEnabled && takeProfit) 
                          ? formatNumber(calculatePnL(takeProfit), 2) 
                          : (parseFloat(quantity) * (deliveryTimes.find(t => t.time === deliveryTime)?.rate || 0)).toFixed(2)}
                      </span>
                      <span className="text-[9px] font-black text-brand/60 font-mono">
                        {(isTpEnabled && takeProfit) 
                          ? `ROI: ${((calculatePnL(takeProfit) / (parseFloat(quantity) || 1)) * 100).toFixed(1)}%`
                          : `${(deliveryTimes.find(t => t.time === deliveryTime)?.rate || 0) * 100}%`}
                      </span>
                    </div>
                  </div>

                  {isSlEnabled && stopLoss ? (
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-rose-500 uppercase">Loss Projection</span>
                        <span className="text-[8px] text-text-muted uppercase font-bold">Stop Est.</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-rose-500 block">
                          -${formatNumber(Math.abs(calculatePnL(stopLoss)), 2)}
                        </span>
                        <span className="text-[9px] font-black text-rose-500/60 font-mono">
                          ROI: {((calculatePnL(stopLoss) / (parseFloat(quantity) || 1)) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center py-2 opacity-60">
                      <span className="text-[10px] font-bold text-text-muted uppercase">Potential Loss</span>
                      <span className="text-xs font-black text-rose-400">-${formatNumber(parseFloat(quantity), 2)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 px-1">
                <button 
                  onClick={() => setAcceptedRisks(!acceptedRisks)}
                  className={cn(
                    "flex-shrink-0 w-5 h-5 rounded border transition-all flex items-center justify-center",
                    acceptedRisks ? "bg-brand border-brand" : "bg-white/5 border-white/10 hover:border-brand/50"
                  )}
                >
                  {acceptedRisks && <ShieldCheck size={12} className="text-bg-dark" />}
                </button>
                <p className="text-[9px] font-medium text-text-muted leading-relaxed uppercase">
                  I acknowledge that execution outcomes are finalized upon network consensus and recognize the volatility of the underlying asset.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    if (!acceptedRisks) {
                      toast.error("Protocol acknowledgement required");
                      return;
                    }
                    setShowConfirmModal(false);
                    setAcceptedRisks(false);
                    handlePlaceTrade();
                  }}
                  disabled={!acceptedRisks}
                  className={cn(
                    "w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                    !acceptedRisks ? "bg-white/5 text-text-muted cursor-not-allowed" : direction === 'Upward' ? "bg-emerald-500 text-bg-dark hover:scale-[1.02]" : "bg-rose-500 text-bg-dark hover:scale-[1.02]"
                  )}
                >
                  Confirm & Execute
                </button>
                <button 
                  onClick={() => {
                    setShowConfirmModal(false);
                    setAcceptedRisks(false);
                  }}
                  className="w-full py-3 text-text-muted text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                >
                  Decline Process
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showTakeProfitModal && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowTakeProfitModal(false);
                setPendingTakeProfit(takeProfit);
              }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm glass-panel p-8 rounded-[32px] border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)] space-y-6 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
              
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
                  <TrendingUp size={32} className="text-emerald-500" />
                  <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
                </div>
                <h3 className="text-xl font-black tracking-tight italic text-emerald-500">PROFIT_TARGET_PROTOCOL</h3>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-4">Initialize autonomous exit threshold</p>
              </div>

              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Instrument</span>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{asset.symbol}/USDT</span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Entry Vector</span>
                  <span className="text-[10px] font-black text-white font-mono">${formatNumber(asset.price, 2)}</span>
                </div>
                <div className="pt-3 border-t border-white/5 flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Target Exit</span>
                  <span className="text-xl font-black text-emerald-500 font-mono">${formatNumber(parseFloat(pendingTakeProfit || takeProfit || '0'), 2)}</span>
                </div>
                
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex gap-3 items-start">
                  <Info size={16} className="text-emerald-500 flex-shrink-0" />
                  <p className="text-[9px] font-medium text-text-muted leading-relaxed uppercase tracking-tighter">
                    Upon reaching this threshold, the protocol will automatically finalize the trade, securing the projected yield into your liquidity wallet.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setTakeProfit(pendingTakeProfit || '');
                    setShowTakeProfitModal(false);
                    setPendingTakeProfit(null);
                    toast.success("Take Profit Protocol Synchronized", {
                      icon: <ShieldCheck className="text-emerald-500" />
                    });
                  }}
                  className="w-full py-4 bg-emerald-500 text-bg-dark rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  Confirm Target
                </button>
                <button 
                  onClick={() => {
                    setShowTakeProfitModal(false);
                    setPendingTakeProfit(null);
                  }}
                  className="w-full py-3 text-text-muted text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                >
                  Abort Configuration
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showStopLossModal && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowStopLossModal(false);
                setPendingStopLoss(stopLoss);
              }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm glass-panel p-8 rounded-[32px] border border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.1)] space-y-6 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
              
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
                  <AlertCircle size={32} className="text-rose-500" />
                  <div className="absolute inset-0 bg-rose-500/20 blur-xl rounded-full animate-pulse" />
                </div>
                <h3 className="text-xl font-black tracking-tight italic text-rose-500">STOP_LOSS_PROTOCOL</h3>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-4">Confirm liquidation protection trigger</p>
              </div>

              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Instrument</span>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{asset.symbol}/USDT</span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Entry Vector</span>
                  <span className="text-[10px] font-black text-white font-mono">${formatNumber(asset.price, 2)}</span>
                </div>
                <div className="pt-3 border-t border-white/5 flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">Trigger Price</span>
                  <span className="text-xl font-black text-rose-500 font-mono">${formatNumber(parseFloat(pendingStopLoss || stopLoss || '0'), 2)}</span>
                </div>
                
                <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 flex gap-3 items-start">
                  <Info size={16} className="text-rose-500 flex-shrink-0" />
                  <p className="text-[9px] font-medium text-text-muted leading-relaxed uppercase tracking-tighter">
                    Once the mark price breaches this threshold, the position will be instantly liquidated to prevent further capital depletion.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setStopLoss(pendingStopLoss || '');
                    setShowStopLossModal(false);
                    setPendingStopLoss(null);
                    toast.success("Stop Loss Protocol Synchronized", {
                      icon: <ShieldCheck className="text-rose-500" />
                    });
                  }}
                  className="w-full py-4 bg-rose-500 text-bg-dark rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                >
                  Confirm Trigger
                </button>
                <button 
                  onClick={() => {
                    setShowStopLossModal(false);
                    setPendingStopLoss(null);
                  }}
                  className="w-full py-3 text-text-muted text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                >
                  Abort Configuration
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showSymbolModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSymbolModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-bg-dark border border-white/10 rounded-[32px] overflow-hidden flex flex-col max-h-[80vh] shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 space-y-4 bg-black/40">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-widest">Select Signal Source</h3>
                  <button onClick={() => setShowSymbolModal(false)} className="text-text-muted hover:text-white"><X size={20} /></button>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input 
                    type="text" 
                    placeholder="Search instrument symbol or name..." 
                    value={assetSearchQuery}
                    onChange={(e) => setAssetSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs font-bold outline-none focus:border-brand/40 transition-all placeholder:text-text-muted/30"
                  />
                </div>
                {/* Categorized Filter tags */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 scroll-smooth">
                  {[
                    { id: 'all', label: 'All', icon: <Activity size={10} /> },
                    { id: 'favorites', label: 'Favorites', icon: <Star size={10} className="fill-current text-current" /> },
                    { id: 'most-traded', label: 'Most Traded', icon: <Zap size={10} /> },
                    { id: 'new', label: 'New', icon: <Plus size={10} /> }
                  ].map((cat) => {
                    const isActive = modalCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setModalCategory(cat.id as any)}
                        className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all select-none whitespace-nowrap cursor-pointer",
                          isActive
                            ? "bg-brand text-bg-dark font-black shadow-[0_0_12px_rgba(0,242,255,0.4)]"
                            : "bg-white/5 border border-white/5 text-text-muted hover:text-white hover:bg-white/10"
                        )}
                      >
                        {cat.icon}
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar p-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {modalFilteredAssets.length === 0 ? (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-center gap-3">
                      <Star size={36} className="text-text-muted/30 stroke-[1.5]" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-text-muted">No Matching Assets</p>
                        <p className="text-[9px] text-text-muted/60 mt-1 max-w-[280px]">
                          {modalCategory === 'favorites' 
                            ? "Toggle the star on any asset to synchronize with your custom watchlist" 
                            : "Try adjusting your search query or switching category filters."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    modalFilteredAssets.map((a) => (
                      <button
                        key={a.symbol}
                        onClick={() => {
                          setSelectedSymbol(a.symbol);
                          setShowSymbolModal(false);
                          setStep(1);
                          setQuantityError(null);
                          setAssetSearchQuery('');
                        }}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border transition-all relative group",
                          selectedSymbol === a.symbol 
                            ? "bg-brand/10 border-brand/30 ring-1 ring-brand/20" 
                            : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img src={a.icon} alt={a.symbol} className="w-8 h-8 rounded-full bg-black/20 p-1" referrerPolicy="no-referrer" />
                            <div 
                              onClick={(e) => toggleFavorite(e, a.symbol)}
                              className={cn(
                                "absolute -top-1 -left-1 p-0.5 rounded-full border bg-black transition-all hover:scale-110 cursor-pointer z-10",
                                favorites.includes(a.symbol)
                                  ? "border-amber-400 text-amber-400"
                                  : "border-white/10 text-white/30 group-hover:text-white/60"
                              )}
                              title={favorites.includes(a.symbol) ? "Remove from Favorites" : "Add to Favorites"}
                            >
                              <Star size={8} className={favorites.includes(a.symbol) ? "fill-amber-400" : ""} />
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-black">{a.symbol}/USDT</p>
                              {mostTradedSymbols.includes(a.symbol) && (
                                <span className="text-[6.5px] bg-brand/10 border border-brand/20 text-brand px-1 py-0.2 rounded font-black uppercase tracking-wider">HOT</span>
                              )}
                              {newSymbols.includes(a.symbol) && (
                                <span className="text-[6.5px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-1 py-0.2 rounded font-black uppercase tracking-wider">NEW</span>
                              )}
                            </div>
                            <p className="text-[9px] text-text-muted uppercase font-bold">{a.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black font-mono">${formatNumber(a.price, 2)}</p>
                          <p className={cn("text-[10px] font-bold font-mono", a.change24h >= 0 ? "text-emerald-500" : "text-rose-500")}>
                            {a.change24h > 0 ? '+' : ''}{a.change24h.toFixed(2)}%
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
              <div className="p-4 bg-black/40 border-t border-white/5 flex justify-center">
                 <p className="text-[10px] font-bold text-text-muted uppercase tracking-tight">Showing {modalFilteredAssets.length} of {assets.length} node sources</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
