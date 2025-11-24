
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AssetClass, MarketStateAnalysis, StrategyRecommendation, TradePlan, WatchlistItem, HolisticAdvice, PortfolioItem, QuantitativeMetrics } from "../types";
import { fetchStockPrices, probeStockSymbol } from "./stockService";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const analysisModel = 'gemini-2.5-flash';
const searchModel = 'gemini-2.5-flash';

// --- Cache System ---
interface CacheEntry {
  price: number;
  changePercent: number;
  timestamp: number;
}

const priceCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 1000; // 60 Seconds Cache

// --- Helper for language instructions ---
const getLangInstruction = (lang: string) => {
  return lang === 'zh' 
    ? " IMPORTANT: Respond with JSON where all string values (reasoning, descriptions, action reasons etc.) are in Simplified Chinese (zh-CN)." 
    : " Respond in English.";
};

// Helper to clean and parse JSON from markdown code blocks
const parseJsonFromText = (text: string): any => {
  try {
    // Remove markdown code blocks if present
    let cleanText = text.replace(/```json\n|\n```/g, '').replace(/```/g, '');
    
    // Find the first '{' or '[' to start parsing
    const firstOpenBrace = cleanText.indexOf('{');
    const firstOpenBracket = cleanText.indexOf('[');
    
    let startIndex = -1;
    let endIndex = -1;

    // Determine if it looks like an object or array starts first
    if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
        startIndex = firstOpenBrace;
        endIndex = cleanText.lastIndexOf('}') + 1;
    } else if (firstOpenBracket !== -1) {
        startIndex = firstOpenBracket;
        endIndex = cleanText.lastIndexOf(']') + 1;
    }

    if (startIndex !== -1 && endIndex !== -1) {
      cleanText = cleanText.substring(startIndex, endIndex);
    }
    
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse JSON from AI response:", text);
    throw new Error("Invalid JSON response from AI");
  }
};

// --- Crypto API Integration (CoinGecko) ---
const CRYPTO_ID_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'DOGE': 'dogecoin',
  'XRP': 'ripple',
  'BNB': 'binancecoin',
  'ADA': 'cardano',
  'BTC-USD': 'bitcoin',
  'ETH-USD': 'ethereum'
};

const fetchCryptoPrices = async (symbols: string[]): Promise<Array<{ symbol: string, price: number, changePercent: number }>> => {
  const ids: string[] = [];
  const symbolMap: Record<string, string> = {};

  symbols.forEach(sym => {
    // Normalize symbol
    const cleanSym = sym.toUpperCase().replace('USD', '').replace('-', '');
    // Check map or naive guess
    let id = CRYPTO_ID_MAP[cleanSym];
    if (id) {
      ids.push(id);
      symbolMap[id] = sym; // Map back to original input symbol
    }
  });

  if (ids.length === 0) return [];

  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`);
    const data = await response.json();
    
    const results = [];
    for (const id in data) {
      const originalSymbol = symbolMap[id];
      if (originalSymbol) {
        results.push({
          symbol: originalSymbol,
          price: data[id].usd,
          changePercent: data[id].usd_24h_change
        });
      }
    }
    return results;
  } catch (e) {
    console.warn("CoinGecko API failed, falling back to AI", e);
    return [];
  }
};

// --- Hybrid Price Fetcher ---

export const getBatchRealtimePrices = async (symbols: string[]): Promise<Array<{ symbol: string, price: number, changePercent: number }>> => {
  const results: Array<{ symbol: string, price: number, changePercent: number }> = [];
  let symbolsToFetch: string[] = [];
  const cryptoSymbols: string[] = [];
  const stockSymbols: string[] = [];
  const now = Date.now();

  // 1. Check Cache First
  symbols.forEach(sym => {
    const cached = priceCache.get(sym);
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      results.push({ symbol: sym, price: cached.price, changePercent: cached.changePercent });
    } else {
      symbolsToFetch.push(sym);
    }
  });

  // 2. Segregate remaining symbols
  symbolsToFetch.forEach(sym => {
    const cleanSym = sym.toUpperCase();
    if (CRYPTO_ID_MAP[cleanSym] || cleanSym === 'BTC' || cleanSym === 'ETH') {
      cryptoSymbols.push(sym);
    } else {
      stockSymbols.push(sym);
    }
  });

  // 3. Fetch Crypto via API
  if (cryptoSymbols.length > 0) {
    const cryptoResults = await fetchCryptoPrices(cryptoSymbols);
    cryptoResults.forEach(res => {
      priceCache.set(res.symbol, { price: res.price, changePercent: res.changePercent, timestamp: now });
      results.push(res);
    });
  }

  // 4. Fetch Stocks via Tencent API (New Layer)
  if (stockSymbols.length > 0) {
    const stockResults = await fetchStockPrices(stockSymbols);
    stockResults.forEach(res => {
      priceCache.set(res.symbol, { price: res.price, changePercent: res.changePercent, timestamp: now });
      results.push(res);
    });
  }

  return results;
};

export const getRealtimePrice = async (symbol: string): Promise<{ price: number, changePercent: number, name?: string }> => {
  try {
    const result = await getBatchRealtimePrices([symbol]);
    if (result.length > 0) {
      return result[0];
    }
    return { price: 0, changePercent: 0 };
  } catch (error) {
    console.error(`Price fetch failed for ${symbol}:`, error);
    return { price: 0, changePercent: 0 };
  }
};

// --- Real-time Asset Search (Enhanced Hybrid) ---

export const searchAssetDetails = async (symbol: string, language: string): Promise<Partial<WatchlistItem>> => {
  const cleanSym = symbol.trim().toUpperCase();

  // 1. Try Crypto API First (Instant)
  if (CRYPTO_ID_MAP[cleanSym] || cleanSym === 'BTC' || cleanSym === 'ETH') {
    const prices = await fetchCryptoPrices([cleanSym]);
    if (prices.length > 0) {
      return {
        symbol: cleanSym,
        name: `${cleanSym} Crypto`,
        currentPrice: prices[0].price,
        currency: 'USD',
        sector: 'Cryptocurrency',
        assetClass: AssetClass.PRECIOUS_METALS, // Bucket crypto here for now or add new enum
        market: 'Global'
      };
    }
  }

  // 2. Try Stock API Probe (Fast, <500ms)
  const probeResult = await probeStockSymbol(cleanSym);
  if (probeResult) {
    let assetClass = AssetClass.HK_STOCKS;
    if (probeResult.currency === 'USD') assetClass = AssetClass.HK_STOCKS; // Bucket US under HK/General for now
    if (probeResult.currency === 'CNY') assetClass = AssetClass.A_SHARES;
    
    return {
      symbol: probeResult.symbol,
      name: probeResult.name,
      currentPrice: probeResult.price,
      currency: probeResult.currency,
      sector: 'General', // API doesn't give sector, AI can fill later
      assetClass: assetClass,
      market: probeResult.exchange
    };
  }

  // 3. Fallback to Gemini AI (Slow, ~5s)
  // Only used if APIs fail to find anything
  try {
    const response = await ai.models.generateContent({
      model: searchModel,
      contents: `Find the real-time or latest available financial data for the ticker symbol: "${symbol}".
      I need the full company name, current price, currency, sector, and exchange.
      If it is a Chinese stock (starts with 60 or 00 or 30), it is likely A-Shares.
      If it ends in .HK, it is HK Stocks.
      If it is Gold/Silver, it is Precious Metals.
      
      Return a VALID JSON object with the following properties:
      {
        "name": "string",
        "currentPrice": number,
        "currency": "string",
        "sector": "string",
        "assetClass": "HK Stocks" | "A-Shares" | "Bonds" | "Precious Metals" | "Cash",
        "market": "string"
      }
      If multiple matches are found, choose the single best match.
      Only return the JSON object. Do not add conversational text.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `You are a financial data assistant. Fetch accurate, latest market data using Google Search.${getLangInstruction(language)}`
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const parsed = parseJsonFromText(text);
    
    if (Array.isArray(parsed)) {
      if (parsed.length > 0) {
        return parsed[0];
      }
      throw new Error("Received empty array from AI");
    }
    
    return parsed;
  } catch (error) {
    console.error("Asset search failed:", error);
    throw error;
  }
};

// --- Market Classification (QUANTITATIVE) ---

export const classifyMarketState = async (
  metrics: QuantitativeMetrics, 
  language: string,
): Promise<MarketStateAnalysis> => {
  console.log("--- [GEMINI] classifyMarketState Called ---");
  console.log("--- [GEMINI] Metrics Input:", metrics);
  
  try {
    let promptText = `Analyze the following PROFESSIONAL Quantitative Market Data for ${metrics.symbol}.
    
    --- KEY INDICATORS ---
    1. PRICE: ${metrics.currentPrice}
    2. VOLATILITY (Annualized): ${metrics.volatility.toFixed(2)}%
    3. TREND (MA20 Deviation): ${metrics.maDeviation.toFixed(2)}%
    4. MOMENTUM (RSI 14): ${metrics.rsi?.toFixed(2) || 'N/A'} (Above 70=Overbought, Below 30=Oversold)
    5. TREND STRENGTH (MACD Hist): ${metrics.macdHistogram?.toFixed(2) || 'N/A'} (Positive & Rising = Strong Bull)
    6. SQUEEZE (Bollinger BW): ${metrics.bollingerBandwidth?.toFixed(2) || 'N/A'}% (Low = Potential Explosive Move)

    --- TASK ---
    1. Define the Market Regime (e.g., "Bullish Breakout", "Oversold Bounce", "Volatility Squeeze").
    2. Identify Risks (e.g., RSI Divergence, Top Heavy).
    3. Suggest a Strategy (e.g., "Buy the dip", "Fade the rally", "Wait for breakout").
    
    Return a VALID JSON object with the following schema:
    {
      "regime": "string (Short Regime Title)",
      "trend": "Bullish" | "Bearish" | "Neutral" | "Volatile",
      "confidence": number (80-100),
      "reasoning": "string (Explain using the RSI, MACD, and Volatility data provided)",
      "suggestedAllocation": {
        "equity": number,
        "bonds": number,
        "commodities": number,
        "cash": number
      }
    }
    `;

    console.log("--- [GEMINI] Sending Prompt to AI... ---");

    const response = await ai.models.generateContent({
      model: analysisModel,
      contents: promptText,
      config: {
        systemInstruction: `You are a Senior Quantitative Strategist. Use the technical indicators (RSI, MACD, Bollinger) to form a professional opinion.${getLangInstruction(language)}`
      }
    });

    console.log("--- [GEMINI] AI Response Received ---", response);

    const text = response.text;
    if (!text) throw new Error("No response text");
    
    const parsed = parseJsonFromText(text) as MarketStateAnalysis;
    
    return {
      ...parsed,
      id: Date.now().toString(),
      timestamp: Date.now(),
      metrics: metrics
    };
  } catch (error) {
    console.error("--- [GEMINI] classifyMarketState FAILED ---", error);
    throw error;
  }
};

// --- Strategy Recommendation ---

const strategySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    type: { type: Type.STRING },
    description: { type: Type.STRING },
    rationale: { type: Type.STRING },
    riskLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
    targetReturn: { type: Type.STRING },
    entryTrigger: { type: Type.STRING },
    exitTrigger: { type: Type.STRING }
  },
  required: ['name', 'type', 'description', 'rationale', 'riskLevel', 'targetReturn', 'entryTrigger', 'exitTrigger']
};

export const generateStrategy = async (assetClass: AssetClass, marketState: string, language: string): Promise<StrategyRecommendation> => {
  try {
    const response = await ai.models.generateContent({
      model: analysisModel,
      contents: `Suggest a trading strategy for ${assetClass} given a ${marketState} market environment. 
      The user targets 20% annualized return, so the strategy can be aggressive but must have risk controls.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: strategySchema,
        systemInstruction: `You are a hedge fund portfolio manager specializing in multi-asset strategies.${getLangInstruction(language)}`
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as StrategyRecommendation;
  } catch (error) {
    console.error("Strategy generation failed:", error);
    throw error;
  }
};

// --- Risk Analysis ---

const riskSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    riskRewardRatio: { type: Type.NUMBER },
    kellyPercentage: { type: Type.NUMBER, description: "Suggested fraction of bankroll to wager based on Kelly Criterion (0-100)" },
    aiFeedback: { type: Type.STRING, description: "Constructive feedback on the trade setup" },
    entryPrice: { type: Type.NUMBER },
    targetPrice: { type: Type.NUMBER },
    stopLoss: { type: Type.NUMBER },
    maxLoss: { type: Type.NUMBER },
    estimatedProfit: { type: Type.NUMBER },
    positionSize: { type: Type.NUMBER }
  },
  required: ['riskRewardRatio', 'kellyPercentage', 'aiFeedback', 'entryPrice', 'targetPrice', 'stopLoss', 'maxLoss', 'estimatedProfit']
};

