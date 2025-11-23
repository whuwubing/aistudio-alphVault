import { AssetClass, PortfolioItem, WatchlistItem } from './types';

export const INITIAL_PORTFOLIO: PortfolioItem[] = [
  {
    id: '1',
    symbol: '0700.HK',
    name: 'Tencent Holdings',
    assetClass: AssetClass.HK_STOCKS,
    quantity: 100,
    avgPrice: 320,
    currentPrice: 385,
    marketValue: 38500,
    pnl: 6500,
    pnlPercent: 20.31
  },
  {
    id: '2',
    symbol: '600519.SS',
    name: 'Kweichow Moutai',
    assetClass: AssetClass.A_SHARES,
    quantity: 200,
    avgPrice: 1650,
    currentPrice: 1720,
    marketValue: 344000,
    pnl: 14000,
    pnlPercent: 4.24
  },
  {
    id: '3',
    symbol: 'XAUUSD',
    name: 'Gold Spot',
    assetClass: AssetClass.PRECIOUS_METALS,
    quantity: 10,
    avgPrice: 2150,
    currentPrice: 2350,
    marketValue: 23500,
    pnl: 2000,
    pnlPercent: 9.3
  },
  {
    id: '4',
    symbol: 'TLT',
    name: '20+ Year Treasury Bond ETF',
    assetClass: AssetClass.BONDS,
    quantity: 50,
    avgPrice: 98,
    currentPrice: 92,
    marketValue: 4600,
    pnl: -300,
    pnlPercent: -6.12
  }
];

export const INITIAL_WATCHLIST: WatchlistItem[] = [
  {
    id: 'w1',
    symbol: '9988.HK',
    name: 'Alibaba',
    assetClass: AssetClass.HK_STOCKS,
    currentPrice: 75.50,
    score: 65,
    status: 'Watch',
    lastAnalysis: 'Undervalued based on P/E, but regulatory headwinds persist. Waiting for technical breakout above 80.',
    lastUpdated: Date.now() - 86400000 // 1 day ago
  },
  {
    id: 'w2',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetClass: AssetClass.HK_STOCKS, // Using generalized bucket
    currentPrice: 175.20,
    score: 45,
    status: 'Hold',
    lastAnalysis: 'Overextended on daily chart. RSI divergence suggests potential pullback.',
    lastUpdated: Date.now() - 172800000 // 2 days ago
  },
  {
    id: 'w3',
    symbol: '300750.SZ',
    name: 'CATL',
    assetClass: AssetClass.A_SHARES,
    currentPrice: 180.00,
    score: 82,
    status: 'Buy',
    lastAnalysis: 'Strong earnings growth and dominant market position. Battery sector showing momentum.',
    lastUpdated: Date.now() - 3600000 // 1 hour ago
  }
];

export const MOCK_PERFORMANCE_DATA = [
  { month: 'Jan', value: 100000, target: 101600 },
  { month: 'Feb', value: 103000, target: 103300 },
  { month: 'Mar', value: 102500, target: 105000 },
  { month: 'Apr', value: 108000, target: 106700 },
  { month: 'May', value: 112000, target: 108500 },
  { month: 'Jun', value: 110500, target: 110300 },
  { month: 'Jul', value: 115000, target: 112100 },
];