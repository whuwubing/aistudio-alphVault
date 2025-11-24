
import React, { useState, useEffect, useRef } from 'react';
import { AssetClass, WatchlistItem } from '../types';
import { useApp } from '../contexts/AppContext';
import { Search, Plus, Trash2, RefreshCw, BarChart2, Clock, Globe, Database, ArrowRight, Loader2, Info, LayoutGrid, List, ArrowDownUp, GripVertical } from 'lucide-react';
import { analyzeTargetAsset, searchAssetDetails } from '../services/geminiService';

type ViewMode = 'grid' | 'list';
type SortOption = 'score' | 'price' | 'name' | 'status' | 'custom';

const STORAGE_KEYS = {
  VIEW_MODE: 'alphavault_pool_view',
  SORT_BY: 'alphavault_pool_sort',
  SORT_DESC: 'alphavault_pool_sort_desc'
};

const TargetPool: React.FC = () => {
  const { t, watchlist, updateWatchlistItem, addToWatchlist, removeFromWatchlist, reorderWatchlist, language, marketRegimeContext, refreshWatchlistPrices } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [foundAssets, setFoundAssets] = useState<Array<Partial<WatchlistItem>>>([]);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  // --- Drag and Drop Refs ---
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // --- Persistent UI State ---
  
  // View Mode Persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
      return (saved === 'list' || saved === 'grid') ? saved : 'grid';
    } catch {
      return 'grid';
    }
  });

  // Sort Option Persistence
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SORT_BY);
      const validOptions: SortOption[] = ['score', 'price', 'name', 'status', 'custom'];
      return validOptions.includes(saved as SortOption) ? (saved as SortOption) : 'score';
    } catch {
      return 'score';
    }
  });

  // Sort Direction Persistence
  const [sortDesc, setSortDesc] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SORT_DESC);
      // Default to true (Descending) if not set
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SORT_BY, sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SORT_DESC, String(sortDesc));
  }, [sortDesc]);

  // --- End Persistent UI State ---

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement | HTMLTableRowElement>, position: number) => {
    if (sortBy !== 'custom') return; // Only allow drag in Custom mode
    dragItem.current = position;
    // Add a visual effect to the element being dragged
    e.currentTarget.classList.add('opacity-50', 'scale-95');
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement | HTMLTableRowElement>, position: number) => {
    if (sortBy !== 'custom') return;
    dragOverItem.current = position;
    e.preventDefault();
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement | HTMLTableRowElement>) => {
    if (sortBy !== 'custom') return;
    e.currentTarget.classList.remove('opacity-50', 'scale-95');

    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const _watchlist = [...watchlist];
      const draggedItemContent = _watchlist[dragItem.current];
      
      // Remove item from old position
      _watchlist.splice(dragItem.current, 1);
      // Insert item at new position
      _watchlist.splice(dragOverItem.current, 0, draggedItemContent);
      
      reorderWatchlist(_watchlist);
    }
    
    dragItem.current = null;
    dragOverItem.current = null;
  };


  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setFoundAssets([]);
    
    try {
      // Split by comma or newline for batch adding
      const terms = searchQuery.split(/[,\n]+/).map(s => s.trim()).filter(s => s.length > 0);
      
      const newAssets: Array<Partial<WatchlistItem>> = [];
      
      // Process in parallel (limit to 5 to avoid browser choke)
      const promises = terms.slice(0, 5).map(async (term) => {
         try {
           const result = await searchAssetDetails(term, language);
           return {
             ...result,
             symbol: result.symbol || term.toUpperCase(),
             name: result.name || term,
             status: 'Watch' as const,
             score: 50,
             lastAnalysis: t('newlyAdded'),
             lastUpdated: Date.now()
           };
         } catch (e) {
           return null;
         }
      });

      const results = await Promise.all(promises);
      results.forEach(r => {
        if (r) newAssets.push(r);
      });
      
      if (newAssets.length === 0) {
        alert("No valid assets found.");
      } else {
        setFoundAssets(newAssets);
      }
      
    } catch (e) {
      console.error(e);
      alert('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshingPrices(true);
    await refreshWatchlistPrices();
    setIsRefreshingPrices(false);
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

  const confirmAdd = () => {
    if (foundAssets.length > 0) {
      let addedCount = 0;
      
      foundAssets.forEach(asset => {
        // Duplicate check
        const exists = watchlist.some(item => item.symbol === asset.symbol);
        if (exists) return;

        const newItem: WatchlistItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          symbol: asset.symbol || 'UNKNOWN',
          name: asset.name || 'Unknown',
          assetClass: (asset.assetClass as AssetClass) || AssetClass.HK_STOCKS,
          currentPrice: asset.currentPrice || 0,
          currency: asset.currency || 'USD',
          sector: asset.sector || 'N/A',
          market: asset.market || 'N/A',
          score: 50,
          status: 'Watch',
          lastAnalysis: t('analyzingBtn'),
          lastUpdated: Date.now()
        };
        
        addToWatchlist(newItem);
        addedCount++;
        // Auto trigger analysis
        handleAnalyze(newItem);
      });
      
      if (addedCount === 0) {
        alert("All selected assets are already in your watchlist.");
      } else {
        resetAddForm();
      }
    }
  };

  const resetAddForm = () => {
    setIsAdding(false);
    setSearchQuery('');
    setFoundAssets([]);
  };

  const getTimeAgo = (timestamp: number) => {
    if (timestamp === 0) return 'Never';
    const mins = Math.floor((Date.now() - timestamp) / 60000);
    if (mins < 60) return `${mins}m ${t('ago')}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ${t('ago')}`;
    return `${Math.floor(hours / 24)}d ${t('ago')}`;
  };

  // Sorting Logic
  const getSortedWatchlist = () => {
    // If Custom sort is selected, return list as is (user order)
    if (sortBy === 'custom') {
      return watchlist;
    }

    // Stable sort fallback
    return [...watchlist].sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];
      
      // Handle strings case-insensitive
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      // Handle nulls/undefined safely
      if (valA === undefined) valA = 0;
      if (valB === undefined) valB = 0;

      let comparison = 0;
      if (valA > valB) comparison = 1;
      else if (valA < valB) comparison = -1;

      return sortDesc ? comparison * -1 : comparison;
    });
  };

  const sortedWatchlist = getSortedWatchlist();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
             <BarChart2 className="mr-3 text-purple-400" /> {t('poolTitle')}
          </h2>
          <p className="text-slate-400 mt-1 max-w-2xl text-sm">{t('poolDesc')}</p>
        </div>
        {!isAdding && (
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
            {/* View Toggle */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-1 flex">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                title={t('viewGrid')}
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                title={t('viewList')}
              >
                <List size={16} />
              </button>
            </div>

            {/* Sort Control */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
              <span className="text-xs text-slate-500 mr-2">{t('sortBy')}:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-sm text-slate-200 outline-none border-none cursor-pointer"
              >
                <option value="score">{t('sortScore')}</option>
                <option value="price">{t('sortPrice')}</option>
                <option value="name">{t('sortName')}</option>
                <option value="status">{t('sortStatus')}</option>
                <option value="custom">{t('sortCustom')}</option>
              </select>
              <button 
                onClick={() => setSortDesc(!sortDesc)}
                disabled={sortBy === 'custom'}
                className={`ml-2 text-slate-400 hover:text-white p-1 ${sortBy === 'custom' ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                <ArrowDownUp size={14} className={sortDesc ? "" : "rotate-180 transition-transform"} />
              </button>
            </div>

             <button 
              onClick={handleManualRefresh}
              disabled={isRefreshingPrices}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm disabled:opacity-50"
              title={t('refreshWatchlist')}
            >
              <RefreshCw size={16} className={isRefreshingPrices ? 'animate-spin' : ''} /> 
            </button>
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-lg shadow-purple-900/20"
            >
              <Plus size={16} className="mr-2" /> {t('addTarget')}
            </button>
          </div>
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
          
          <p className="text-xs text-slate-500 mb-4">
            * Supports batch search. Separate with commas (e.g. "0700.HK, NVDA, BABA")
          </p>

          {/* Search Result Preview */}
          {foundAssets.length > 0 && (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              <div className="flex justify-between items-center mb-2">
                 <span className="text-sm text-slate-400">{foundAssets.length} assets found</span>
                 <button 
                  onClick={confirmAdd}
                  className="flex items-center bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-900/20"
                >
                  {t('confirmAdd')} ({foundAssets.length}) <ArrowRight size={16} className="ml-2" />
                </button>
              </div>

              {foundAssets.map((asset, idx) => (
                <div key={idx} className="bg-slate-900/80 rounded-lg p-3 border border-slate-600 flex justify-between items-center animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-800 p-2 rounded-full border border-slate-700 hidden sm:block">
                      <Database className="text-purple-400" size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-md">{asset.name}</h4>
                      <div className="flex gap-2 text-xs text-slate-400">
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{asset.symbol}</span>
                        <span className="flex items-center"><Globe size={10} className="mr-1"/> {asset.market}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-bold text-emerald-400">
                      {asset.currency} {asset.currentPrice?.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      {watchlist.length === 0 ? (
           <div className="col-span-full py-12 text-center bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
             <BarChart2 className="mx-auto text-slate-600 mb-4" size={48} />
             <p className="text-slate-400 text-lg font-medium">{t('poolDesc')}</p>
             <p className="text-slate-500 text-sm mt-2">{t('noHoldings')}</p>
             <button 
                onClick={() => setIsAdding(true)}
                className="mt-6 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 px-6 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                {t('addTarget')}
              </button>
           </div>
      ) : (
        <>
          {/* GRID VIEW */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sortedWatchlist.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`bg-slate-800 rounded-xl border border-slate-700 p-5 hover:border-slate-500 transition-all duration-300 shadow-md group relative
                    ${sortBy === 'custom' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  draggable={sortBy === 'custom'}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {sortBy === 'custom' && (
                    <div className="absolute top-2 right-2 text-slate-600 opacity-20 group-hover:opacity-100 transition-opacity">
                      <GripVertical size={16} />
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-lg text-white mb-1 truncate max-w-[180px]" title={item.name}>
                        {item.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                          {item.symbol}
                        </span>
                        {item.market && (
                          <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                            {item.market}
                          </span>
                        )}
                      </div>
                      {item.sector && <p className="text-[10px] text-slate-500 mt-1">{item.sector}</p>}
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
          )}

          {/* LIST VIEW */}
          {viewMode === 'list' && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                       {sortBy === 'custom' && <th className="p-4 w-10"></th>}
                       <th className="p-4 font-semibold">{t('assetName')}</th>
                       <th className="p-4 font-semibold">{t('price')}</th>
                       <th className="p-4 font-semibold">{t('status')}</th>
                       <th className="p-4 font-semibold">{t('aiScore')}</th>
                       <th className="p-4 font-semibold w-1/3">{t('lastAnalysis')}</th>
                       <th className="p-4 font-semibold text-right">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-700">
                    {sortedWatchlist.map((item, index) => (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-slate-700/30 transition-colors ${sortBy === 'custom' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                        draggable={sortBy === 'custom'}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                      >
                         {sortBy === 'custom' && (
                            <td className="p-4 text-slate-600">
                               <GripVertical size={16} />
                            </td>
                         )}
                         <td className="p-4">
                            <div className="font-bold text-white">{item.name}</div>
                            <div className="text-slate-500 text-xs font-mono">{item.symbol}</div>
                         </td>
                         <td className="p-4 font-mono text-slate-200">
                            <span className="text-xs text-slate-500 mr-1">{item.currency}</span>
                            {item.currentPrice.toLocaleString()}
                         </td>
                         <td className="p-4">
                           <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              item.status === 'Buy' ? 'bg-emerald-900/30 text-emerald-400' : 
                              item.status === 'Sell' ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'
                            }`}>
                              {item.status.toUpperCase()}
                            </span>
                         </td>
                         <td className="p-4">
                           <div className="flex items-center">
                              <span className={`text-xs font-bold font-mono w-6 ${item.score > 70 ? 'text-emerald-400' : item.score < 40 ? 'text-red-400' : 'text-yellow-400'}`}>{item.score}</span>
                              <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden ml-2">
                                <div 
                                  className={`h-full rounded-full ${item.score > 70 ? 'bg-emerald-500' : item.score < 40 ? 'bg-red-500' : 'bg-yellow-500'}`} 
                                  style={{ width: `${item.score}%` }}
                                ></div>
                              </div>
                           </div>
                         </td>
                         <td className="p-4">
                            <p className="text-xs text-slate-300 line-clamp-2" title={item.lastAnalysis}>{item.lastAnalysis}</p>
                            <div className="text-[10px] text-slate-500 mt-1 flex items-center">
                              <Clock size={10} className="mr-1"/> {getTimeAgo(item.lastUpdated)}
                            </div>
                         </td>
                         <td className="p-4 text-right">
                           <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleAnalyze(item)}
                                disabled={analyzingId === item.id}
                                className="p-1.5 bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-400 rounded transition-colors disabled:opacity-50"
                                title={t('analyze')}
                              >
                                <RefreshCw size={14} className={analyzingId === item.id ? 'animate-spin' : ''} />
                              </button>
                              <button 
                                onClick={() => removeFromWatchlist(item.id)}
                                className="p-1.5 bg-slate-700 hover:bg-red-500 hover:text-white text-slate-400 rounded transition-colors"
                                title={t('remove')}
                              >
                                <Trash2 size={14} />
                              </button>
                           </div>
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TargetPool;