export const analyzeTradeRisk = async (
  symbol: string, 
  entry: number, 
  stop: number, 
  target: number, 
  capital: number,
  language: string
): Promise<TradePlan> => {
  try {
    const response = await ai.models.generateContent({
      model: analysisModel,
      contents: `Analyze this proposed trade:
      Symbol: ${symbol}
      Entry: ${entry}
      Stop Loss: ${stop}
      Take Profit: ${target}
      Total Account Capital: ${capital}
      
      Calculate Risk/Reward, Max Loss, Profit, and suggest Kelly Criterion allocation percentage (assume 50% win rate for conservative estimate unless setup implies otherwise). Give advice on whether this meets a 20% annual return framework.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: riskSchema,
        systemInstruction: `You are a strict Risk Manager. Your job is to prevent the user from blowing up their account.${getLangInstruction(language)}`
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as TradePlan;
  } catch (error) {
    console.error("Risk analysis failed:", error);
    throw error;
  }
};

// --- Watchlist Target Analysis (Enhanced with Search) ---

export const analyzeTargetAsset = async (item: WatchlistItem, marketContext: string, language: string): Promise<Partial<WatchlistItem>> => {
  try {
    const response = await ai.models.generateContent({
      model: analysisModel, 
      contents: `Analyze this asset: ${item.symbol} (${item.name}). 
      Market Context: ${marketContext}.
      Current Price: ${item.currentPrice}.
      
      First, use the search tool to find the LATEST news, analyst ratings, and technical indicators for ${item.symbol}.
      Then, provide a score (0-100) on whether to buy now for a medium-term trend trade targeting 20% annual gain.
      
      Return a VALID JSON object:
      {
        "score": number, // 0-100
        "status": "Buy" | "Sell" | "Hold" | "Watch",
        "lastAnalysis": "string (max 15 words summary)"
      }
      `,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `You are an investment analyst using real-time data.${getLangInstruction(language)}`
      }
    });
    const text = response.text;
    if (!text) throw new Error("No response");
    
    const parsed = parseJsonFromText(text);
    if (Array.isArray(parsed)) return parsed[0] || {};
    return parsed;
  } catch (error) {
    console.error("Target analysis failed", error);
    throw error;
  }
};

// --- Holistic Advice (PROFESSIONAL UPGRADE) ---

const adviceSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    marketContext: { type: Type.STRING },
    projectedImpact: { type: Type.STRING },
    actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ['BUY', 'SELL', 'HOLD', 'REBALANCE'] },
          asset: { type: Type.STRING },
          ticker: { type: Type.STRING },
          quantity: { type: Type.STRING },
          estimatedValue: { type: Type.NUMBER },
          reason: { type: Type.STRING },
          urgency: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
          
          // New Professional Fields
          strategyTag: { type: Type.STRING, description: "Strategy name e.g. 'Trend Breakout', 'Mean Reversion'" },
          entryLow: { type: Type.NUMBER, description: "Lower bound of recommended entry range" },
          entryHigh: { type: Type.NUMBER, description: "Upper bound of recommended entry range" },
          targetPrice: { type: Type.NUMBER, description: "Take Profit level" },
          stopLoss: { type: Type.NUMBER, description: "Stop Loss level" },
          riskRewardRatio: { type: Type.NUMBER, description: "Calculated R/R ratio" }
        },
        required: ['action', 'asset', 'ticker', 'quantity', 'estimatedValue', 'reason', 'urgency', 'entryLow', 'entryHigh', 'targetPrice', 'stopLoss']
      }
    },
  },
  required: ['summary', 'marketContext', 'actions', 'projectedImpact']
};

export const generateHolisticAdvice = async (
  portfolio: PortfolioItem[],
  watchlist: WatchlistItem[],
  marketAnalysis: MarketStateAnalysis | undefined,
  language: string
): Promise<HolisticAdvice> => {
  try {
    // Prepare prompt data
    const portfolioSummary = JSON.stringify(portfolio.map(p => ({ 
        s: p.symbol, 
        val: p.marketValue, 
        price: p.currentPrice 
    })));
    
    const watchlistSummary = JSON.stringify(watchlist.map(w => ({ 
        s: w.symbol, 
        price: w.currentPrice,
        score: w.score 
    })));

    const marketContextStr = marketAnalysis 
        ? `REGIME: ${marketAnalysis.regime}. TREND: ${marketAnalysis.trend}. METRICS: RSI=${marketAnalysis.metrics?.rsi?.toFixed(1)}, Vol=${marketAnalysis.metrics?.volatility?.toFixed(1)}%`
        : "General Market";

    const promptText = `
      Generate a PROFESSIONAL TRADING PLAN & PORTFOLIO STRATEGY.
      
      --- USER PROFILE ---
      Goal: 20% Annualized Return (Aggressive Growth).
      Capital: 10,000,000 RMB.
      
      --- CURRENT DATA ---
      Portfolio: ${portfolioSummary}
      Watchlist: ${watchlistSummary}
      MARKET CONTEXT: ${marketContextStr}
      
      --- TASK ---
      Recommend specific BUY/SELL actions.
      For every 'BUY' action, you act as a SENIOR TRADER. You must provide:
      1. A specific Strategy (e.g., "RSI Oversold Bounce", "Trend Breakout").
      2. A specific Entry Zone (Low/High) based on the asset's current price and volatility.
      3. A Stop Loss (Technical support level).
      4. A Target Price (Resistance level).
      5. Calculate the Risk/Reward Ratio (Target - Entry) / (Entry - Stop).

      Money Management Rules:
      - If holding CASH, deploy into best watchlist targets.
      - Position Size: 5% - 15% per asset depending on conviction.
      
      Output purely in JSON matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: analysisModel,
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: adviceSchema,
        systemInstruction: `You are a Senior Portfolio Manager & Quant Trader. You provide executable trade plans with specific price levels.${getLangInstruction(language)}`
      }
    });
    
    const text = response.text;
    if (!text) throw new Error("No response");
    
    const rawData = JSON.parse(text);
    return {
      ...rawData,
      id: Date.now().toString(),
      timestamp: Date.now(),
      actions: rawData.actions.map((a: any, idx: number) => ({
        ...a,
        id: `${Date.now()}_${idx}`,
        status: 'Pending',
        // Fill defaults if AI misses them to prevent crash
        strategyTag: a.strategyTag || 'General Allocation',
        entryLow: a.entryLow || a.estimatedValue, // Fallback
        riskRewardRatio: a.riskRewardRatio || 1.5
      }))
    };
  } catch (error) {
    console.error("Holistic advice failed", error);
    throw error;
  }
};
