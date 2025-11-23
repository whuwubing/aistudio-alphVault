import React, { useState } from 'react';
import { AssetClass, PortfolioItem } from '../types';
import { useApp } from '../contexts/AppContext';
import { Plus, Trash2, X, Check, Loader2, RefreshCw } from 'lucide-react';
import { searchAssetDetails } from '../services/geminiService';

const Portfolio: React.FC = () => {
  const { t, portfolio, addPortfolioItem, removePortfolioItem, refreshPortfolioPrices, isRefreshing, lastUpdated, language } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Add Form State
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const handleAdd = async () => {
    if (!symbol || !quantity || !cost) return;
    setIsSearching(true);
    
    try {
      // Fetch details to get Asset Class and Name
      const details = await searchAssetDetails(symbol, language);
      
      const newItem: PortfolioItem = {
        id: Date.now().toString(),
        symbol: symbol.toUpperCase(),
        name: details.name || symbol,
        assetClass: (details.assetClass as AssetClass) || AssetClass.HK_STOCKS,
        quantity: Number(quantity),
        avgPrice: Number(cost),
        currentPrice: details.currentPrice || Number(cost), // Initial fallback
        marketValue: Number(quantity) * (details.currentPrice || Number(cost)),
        pnl: 0, // Will update on refresh
        pnlPercent: 0,
        lastUpdated: Date.now()
      };
      
      addPortfolioItem(newItem);
      setShowAddModal(false);
      setSymbol('');
      setQuantity('');
      setCost('');
    } catch (e) {
      alert("Failed to verify asset symbol. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-white">{t('currentHoldings')}</h2>
           <p className="text-xs text-slate-500 mt-1 flex items-center">
             {t('lastUpdated')}: {new Date(lastUpdated).toLocaleTimeString()}
             {isRefreshing && <Loader2 size={12} className="ml-2 animate-spin text-blue-400" />}
           </p>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => refreshPortfolioPrices()} 
            disabled={isRefreshing}
            className="p-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center shadow-lg shadow-blue-900/20"
          >
            <Plus size={16} className="mr-2" /> {t('addTransaction')}
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-sm">
        {portfolio.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p>{t('noHoldings')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                  <th className="p-4 font-semibold">{t('asset')}</th>
                  <th className="p-4 font-semibold">{t('class')}</th>
                  <th className="p-4 font-semibold text-right">{t('quantity')}</th>
                  <th className="p-4 font-semibold text-right">{t('avgPrice')}</th>
                  <th className="p-4 font-semibold text-right">{t('currentPrice')}</th>
                  <th className="p-4 font-semibold text-right">{t('marketValue')}</th>
                  <th className="p-4 font-semibold text-right">{t('pnl')}</th>
                  <th className="p-4 font-semibold text-right"></th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-700">
                {portfolio.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-700/30 transition-colors group">
                    <td className="p-4">
                      <div className="font-medium text-white">{item.symbol}</div>
                      <div className="text-slate-500 text-xs truncate max-w-[150px]">{item.name}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.assetClass === AssetClass.HK_STOCKS ? 'bg-blue-900/30 text-blue-400' :
                        item.assetClass === AssetClass.A_SHARES ? 'bg-red-900/30 text-red-400' :
                        item.assetClass === AssetClass.PRECIOUS_METALS ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-emerald-900/30 text-emerald-400'
                      }`}>
                        {item.assetClass}
                      </span>
                    </td>
                    <td className="p-4 text-right text-slate-300">{item.quantity}</td>
                    <td className="p-4 text-right text-slate-300">${item.avgPrice.toLocaleString()}</td>
                    <td className="p-4 text-right text-slate-200 font-medium font-mono">
                      ${item.currentPrice.toFixed(2)}
                    </td>
                    <td className="p-4 text-right text-slate-200 font-bold">${Math.floor(item.marketValue).toLocaleString()}</td>
                    <td className={`p-4 text-right font-medium ${item.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {item.pnl >= 0 ? '+' : ''}{Math.floor(item.pnl).toLocaleString()} ({item.pnlPercent.toFixed(2)}%)
                    </td>
                     <td className="p-4 text-right">
                       <button 
                        onClick={() => removePortfolioItem(item.id)}
                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                       >
                         <Trash2 size={16} />
                       </button>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">{t('addTransaction')}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">{t('symbol')}</label>
                <input 
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="e.g. AAPL, 0700.HK"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">{t('quantity')}</label>
                  <input 
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">{t('avgPrice')}</label>
                  <input 
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button 
                onClick={handleAdd}
                disabled={isSearching || !symbol || !quantity || !cost}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-medium flex items-center justify-center mt-4 transition-colors disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="animate-spin" /> : <Check className="mr-2" />}
                {isSearching ? t('verifying') : t('confirmAdd')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolio;