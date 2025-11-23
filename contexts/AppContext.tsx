import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { translations } from '../translations';
import { PortfolioItem, WatchlistItem } from '../types';
import { INITIAL_PORTFOLIO, INITIAL_WATCHLIST } from '../constants';
import { getBatchRealtimePrices } from '../services/geminiService';

// --- Language Context ---
type Language = 'en' | 'zh';

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
  totalValue: number;
  totalPnL: number;
  marketRegimeContext: string; // Shared state for market context
  setMarketRegimeContext: (ctx: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Storage Keys
const STORAGE_KEYS = {
  LANGUAGE: 'alphavault_language',
  PORTFOLIO: 'alphavault_portfolio',
  WATCHLIST: 'alphavault_watchlist'
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Initialize State from LocalStorage (Lazy Initialization)
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    return (saved as Language) || 'zh';
  }); 

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PORTFOLIO);
    return saved ? JSON.parse(saved) : INITIAL_PORTFOLIO;
  });

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
    return saved ? JSON.parse(saved) : INITIAL_WATCHLIST;
  });

  const [marketRegimeContext, setMarketRegimeContext] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  // Refs to access latest state inside asynchronous intervals/loops
  const portfolioRef = useRef(portfolio);
  const isRefreshingRef = useRef(isRefreshing);

  // 2. Persistence Effects (Save on Change)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(portfolio));
    portfolioRef.current = portfolio; // Update ref
  }, [portfolio]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  // Translation helper
  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || key;
  };

  const updateWatchlistItem = (id: string, updates: Partial<WatchlistItem>) => {
    setWatchlist(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const addToWatchlist = (item: WatchlistItem) => {
    setWatchlist(prev => [...prev, item]);
  };

  const removeFromWatchlist = (id: string) => {
    setWatchlist(prev => prev.filter(item => item.id !== id));
  };

  const addPortfolioItem = (item: PortfolioItem) => {
    setPortfolio(prev => [...prev, item]);
    // Do not auto-refresh immediately to avoid hitting limits if user adds quickly
  };

  const removePortfolioItem = (id: string) => {
    setPortfolio(prev => prev.filter(item => item.id !== id));
  };

  const refreshPortfolioPrices = async () => {
    // Prevent overlapping refresh calls
    if (isRefreshingRef.current) return;
    
    const currentItems = portfolioRef.current;
    if (currentItems.length === 0) return;
    
    setIsRefreshing(true);
    
    try {
        const symbols = currentItems.map(p => p.symbol);
        // Batch request all symbols at once
        const updates = await getBatchRealtimePrices(symbols);
        
        // Create a map for easy lookup, key normalized to Uppercase
        const updateMap = new Map(updates.map(u => [u.symbol.toUpperCase(), u]));

        setPortfolio(prev => prev.map(p => {
            const symKey = p.symbol.toUpperCase();
            // Try to find update by exact symbol.
            const update = updateMap.get(symKey);
            
            if (update && update.price && update.price > 0) {
                 return {
                    ...p,
                    currentPrice: update.price,
                    marketValue: p.quantity * update.price,
                    pnl: (update.price - p.avgPrice) * p.quantity,
                    pnlPercent: ((update.price - p.avgPrice) / p.avgPrice) * 100,
                    lastUpdated: Date.now()
                };
            }
            return p;
        }));
    } catch (e) {
        console.error("Refresh failed", e);
    }

    setLastUpdated(Date.now());
    setIsRefreshing(false);
  };

  // --- Periodic Refresh ---
  useEffect(() => {
    // Initial fetch after a short delay to let UI settle
    const initTimer = setTimeout(() => {
        refreshPortfolioPrices();
    }, 1000);

    // Set interval for periodic updates (every 2 minutes to be safe with limits)
    const interval = setInterval(() => {
      refreshPortfolioPrices();
    }, 120000);

    return () => {
        clearTimeout(initTimer);
        clearInterval(interval);
    };
  }, []); // Empty dependency array ensures this runs once on mount

  const totalValue = portfolio.reduce((acc, item) => acc + item.marketValue, 0);
  const totalPnL = portfolio.reduce((acc, item) => acc + item.pnl, 0);

  return (
    <AppContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      portfolio, 
      addPortfolioItem,
      removePortfolioItem,
      refreshPortfolioPrices,
      isRefreshing,
      lastUpdated,
      watchlist,
      updateWatchlistItem,
      addToWatchlist,
      removeFromWatchlist,
      totalValue, 
      totalPnL,
      marketRegimeContext,
      setMarketRegimeContext
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};