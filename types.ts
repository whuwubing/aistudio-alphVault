
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
  
  // Risk Management Fields
  stopLoss?: number;
  targetPrice?: number;
  strategyTag?: string;
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

export interface QuantitativeMetrics {
  symbol: string;
  currentPrice: number;
  ma20: number;
  maDeviation: number; // % distance from MA20
  volatility: number; // Annualized Volatility %
  trendStrength: number; // 0-100
  regimeType: string;
  
  // Professional Technical Indicators
  rsi: number;
  macd: number;        // MACD Line
  macdSignal: number;  // Signal Line
  macdHistogram: number; 
  bollingerUpper: number;
  bollingerLower: number;
  bollingerBandwidth: number; // (Upper - Lower) / Middle * 100
}

export interface MarketStateAnalysis {
  id?: string;
  timestamp?: number;
  regime: string; // "High Volatility Bull", "Low Volatility Bear" etc.
  trend: 'Bullish' | 'Bearish' | 'Neutral' | 'Volatile';
  confidence: number;
  reasoning: string;
  suggestedAllocation: {
    equity: number;
    bonds: number;
    commodities: number;
    cash: number;
  };
  metrics?: QuantitativeMetrics;
  chartData?: any[]; // For storing snapshot of KLine
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
  id: string;
  action: 'BUY' | 'SELL' | 'HOLD' | 'REBALANCE';
  asset: string; // Display Name
  ticker: string; // Stock Symbol for execution (e.g. 0700.HK)
  quantity: string; // Text description (e.g. "10%")
  estimatedValue: number; // Numeric value for execution logic
  reason: string;
  urgency: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'Executed' | 'Failed';
  
  // New Professional Fields
  strategyTag?: string; // e.g. "Trend Breakout", "Mean Reversion"
  entryLow?: number;
  entryHigh?: number;
  targetPrice?: number;
  stopLoss?: number;
  riskRewardRatio?: number;
}

export interface HolisticAdvice {
  id: string;
  timestamp: number;
  summary: string;
  marketContext: string;
  actions: ActionItem[];
  projectedImpact: string;
}