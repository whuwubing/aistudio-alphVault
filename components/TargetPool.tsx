import React, { useState } from 'react';
import { AssetClass, WatchlistItem } from '../types';
import { useApp } from '../contexts/AppContext';
import { Search, Plus, Trash2, RefreshCw, BarChart2, TrendingUp, Clock, Globe, Database, ArrowRight, Loader2, Info } from 'lucide-react';
import { analyzeTargetAsset, searchAssetDetails } from '../services/geminiService';

const TargetPool: React.FC = () => {
  const { t, watchlist, updateWatchlistItem, addToWatchlist, removeFromWatchlist, language, marketRegimeContext } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundAsset, setFoundAsset] = useState<Partial<WatchlistItem> | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setFoundAsset(null);
    try {
      // Use Gemini with Google Search to get real data
      const result = await searchAssetDetails(searchQuery, language);
      setFoundAsset({
        ...result,
        symbol: searchQuery.toUpperCase(),
        status: 'Watch',
        score: 50,
        lastAnalysis: t('newlyAdded'),
        lastUpdated: Date.now()
      });
    } catch (e) {
      console.error(e);
      alert('Could not find asset details. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const confirmAdd = () => {
    if (foundAsset) {
      const newItem: WatchlistItem = {
        id: Date.now().toString(),
        symbol: foundAsset.symbol || searchQuery,
        name: foundAsset.name || 'Unknown',
        assetClass: (foundAsset.assetClass as AssetClass) || AssetClass.HK_STOCKS,
        currentPrice: foundAsset.currentPrice || 0,
        currency: foundAsset.currency || 'USD',
        sector: foundAsset.sector || 'N/A',
        market: foundAsset.market || 'N/A',
        score: 50,
        status: 'Watch',
        lastAnalysis: t('newlyAdded'),
        lastUpdated: Date.now()
      };
      addToWatchlist(newItem);
      resetAddForm();
    }
  };

  const resetAddForm = () => {
    setIsAdding(false);
    setSearchQuery('');
    setFoundAsset(null);
  };

  const handleAnalyze = async (item: WatchlistItem) => {
    setAnalyzingId(item.id);
    try {
      const result = await analyzeTargetAsset(item, marketRegimeContext || "Neutral market", language);
      updateWatchlistItem(item.id, {
        ...result,
        lastUpdated: Date.now()
      });
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzingId(null);
    }
  };

  const getTimeAgo = (timestamp: number) => {
    if (timestamp === 0) return 'Never';
    const mins = Math.floor((Date.now() - timestamp) / 60000);
    if (mins < 60) return `${mins}m ${t('ago')}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ${t('ago')}`;
    return `${Math.floor(hours / 24)}d ${t('ago')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
             <BarChart2 className="mr-3 text-purple-400" /> {t('poolTitle')}
          </h2>
          <p className="text-slate-400 mt-1 max-w-2xl text-sm">{t('poolDesc')}</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-lg shadow-purple-900/20"
          >
            <Plus size={16} className="mr-2" /> {t('addTarget')}
          </button>
        )}
      </div>

      {/* Smart Search Wizard */}
      {isAdding && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-slide-up shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
             <Globe size={100} />
          </div>
          
          <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <Search className="mr-2 text-purple-400" size={20} />
            {t('searchRealAsset')}
          </h3>

          <div className="flex gap-2 mb-4">
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t('searchPlaceholder')}
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            />
            <button 
              onClick={handleSearch} 
              disabled={isSearching || !searchQuery}
              className="bg-blue-600 hover:bg-blue-700 px-6 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSearching ? <Loader2 className="animate-spin" /> : t('search')}
            </button>
            <button 
              onClick={resetAddForm} 
              className="bg-slate-700 hover:bg-slate-600 px-4 rounded-lg text-white font-medium"
            >
              {t('cancel')}
            </button>
          </div>

          {/* Search Result Preview */}
          {foundAsset && (
            <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-600 flex flex-col sm:flex-row justify-between items-center gap-4 animate-fade-in">
              <div className="flex items-center gap-4">
                <div className="bg-slate-800 p-3 rounded-full border border-slate-700">
                  <Database className="text-purple-400" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg">{foundAsset.name}</h4>
                  <div className="flex gap-3 text-sm text-slate-400">
                    <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-xs">{foundAsset.symbol}</span>
                    <span className="flex items-center"><Globe size={12} className="mr-1"/> {foundAsset.market}</span>
                    <span>{foundAsset.sector}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right flex flex-col items-end gap-2">
                <div className="text-2xl font-mono font-bold text-emerald-400">
                  {foundAsset.currency} {foundAsset.currentPrice?.toLocaleString()}
                </div>
                <button 
                  onClick={confirmAdd}
                  className="flex items-center bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-900/20"
                >
                  {t('confirmAdd')} <ArrowRight size={16} className="ml-2" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Watchlist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {watchlist.map(item => (
          <div key={item.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5 hover:border-slate-500 transition-all duration-300 shadow-md group relative">
            
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-xl text-white">{item.symbol}</span>
                  {item.market && <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 rounded">{item.market}</span>}
                </div>
                <p className="text-xs text-slate-400 font-medium truncate max-w-[180px]">{item.name}</p>
                {item.sector && <p className="text-[10px] text-slate-500 mt-0.5">{item.sector}</p>}
              </div>
              <div className="text-right">
                <div className="text-xl font-mono text-slate-200 font-bold">
                  <span className="text-xs text-slate-500 mr-1">{item.currency || '$'}</span>
                  {item.currentPrice.toLocaleString()}
                </div>
                <div className={`text-xs font-bold inline-block px-2 py-0.5 rounded mt-1 ${
                  item.status === 'Buy' ? 'bg-emerald-900/30 text-emerald-400' : 
                  item.status === 'Sell' ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'
                }`}>
                  {item.status.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500 font-semibold uppercase">{t('aiScore')}</div>
                <div className="flex items-center">
                  <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden mr-2">
                    <div 
                      className={`h-full rounded-full ${item.score > 70 ? 'bg-emerald-500' : item.score < 40 ? 'bg-red-500' : 'bg-yellow-500'}`} 
                      style={{ width: `${item.score}%` }}
                    ></div>
                  </div>
                  <span className={`text-xs font-mono font-bold ${item.score > 70 ? 'text-emerald-400' : item.score < 40 ? 'text-red-400' : 'text-yellow-400'}`}>
                    {item.score}
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 min-h-[60px] relative">
                 <Info size={12} className="absolute top-2 right-2 text-slate-600" />
                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed pr-2">
                  {item.lastAnalysis}
                </p>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                <div className="flex items-center text-[10px] text-slate-500">
                  <Clock size={12} className="mr-1" />
                  {getTimeAgo(item.lastUpdated)}
                </div>
                <div className="flex gap-2">
                   <button 
                    onClick={() => removeFromWatchlist(item.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                    title={t('remove')}
                  >
                    <Trash2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleAnalyze(item)}
                    disabled={analyzingId === item.id}
                    className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white font-medium transition-colors disabled:opacity-50 disabled:bg-slate-600"
                  >
                    <RefreshCw size={12} className={`mr-1.5 ${analyzingId === item.id ? 'animate-spin' : ''}`} />
                    {analyzingId === item.id ? t('analyzingBtn') : t('analyze')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TargetPool;