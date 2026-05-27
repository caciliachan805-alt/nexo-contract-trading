import { Asset, MiningPlan } from './types';

export const DUMMY_USER = {
  uid: 'user123',
  email: 'bib663704@gmail.com',
  displayName: 'awen800',
  level: 1,
  kycVerified: true,
  portfolioValue: 357407.00,
  availableBalance: 2478.50,
  winRate: 0,
  referrals: 0,
  memberSince: '5/1/2026',
};

export const INITIAL_ASSETS: Asset[] = [
  { id: 'btc', symbol: 'BTC', name: 'Bitcoin', price: 78673.60, change24h: 2.86, balance: 1.5521, value: 122105.04, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png' },
  { id: 'eth', symbol: 'ETH', name: 'Ethereum', price: 2314.39, change24h: 2.03, balance: 13.1356, value: 30397.22, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { id: 'sol', symbol: 'SOL', name: 'Solana', price: 104.52, change24h: 5.42, balance: 45.2, value: 4724.30, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  { id: 'bnb', symbol: 'BNB', name: 'Binance Coin', price: 622.11, change24h: 0.98, balance: 0.0041, value: 45367.54, icon: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png' },
  { id: 'xrp', symbol: 'XRP', name: 'XRP', price: 1.3989, change24h: -2.13, balance: 2143.62, value: 2998.29, icon: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' },
  { id: 'ada', symbol: 'ADA', name: 'Cardano', price: 0.58, change24h: 1.25, balance: 1000.0, value: 580.0, icon: 'https://cryptologos.cc/logos/cardano-ada-logo.png' },
  { id: 'doge', symbol: 'DOGE', name: 'Dogecoin', price: 0.16, change24h: 8.74, balance: 50000.0, value: 8000.0, icon: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
  { id: 'dot', symbol: 'DOT', name: 'Polkadot', price: 8.45, change24h: -0.42, balance: 250.0, value: 2112.5, icon: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png' },
  { id: 'matic', symbol: 'MATIC', name: 'Polygon', price: 0.82, change24h: -1.15, balance: 3000.0, value: 2460.0, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.png' },
  { id: 'trx', symbol: 'TRX', name: 'TRON', price: 0.12, change24h: 0.15, balance: 15000.0, value: 1800.0, icon: 'https://cryptologos.cc/logos/tron-trx-logo.png' },
  { id: 'link', symbol: 'LINK', name: 'Chainlink', price: 18.24, change24h: 3.21, balance: 100.0, value: 1824.0, icon: 'https://cryptologos.cc/logos/chainlink-link-logo.png' },
  { id: 'avax', symbol: 'AVAX', name: 'Avalanche', price: 38.45, change24h: 4.56, balance: 50.0, value: 1922.5, icon: 'https://cryptologos.cc/logos/avalanche-avax-logo.png' },
  { id: 'shib', symbol: 'SHIB', name: 'Shiba Inu', price: 0.000027, change24h: 3.12, balance: 100000000, value: 2700.0, icon: 'https://cryptologos.cc/logos/shiba-inu-shib-logo.png' },
  { id: 'ltc', symbol: 'LTC', name: 'Litecoin', price: 84.12, change24h: -0.85, balance: 25.0, value: 2103.0, icon: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png' },
  { id: 'dai', symbol: 'DAI', name: 'Dai', price: 1.00, change24h: 0.01, balance: 1000.0, value: 1000.0, icon: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png' },
  { id: 'bch', symbol: 'BCH', name: 'Bitcoin Cash', price: 478.25, change24h: 1.45, balance: 10.0, value: 4782.5, icon: 'https://cryptologos.cc/logos/bitcoin-cash-bch-logo.png' },
  { id: 'uni', symbol: 'UNI', name: 'Uniswap', price: 7.85, change24h: -2.31, balance: 500.0, value: 3925.0, icon: 'https://cryptologos.cc/logos/uniswap-uni-logo.png' },
  { id: 'atom', symbol: 'ATOM', name: 'Cosmos', price: 9.12, change24h: 0.88, balance: 300.0, value: 2736.0, icon: 'https://cryptologos.cc/logos/cosmos-atom-logo.png' },
  { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol', price: 5.42, change24h: 12.15, balance: 1000.0, value: 5420.0, icon: 'https://cryptologos.cc/logos/near-protocol-near-logo.png' },
  { id: 'apt', symbol: 'APT', name: 'Aptos', price: 9.24, change24h: -4.12, balance: 200.0, value: 1848.0, icon: 'https://cryptologos.cc/logos/aptos-apt-logo.png' },
  { id: 'arb', symbol: 'ARB', name: 'Arbitrum', price: 1.15, change24h: 2.34, balance: 5000.0, value: 5750.0, icon: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png' },
  { id: 'op', symbol: 'OP', name: 'Optimism', price: 2.42, change24h: 1.12, balance: 2000.0, value: 4840.0, icon: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.png' },
  { id: 'pepe', symbol: 'PEPE', name: 'PEPE', price: 0.000008, change24h: 15.42, balance: 500000000, value: 4000.0, icon: 'https://cryptologos.cc/logos/pepe-pepe-logo.png' },
  { id: 'stx', symbol: 'STX', name: 'Stacks', price: 2.15, change24h: 3.25, balance: 1000.0, value: 2150.0, icon: 'https://cryptologos.cc/logos/stacks-stx-logo.png' },
  { id: 'fil', symbol: 'FIL', name: 'Filecoin', price: 6.12, change24h: -1.45, balance: 500.0, value: 3060.0, icon: 'https://cryptologos.cc/logos/filecoin-fil-logo.png' },
  { id: 'usdt', symbol: 'USDT', name: 'Tether', price: 1.00, change24h: 0.01, balance: 5000.00, value: 5000.00, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  { id: 'usdc', symbol: 'USDC', name: 'USD Coin', price: 1.00, change24h: 0.01, balance: 2500.00, value: 2500.00, icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png' },
];

export const MINING_PLANS: MiningPlan[] = [
  { id: '1', name: '2 Weeks (14 days) - 10% Daily Profit', durationDays: 14, dailyProfit: 10, minInvestment: 50 },
  { id: '2', name: '1 Month (30 days) - 15% Daily Profit', durationDays: 30, dailyProfit: 15, minInvestment: 100 },
  { id: '3', name: '3 Months (90 days) - 20% Daily Profit', durationDays: 90, dailyProfit: 20, minInvestment: 500 },
];

export const DEPOSIT_ADDRESSES = {
  BTC: '133rP4nJ6kpJmQzecLbYtKNzNZBZrLXLbe',
  ETH: '0x035c03b9620e72dd96afba8c8e1f313f3e5d1857',
  USDT: '0x035c03b9620e72dd96afba8c8e1f313f3e5d1857',
  USDC: '0x035c03b9620e72dd96afba8c8e1f313f3e5d1857',
  XRP: 'rNxp4h8apvRis6mJf9Sh8C6iRxfrDWN7AV',
  BNB: '0x035c03b9620e72dd96afba8c8e1f313f3e5d1857',
  SOL: '7xSTJzM3G9XoK8F7L8mRj8r9Z6tD5hJ2k4L7M8N9P1',
  ADA: 'addr1q9p8j7x6c5v4b3n2m1l0k9j8h7g6f5d4s3a2q1',
  TRX: 'TXYzM3G9XoK8F7L8mRj8r9Z6tD5hJ2k4L7M8N9P1',
};
