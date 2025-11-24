
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { translations } from '../translations';
import { PortfolioItem, WatchlistItem, AssetClass, HolisticAdvice, MarketStateAnalysis } from '../types';
import { INITIAL_PORTFOLIO, INITIAL_WATCHLIST } from '../constants';
import { getBatchRealtimePrices, getRealtimePrice } from '../services/geminiService';

// --- Language Context ---
type Language = 'en' | 'zh';

export interface ImportResult {
  success: boolean;
  message: string;
  stats?: {
    portfolio: number;
    watchlist: number;
    history: number;
    marketHistory: number;
  };
}

interface BackupStats {
  portfolioCount: number;
  watchlistCount: number;
  historyCount: number;
  marketHistoryCount: number;
  portfolioBackupCount: number;
  watchlistBackupCount: number;
  historyBackupCount: number;
  marketHistoryBackupCount: number;
}

export interface ValueHistoryItem {
    date: string;
    value: number;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en']) => string;
  portfolio: PortfolioItem[];
  addPortfolioItem: (item: PortfolioItem) => void;
  removePortfolioItem: (id: string) => void;
  refreshPortfolioPrices: () => Promise<void>;
  isRefreshing: boolean;
  lastUpdated: number;
  watchlist: WatchlistItem[];
  updateWatchlistItem: (id: string, updates: Partial<WatchlistItem>) => void;
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (id: string) => void;
  reorderWatchlist: (newOrder: WatchlistItem[]) => void;
  refreshWatchlistPrices: () => Promise<void>;
  totalValue: number;
  totalPnL: number;
  marketRegimeContext: string;
  setMarketRegimeContext: (ctx: string) => void;
  adviceHistory: HolisticAdvice[];
  addAdviceToHistory: (advice: HolisticAdvice) => void;
  executeAdviceAction: (adviceId: string, actionId: string) => Promise<boolean>;
  
  marketHistory: MarketStateAnalysis[]; // New Market History State
  addMarketAnalysis: (analysis: MarketStateAnalysis) => void;

  valueHistory: ValueHistoryItem[]; // Portfolio Value History

