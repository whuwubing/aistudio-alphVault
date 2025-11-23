export enum AssetClass {
  HK_STOCKS = 'HK Stocks',
  A_SHARES = 'A-Shares',
  BONDS = 'Bonds',
  PRECIOUS_METALS = 'Precious Metals',
  CASH = 'Cash'
}

export enum StrategyType {
  TREND_FOLLOWING = 'Trend Following',
  MEAN_REVERSION = 'Mean Reversion (Overbought/Oversold)',
  ARBITRAGE = 'Arbitrage',
  EVENT_DRIVEN = 'Event Driven',
  MACRO_HEDGING = 'Macro Hedging'
}

export interface PortfolioItem {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  pnl: number;
  pnlPercent: number;
  lastUpdated?: number;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  currentPrice: number;
  currency?: string;
  sector?: string;
  market?: string;
  score: number; // AI Score 0-100
  status: 'Watch' | 'Buy' | 'Sell' | 'Hold';
  lastAnalysis: string; // Summary of AI analysis
  lastUpdated: number; // Timestamp
}

export interface MarketStateAnalysis {
  regime: string;
  trend: 'Bullish' | 'Bearish' | 'Neutral' | 'Volatile';
  confidence: number;
  reasoning: string;
  suggestedAllocation: {
    equity: number;
    bonds: number;
    commodities: number;
    cash: number;
  };
}

export interface StrategyRecommendation {
  name: string;
  type: StrategyType;
  description: string;
  rationale: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  targetReturn: string;
  entryTrigger: string;
  exitTrigger: string;
}

export interface TradePlan {
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  positionSize: number;
  riskRewardRatio: number;
  maxLoss: number;
  estimatedProfit: number;
  kellyPercentage?: number;
  aiFeedback: string;
}

export interface ActionItem {
  action: 'BUY' | 'SELL' | 'HOLD' | 'REBALANCE';
  asset: string;
  quantity?: string; // e.g. "100 shares" or "10% of position"
  reason: string;
  urgency: 'High' | 'Medium' | 'Low';
}

export interface HolisticAdvice {
  summary: string;
  marketContext: string;
  actions: ActionItem[];
  projectedImpact: string;
}