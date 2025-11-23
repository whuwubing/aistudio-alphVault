
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AssetClass, MarketStateAnalysis, StrategyRecommendation, TradePlan, WatchlistItem, HolisticAdvice, PortfolioItem } from "../types";
import { fetchStockPrices } from "./stockService";

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
// Direct API is much faster and reliable for Crypto than AI Search
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
    
    // If API missed any, add back to stocks (unlikely but possible)
    const foundCrypto = new Set(cryptoResults.map(r => r.symbol));
    cryptoSymbols.forEach(sym => {
      if (!foundCrypto.has(sym)) stockSymbols.push(sym);
    });
  }

  // 4. Fetch Stocks via Tencent API (New Layer)
  const symbolsForAI: string[] = [];
  if (stockSymbols.length > 0) {
    const stockResults = await fetchStockPrices(stockSymbols);
    const foundStock = new Set<string>();
    
    stockResults.forEach(res => {
      priceCache.set(res.symbol, { price: res.price, changePercent: res.changePercent, timestamp: now });
      results.push(res);
      foundStock.add(res.symbol);
    });

    // Only send what Stock API missed to AI
    stockSymbols.forEach(sym => {
      if (!foundStock.has(sym)) {
        symbolsForAI.push(sym);
      }
    });
  }

  // 5. Fetch remaining via Gemini AI (Batch) - Fallback of last resort
  if (symbolsForAI.length > 0) {
    try {
      const symbolsString = symbolsForAI.join(', ');
      // Artificial delay to respect rate limits if we reach this point frequently
      await new Promise(r => setTimeout(r, 1000));

      const response = await ai.models.generateContent({
        model: searchModel,
        contents: `Find the current real-time price and today's percentage change for: "${symbolsString}".
        
        Return a VALID JSON ARRAY.
        Format: [{"symbol": "string", "price": number, "changePercent": number}]
        
        If a stock is HK/China, convert price to local currency but indicate purely as number.
        Use Google Search to ensure data is fresh.`,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: `You are a financial data API. Extract precise numeric data.`
        }
      });

      const text = response.text;
      if (text) {
        const parsed = parseJsonFromText(text);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
             // Basic validation
             if (item.symbol && typeof item.price === 'number') {
                priceCache.set(item.symbol, { price: item.price, changePercent: item.changePercent, timestamp: now });
                results.push(item);
             }
          });
        }
      }
    } catch (error) {
      console.error(`AI Batch price fetch failed:`, error);
      // Fail silently for AI part, return what we have
    }
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

// --- Real-time Asset Search (Grounding) ---

export const searchAssetDetails = async (symbol: string, language: string): Promise<Partial<WatchlistItem>> => {
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

// --- Market Classification ---

const marketStateSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    regime: { type: Type.STRING, description: "Economic regime description (e.g. Stagflation)" },
    trend: { type: Type.STRING, enum: ['Bullish', 'Bearish', 'Neutral', 'Volatile'] },
    confidence: { type: Type.NUMBER, description: "Confidence score 0-100" },
    reasoning: { type: Type.STRING, description: "Short reasoning for the classification" },
    suggestedAllocation: {
      type: Type.OBJECT,
      properties: {
        equity: { type: Type.NUMBER },
        bonds: { type: Type.NUMBER },
        commodities: { type: Type.NUMBER },
        cash: { type: Type.NUMBER }
      },
      required: ['equity', 'bonds', 'commodities', 'cash']
    }
  },
  required: ['regime', 'trend', 'confidence', 'reasoning', 'suggestedAllocation']
};

export const classifyMarketState = async (marketNotes: string, language: string): Promise<MarketStateAnalysis> => {
  try {
    const response = await ai.models.generateContent({
      model: analysisModel,
      contents: `Analyze the following market notes/news and classify the current market state for an investor targeting 20% annual returns.
      
      Notes: ${marketNotes}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: marketStateSchema,
        systemInstruction: `You are a senior macro-economist and quantitative strategist. Analyze the text to determine the market regime.${getLangInstruction(language)}`
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as MarketStateAnalysis;
  } catch (error) {
    console.error("Market classification failed:", error);
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

// --- Holistic Advice ---

const adviceSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    marketContext: { type: Type.STRING },
    actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ['BUY', 'SELL', 'HOLD', 'REBALANCE'] },
          asset: { type: Type.STRING },
          quantity: { type: Type.STRING },
          reason: { type: Type.STRING },
          urgency: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] }
        },
        required: ['action', 'asset', 'quantity', 'reason', 'urgency']
      }
    },
    projectedImpact: { type: Type.STRING }
  },
  required: ['summary', 'marketContext', 'actions', 'projectedImpact']
};

export const generateHolisticAdvice = async (
  portfolio: PortfolioItem[],
  watchlist: WatchlistItem[],
  marketNotes: string,
  language: string
): Promise<HolisticAdvice> => {
  try {
    const response = await ai.models.generateContent({
      model: analysisModel,
      contents: `Generate a concrete investment plan.
      User Goal: 20% Annualized Return.
      
      Current Portfolio: ${JSON.stringify(portfolio.map(p => ({ symbol: p.symbol, val: p.marketValue, pnl: p.pnlPercent })))}
      
      Watchlist (Potential Targets): ${JSON.stringify(watchlist.map(w => ({ symbol: w.symbol, score: w.score, status: w.status })))}
      
      Market Info: ${marketNotes || "General mixed market conditions"}
      
      Task: Recommend specific Buy/Sell/Rebalance actions to optimize the portfolio for the target return while managing risk. Look for underperformers to cut and high-score watchlist items to add.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: adviceSchema,
        systemInstruction: `You are a Senior Portfolio Manager combining macro analysis, portfolio construction, and trend trading strategies.${getLangInstruction(language)}`
      }
    });
    
    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Holistic advice failed", error);
    throw error;
  }
};
