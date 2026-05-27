export interface User {
  uid: string;
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  portfolioValue: number;
  availableBalance: number;
  level: number;
  kycVerified: boolean;
  winRate: number;
  referrals: number;
  memberSince: string;
  withdrawalLimitDaily?: number;
  withdrawalLimitMonthly?: number;
  twoFactorThreshold?: number;
  twoFactorEnabled?: boolean;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  balance: number;
  value: number;
  icon: string;
}

export interface Trade {
  id: string;
  userId: string;
  asset: string;
  direction: 'up' | 'down';
  duration: number;
  amount: number;
  priceAtEntry: number;
  priceAtExit?: number;
  leverage: number;
  returnRate: number;
  profit?: number;
  stopLoss?: number;
  takeProfit?: number;
  tradeType?: 'market' | 'limit' | 'stop-loss' | 'take-profit';
  timestamp: string;
  endTime: string;
  status: 'pending' | 'won' | 'lost';
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'convert' | 'mining' | 'swap' | 'transfer' | 'deposit' | 'withdrawal' | 'trade_profit' | 'trade_loss';
  assetFrom?: string;
  assetTo?: string;
  amountFrom?: number;
  amountTo: number;
  fee?: number;
  timestamp: string;
  updatedAt?: string;
  status: 'approved' | 'pending' | 'failed' | 'rejected';
  txHash?: string;
  note?: string;
  toAddress?: string;
}

export interface KYCDocument {
  id: string;
  userId: string;
  type: 'passport' | 'id_card' | 'driver_license';
  documentUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  adminId?: string;
  action: string;
  targetId?: string;
  targetType?: string;
  details?: any;
  timestamp: string;
  ipAddress?: string;
}

export interface MiningPlan {
  id: string;
  name: string;
  durationDays: number;
  dailyProfit: number;
  minInvestment: number;
}

export interface ActivePlan {
  id: string;
  planId: string;
  amount: number;
  startedAt: string;
  endsAt: string;
  status: 'active' | 'completed';
}

export interface PriceAlert {
  id: string;
  userId: string;
  asset: string;
  threshold: number;
  condition: 'above' | 'below';
  status: 'active' | 'triggered';
  createdAt: string;
}