  exportData: () => void;
  importData: (jsonString: string) => ImportResult;
  resetData: () => void;
  attemptRecovery: () => boolean; 
  getBackupStats: () => BackupStats; 
  forceSaveData: () => void; 
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Storage Keys
const STORAGE_KEYS = {
  LANGUAGE: 'alphavault_language',
  PORTFOLIO: 'alphavault_portfolio',
  WATCHLIST: 'alphavault_watchlist',
  ADVICE_HISTORY: 'alphavault_advice_history',
  MARKET_HISTORY: 'alphavault_market_history',
  VALUE_HISTORY: 'alphavault_value_history'
};

// Backup Keys
const BACKUP_KEYS = {
  PORTFOLIO: 'alphavault_portfolio_auto_backup',
  WATCHLIST: 'alphavault_watchlist_auto_backup',
  ADVICE_HISTORY: 'alphavault_advice_history_auto_backup',
  MARKET_HISTORY: 'alphavault_market_history_auto_backup'
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- 1. SAFETY FIRST: Auto-Backup on Mount (SMART VERSION) ---
  useEffect(() => {
    try {
      const p = localStorage.getItem(STORAGE_KEYS.PORTFOLIO);
      if (p && p.length > 200) { 
        localStorage.setItem(BACKUP_KEYS.PORTFOLIO, p);
      }

      const w = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
      if (w && w.length > 200) {
        localStorage.setItem(BACKUP_KEYS.WATCHLIST, w);
      }

      const h = localStorage.getItem(STORAGE_KEYS.ADVICE_HISTORY);
      if (h && h.length > 50) {
        localStorage.setItem(BACKUP_KEYS.ADVICE_HISTORY, h);
      }

      const m = localStorage.getItem(STORAGE_KEYS.MARKET_HISTORY);
      if (m && m.length > 50) {
        localStorage.setItem(BACKUP_KEYS.MARKET_HISTORY, m);
      }
      
      console.log("AlphaVault: Smart Auto-backup check completed.");
    } catch (e) {
      console.warn("AlphaVault: Auto-backup failed", e);
    }
  }, []);

  // --- 2. Initialize State ---
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
      return (saved as Language) || 'zh';
    } catch {
      return 'zh';
    }
  }); 

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PORTFOLIO);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : INITIAL_PORTFOLIO;
    } catch {
      return INITIAL_PORTFOLIO;
    }
  });

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : INITIAL_WATCHLIST;
    } catch {
      return INITIAL_WATCHLIST;
    }
  });

  const [adviceHistory, setAdviceHistory] = useState<HolisticAdvice[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADVICE_HISTORY);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [marketHistory, setMarketHistory] = useState<MarketStateAnalysis[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MARKET_HISTORY);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [valueHistory, setValueHistory] = useState<ValueHistoryItem[]>(() => {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.VALUE_HISTORY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
  });

  // Initialize Market Context from the latest history if available
  const [marketRegimeContext, setMarketRegimeContext] = useState<string>(() => {
      try {
          const savedHist = localStorage.getItem(STORAGE_KEYS.MARKET_HISTORY);
          const parsed = savedHist ? JSON.parse(savedHist) : [];
          return Array.isArray(parsed) && parsed.length > 0 ? parsed[0].regime : '';
      } catch {
          return '';
      }
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  // Refs needed for background tasks
  const portfolioRef = useRef(portfolio);
  const watchlistRef = useRef(watchlist);
  const isRefreshingRef = useRef(isRefreshing);

  // --- 3. Persistence with WRITE PROTECTION ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
  }, [language]);

  useEffect(() => {
    if (portfolio === INITIAL_PORTFOLIO) {
      const existing = localStorage.getItem(STORAGE_KEYS.PORTFOLIO);
      if (existing && existing.length > 200) {
        return;
      }
    }
    localStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(portfolio));
    portfolioRef.current = portfolio;
  }, [portfolio]);

  useEffect(() => {
    if (watchlist === INITIAL_WATCHLIST) {
      const existing = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
      if (existing && existing.length > 200) {
        return;
      }
    }
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));
    watchlistRef.current = watchlist;
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ADVICE_HISTORY, JSON.stringify(adviceHistory));
  }, [adviceHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MARKET_HISTORY, JSON.stringify(marketHistory));
  }, [marketHistory]);

  useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.VALUE_HISTORY, JSON.stringify(valueHistory));
  }, [valueHistory]);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  // --- DATA MIGRATION & SELF HEALING ---
  useEffect(() => {
    setPortfolio(currentPortfolio => {
      let hasChanges = false;
      const healed = currentPortfolio.map(item => {
        if (item.assetClass === AssetClass.CASH && item.quantity === 1 && item.marketValue > 1000) {
          hasChanges = true;
          return { ...item, quantity: item.marketValue, avgPrice: 1, currentPrice: 1, pnl: 0, pnlPercent: 0 };
        }
        if (item.assetClass === AssetClass.CASH && item.currentPrice !== 1) {
          hasChanges = true;
          return { ...item, currentPrice: 1, marketValue: item.quantity * 1, pnl: 0, pnlPercent: 0 };
        }
        return item;
      });
      return hasChanges ? healed : currentPortfolio;
    });
  }, []);

  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || key;
  };

  // --- Actions ---

  const updateWatchlistItem = (id: string, updates: Partial<WatchlistItem>) => {
    setWatchlist(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const addToWatchlist = (item: WatchlistItem) => {
    setWatchlist(prev => [...prev, item]);
  };

  const removeFromWatchlist = (id: string) => {
    setWatchlist(prev => prev.filter(item => item.id !== id));
  };

  const reorderWatchlist = (newOrder: WatchlistItem[]) => {
    setWatchlist(newOrder);
  };

  const addPortfolioItem = (item: PortfolioItem) => {
    setPortfolio(prev => [...prev, item]);
  };

  const removePortfolioItem = (id: string) => {
    setPortfolio(prev => prev.filter(item => item.id !== id));
  };

  const addAdviceToHistory = (advice: HolisticAdvice) => {
    setAdviceHistory(prev => [advice, ...prev].slice(0, 10)); // Keep last 10
  };

  const addMarketAnalysis = (analysis: MarketStateAnalysis) => {
    // Keep last 30 days history
    setMarketHistory(prev => [analysis, ...prev].slice(0, 30));
    setMarketRegimeContext(analysis.regime); // Update current context
  };

  // --- Data Management ---
  const forceSaveData = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(portfolio));
      localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));
      localStorage.setItem(STORAGE_KEYS.ADVICE_HISTORY, JSON.stringify(adviceHistory));
      localStorage.setItem(STORAGE_KEYS.MARKET_HISTORY, JSON.stringify(marketHistory));
      localStorage.setItem(STORAGE_KEYS.VALUE_HISTORY, JSON.stringify(valueHistory));
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
      console.log("AlphaVault: Force save complete.");
    } catch (e) {
      console.error("Force save failed", e);
    }
  };

  const exportData = () => {
    const data = {
      portfolio,
      watchlist,
      adviceHistory,
      marketHistory,
      valueHistory,
      language,
      version: '1.4',
      timestamp: Date.now()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alphavault_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = (jsonString: string): ImportResult => {
    try {
      const data = JSON.parse(jsonString);
      
      // Validation Check
      if (!data || typeof data !== 'object') {
          return { success: false, message: 'Invalid JSON format' };
      }
      // Check for at least one known key to verify it is an AlphaVault file
      if (!data.portfolio && !data.watchlist && !data.adviceHistory && !data.marketHistory) {
          return { success: false, message: 'File is valid JSON but missing AlphaVault data structure.' };
      }

      console.log("AlphaVault: Importing data...", data);
      
      const stats = {
          portfolio: 0,
          watchlist: 0,
          history: 0,
          marketHistory: 0
      };

      if (Array.isArray(data.portfolio)) {
        portfolioRef.current = data.portfolio; 
        localStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(data.portfolio));
        setPortfolio(data.portfolio);
        stats.portfolio = data.portfolio.length;
      }
      
      if (Array.isArray(data.watchlist)) {
        watchlistRef.current = data.watchlist;
        localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(data.watchlist)); 
        setWatchlist(data.watchlist);
        stats.watchlist = data.watchlist.length;
      }

      if (Array.isArray(data.adviceHistory)) {
        localStorage.setItem(STORAGE_KEYS.ADVICE_HISTORY, JSON.stringify(data.adviceHistory));
        setAdviceHistory(data.adviceHistory);
        stats.history = data.adviceHistory.length;
      }

      if (Array.isArray(data.marketHistory)) {
        localStorage.setItem(STORAGE_KEYS.MARKET_HISTORY, JSON.stringify(data.marketHistory));
        setMarketHistory(data.marketHistory);
        // Restore context as well
        if (data.marketHistory.length > 0) {
            setMarketRegimeContext(data.marketHistory[0].regime);
        }
        stats.marketHistory = data.marketHistory.length;
      }

      if (Array.isArray(data.valueHistory)) {
        localStorage.setItem(STORAGE_KEYS.VALUE_HISTORY, JSON.stringify(data.valueHistory));
        setValueHistory(data.valueHistory);
      }

      if (data.language) {
        localStorage.setItem(STORAGE_KEYS.LANGUAGE, data.language);
        setLanguage(data.language);
      }
      
      return { 
          success: true, 
          message: 'Data imported successfully.', 
          stats 
      };

    } catch (e) {
      console.error("Import failed", e);
      return { success: false, message: `Parse Error: ${(e as Error).message}` };
    }
  };

  const resetData = () => {
      try {
         const p = localStorage.getItem(STORAGE_KEYS.PORTFOLIO);
         if (p) localStorage.setItem(BACKUP_KEYS.PORTFOLIO, p);
      } catch {}

      setPortfolio(INITIAL_PORTFOLIO);
      setWatchlist(INITIAL_WATCHLIST);
      setAdviceHistory([]);
      setMarketHistory([]);
      setValueHistory([]);
      
      localStorage.removeItem(STORAGE_KEYS.PORTFOLIO);
      localStorage.removeItem(STORAGE_KEYS.WATCHLIST);
      localStorage.removeItem(STORAGE_KEYS.ADVICE_HISTORY);
      localStorage.removeItem(STORAGE_KEYS.MARKET_HISTORY);
      localStorage.removeItem(STORAGE_KEYS.VALUE_HISTORY);
  };

  const getBackupStats = useCallback((): BackupStats => {
    const parseCount = (key: string) => {
      try {
        const item = localStorage.getItem(key);
        const parsed = item ? JSON.parse(item) : [];
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch { return 0; }
    };

    return {
      portfolioCount: portfolio.length,
      watchlistCount: watchlist.length,
      historyCount: adviceHistory.length,
      marketHistoryCount: marketHistory.length,
      portfolioBackupCount: parseCount(BACKUP_KEYS.PORTFOLIO),
      watchlistBackupCount: parseCount(BACKUP_KEYS.WATCHLIST),
      historyBackupCount: parseCount(BACKUP_KEYS.ADVICE_HISTORY),
      marketHistoryBackupCount: parseCount(BACKUP_KEYS.MARKET_HISTORY)
    };
  }, [portfolio, watchlist, adviceHistory, marketHistory]);

  const attemptRecovery = (): boolean => {
    let recovered = false;
    try {
      const pBackup = localStorage.getItem(BACKUP_KEYS.PORTFOLIO);
      const wBackup = localStorage.getItem(BACKUP_KEYS.WATCHLIST);
      const hBackup = localStorage.getItem(BACKUP_KEYS.ADVICE_HISTORY);
      const mBackup = localStorage.getItem(BACKUP_KEYS.MARKET_HISTORY);
      
      if (pBackup) {
        const pParsed = JSON.parse(pBackup);
        if (Array.isArray(pParsed) && pParsed.length > 0) {
            setPortfolio(pParsed);
            portfolioRef.current = pParsed; // Sync Ref
            localStorage.setItem(STORAGE_KEYS.PORTFOLIO, pBackup);
            recovered = true;
        }
      }
      if (wBackup) {
        const wParsed = JSON.parse(wBackup);
         if (Array.isArray(wParsed) && wParsed.length > 0) {
            setWatchlist(wParsed);
            watchlistRef.current = wParsed; // Sync Ref
            localStorage.setItem(STORAGE_KEYS.WATCHLIST, wBackup);
            recovered = true;
         }
      }
      if (hBackup) {
        const hParsed = JSON.parse(hBackup);
        if (Array.isArray(hParsed)) {
           setAdviceHistory(hParsed);
           localStorage.setItem(STORAGE_KEYS.ADVICE_HISTORY, hBackup);
        }
      }
      if (mBackup) {
        const mParsed = JSON.parse(mBackup);
        if (Array.isArray(mParsed)) {
           setMarketHistory(mParsed);
           localStorage.setItem(STORAGE_KEYS.MARKET_HISTORY, mBackup);
           if(mParsed.length > 0) setMarketRegimeContext(mParsed[0].regime);
           recovered = true;
        }
      }
      if (recovered) console.log("AlphaVault: Data recovered from auto-backup.");
    } catch (e) {
      console.error("Recovery failed", e);
    }
    return recovered;
  };

  const executeAdviceAction = async (adviceId: string, actionId: string): Promise<boolean> => {
    const adviceIndex = adviceHistory.findIndex(a => a.id === adviceId);
    if (adviceIndex === -1) return false;
    
    const action = adviceHistory[adviceIndex].actions.find(a => a.id === actionId);
    if (!action || action.status !== 'Pending') return false;

    // 1. Get Live Price
    const priceData = await getRealtimePrice(action.ticker);
    const executionPrice = priceData.price || 1; 
    
    if (executionPrice <= 0) {
        alert("Failed to fetch price for execution. Please try again.");
        return false;
    }

    // 2. Execute Logic
    setPortfolio(currentPortfolio => {
        const newPortfolio = [...currentPortfolio];
        let cash = newPortfolio.find(p => p.assetClass === AssetClass.CASH);
        
        if (!cash) {
            cash = {
                id: 'cash_generated',
                symbol: 'CNY',
                name: 'Cash',
                assetClass: AssetClass.CASH,
                quantity: 0,
                avgPrice: 1,
                currentPrice: 1,
                marketValue: 0,
                pnl: 0,
                pnlPercent: 0,
                lastUpdated: Date.now()
            };
            newPortfolio.push(cash);
        }

        if (action.action === 'BUY') {
            // Default to estimated value if available, or just a small amount to prevent crash
            const cost = action.estimatedValue || 10000;
            
            if (cash.quantity < cost) {
                alert("Insufficient Cash!");
                return currentPortfolio;
            }
            cash.quantity -= cost;
            cash.marketValue = cash.quantity;

            const existingAsset = newPortfolio.find(p => p.symbol === action.ticker);
            const quantityToBuy = Math.floor(cost / executionPrice);
            
            if (existingAsset) {
                const totalCost = (existingAsset.quantity * existingAsset.avgPrice) + (quantityToBuy * executionPrice);
                const totalQty = existingAsset.quantity + quantityToBuy;
                existingAsset.quantity = totalQty;
                existingAsset.avgPrice = totalCost / totalQty;
                existingAsset.currentPrice = executionPrice;
                existingAsset.marketValue = totalQty * executionPrice;
                
                // Update Risk Params
                if (action.stopLoss) existingAsset.stopLoss = action.stopLoss;
                if (action.targetPrice) existingAsset.targetPrice = action.targetPrice;
                if (action.strategyTag) existingAsset.strategyTag = action.strategyTag;

            } else {
                newPortfolio.push({
                    id: Date.now().toString(),
                    symbol: action.ticker,
                    name: action.asset,
                    assetClass: AssetClass.HK_STOCKS, 
                    quantity: quantityToBuy,
                    avgPrice: executionPrice,
                    currentPrice: executionPrice,
                    marketValue: quantityToBuy * executionPrice,
                    pnl: 0,
                    pnlPercent: 0,
                    lastUpdated: Date.now(),
                    // Risk Params
                    stopLoss: action.stopLoss,
                    targetPrice: action.targetPrice,
                    strategyTag: action.strategyTag
                });
            }

        } else if (action.action === 'SELL') {
             const existingAsset = newPortfolio.find(p => p.symbol === action.ticker);
             if (!existingAsset) {
                 alert("Asset not found in portfolio!");
                 return currentPortfolio;
             }
             
             const sellValue = action.estimatedValue || (existingAsset.marketValue * 0.5); // Default to half if undefined
             const quantityToSell = Math.floor(sellValue / executionPrice);
             
             if (quantityToSell >= existingAsset.quantity) {
                 const index = newPortfolio.indexOf(existingAsset);
                 newPortfolio.splice(index, 1);
                 cash.quantity += (existingAsset.quantity * executionPrice);
             } else {
                 existingAsset.quantity -= quantityToSell;
                 existingAsset.marketValue = existingAsset.quantity * executionPrice;
                 cash.quantity += (quantityToSell * executionPrice);
             }
             cash.marketValue = cash.quantity;
        }

        return newPortfolio;
    });

    const newHistory = [...adviceHistory];
    const targetAction = newHistory[adviceIndex].actions.find(a => a.id === actionId);
    if (targetAction) {
        targetAction.status = 'Executed';
        setAdviceHistory(newHistory);
    }
    return true;
  };

  const refreshPortfolioPrices = async () => {
    if (isRefreshingRef.current) return;
    const currentItems = portfolioRef.current;
    const itemsToUpdate = currentItems.filter(p => p.assetClass !== AssetClass.CASH);
    if (itemsToUpdate.length === 0) return;
    setIsRefreshing(true);
    
    let updatedPortfolio = [...currentItems];
    
    try {
        const symbols = itemsToUpdate.map(p => p.symbol);
        const updates = await getBatchRealtimePrices(symbols);
        const updateMap = new Map(updates.map(u => [u.symbol.toUpperCase(), u]));
        
        updatedPortfolio = updatedPortfolio.map(p => {
            if (p.assetClass === AssetClass.CASH) return { ...p, currentPrice: 1, marketValue: p.quantity }; 
            const symKey = p.symbol.toUpperCase();
            const update = updateMap.get(symKey);
            
            if (update && update.price !== undefined) {
                 const price = update.price > 0 ? update.price : p.currentPrice;
                 return { ...p, currentPrice: price, marketValue: p.quantity * price, pnl: (price - p.avgPrice) * p.quantity, pnlPercent: ((price - p.avgPrice) / p.avgPrice) * 100, lastUpdated: Date.now() };
            }
            return p;
        });
        
        setPortfolio(updatedPortfolio);

        // --- RECORD VALUE HISTORY (Once per day) ---
        const totalVal = updatedPortfolio.reduce((acc, item) => acc + item.marketValue, 0);
        const todayStr = new Date().toISOString().split('T')[0];
        
        setValueHistory(prev => {
            const lastEntry = prev[prev.length - 1];
            if (lastEntry && lastEntry.date === todayStr) {
                // Update today's entry
                return [...prev.slice(0, -1), { date: todayStr, value: totalVal }];
            } else {
                // Add new day
                return [...prev, { date: todayStr, value: totalVal }].slice(-30); // Keep last 30 points
            }
        });

    } catch (e) { console.error("Refresh failed", e); }
    setLastUpdated(Date.now());
    setIsRefreshing(false);
  };

  const refreshWatchlistPrices = async () => {
    const currentWatchlist = watchlistRef.current;
    if (currentWatchlist.length === 0) return;
    try {
      const symbols = currentWatchlist.map(w => w.symbol);
      const updates = await getBatchRealtimePrices(symbols);
      const updateMap = new Map(updates.map(u => [u.symbol.toUpperCase(), u]));
      setWatchlist(prev => prev.map(item => {
        const symKey = item.symbol.toUpperCase();
        const update = updateMap.get(symKey);
        if (update && update.price && update.price > 0) return { ...item, currentPrice: update.price, lastUpdated: Date.now() };
        return item;
      }));
    } catch (e) { console.error("Watchlist refresh failed", e); }
  };

  useEffect(() => {
    const initTimer = setTimeout(() => { refreshPortfolioPrices(); }, 1000);
    const interval = setInterval(() => { refreshPortfolioPrices(); }, 120000);
    return () => { clearTimeout(initTimer); clearInterval(interval); };
  }, []);

  const totalValue = portfolio.reduce((acc, item) => acc + item.marketValue, 0);
  const totalPnL = portfolio.reduce((acc, item) => acc + item.pnl, 0);

  return (
    <AppContext.Provider value={{ 
      language, setLanguage, t, portfolio, addPortfolioItem, removePortfolioItem, refreshPortfolioPrices, isRefreshing, lastUpdated, watchlist, updateWatchlistItem, addToWatchlist, removeFromWatchlist, reorderWatchlist, refreshWatchlistPrices, totalValue, totalPnL, marketRegimeContext, setMarketRegimeContext, adviceHistory, addAdviceToHistory, executeAdviceAction, exportData, importData, resetData, attemptRecovery, getBackupStats, forceSaveData,
      marketHistory, addMarketAnalysis, valueHistory
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
