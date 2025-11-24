
import React, { useState } from 'react';
import { BrainCircuit, Play, ArrowRight, AlertTriangle, CheckCircle, TrendingUp, RefreshCcw, History, Clock, Zap, Target, ShieldAlert, BarChart3, Tag } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { generateHolisticAdvice } from '../services/geminiService';
import { HolisticAdvice, ActionItem } from '../types';

const InvestmentAdvisor: React.FC = () => {
  const { t, portfolio, watchlist, language, marketRegimeContext, adviceHistory, addAdviceToHistory, executeAdviceAction, marketHistory } = useApp();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'latest' | 'history'>('latest');
  
  // Use local state for the just-generated advice, but fallback to history[0] if available
  const [currentAdvice, setCurrentAdvice] = useState<HolisticAdvice | null>(null);

  const displayAdvice = activeTab === 'latest' 
    ? (currentAdvice || adviceHistory[0]) 
    : null;

  const handleGenerate = async () => {
    setLoading(true);
    setActiveTab('latest');
    try {
      // Pass the LATEST market analysis if available
      const latestAnalysis = marketHistory.length > 0 ? marketHistory[0] : undefined;
      const result = await generateHolisticAdvice(portfolio, watchlist, latestAnalysis, language);
      setCurrentAdvice(result);
      addAdviceToHistory(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (action: ActionItem) => {
    if (!displayAdvice) return;
    await executeAdviceAction(displayAdvice.id, action.id);
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col gap-6 animate-fade-in">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-900/40 to-slate-800 rounded-xl p-8 border border-slate-700 flex flex-col md:flex-row justify-between items-center shadow-lg">
        <div className="mb-6 md:mb-0">
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center">
            <BrainCircuit className="mr-3 text-blue-400" size={32} />
            {t('advisorTitle')}
          </h2>
          <p className="text-slate-300 max-w-xl text-lg opacity-90">
            {t('advisorDesc')}
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/20 flex items-center transition-all transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
        >
          {loading ? <RefreshCcw className="animate-spin mr-3" /> : <Play className="mr-3 fill-current" />}
          {loading ? t('generating') : t('generateAdvice')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-700 pb-1">
        <button 
          onClick={() => setActiveTab('latest')}
          className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'latest' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          {t('latestPlan')}
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'history' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          {t('history')} ({adviceHistory.length})
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'latest' && displayAdvice && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
          {/* Summary Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider">{t('marketRegime')}</h3>
                 <span className="text-xs text-slate-500 flex items-center"><Clock size={12} className="mr-1"/> {new Date(displayAdvice.timestamp).toLocaleString()}</span>
              </div>
              <p className="text-xl text-white leading-relaxed font-medium">
                {displayAdvice.summary}
              </p>
              <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 flex items-start">
                 <TrendingUp className="text-emerald-400 mr-3 mt-1 flex-shrink-0" size={20} />
                 <p className="text-slate-400 text-sm italic">{displayAdvice.marketContext}</p>
              </div>
            </div>

            <h3 className="text-xl font-bold text-white flex items-center pt-2">
              <CheckCircle className="mr-2 text-blue-400" /> {t('actions')}
            </h3>
            
            <div className="space-y-4">
              {displayAdvice.actions.map((action, idx) => (
                <div key={action.id || idx} className="bg-slate-800 rounded-xl p-0 border border-slate-700 overflow-hidden flex flex-col relative group transition-all hover:border-slate-500">
                  {/* Action Header */}
                  <div className={`flex items-center justify-between px-6 py-4 ${
                    action.action === 'BUY' ? 'bg-emerald-900/20 border-b border-emerald-500/10' :
                    action.action === 'SELL' ? 'bg-red-900/20 border-b border-red-500/10' :
                    'bg-blue-900/20 border-b border-blue-500/10'
                  }`}>
                     <div className="flex items-center gap-4">
                        <div className={`px-3 py-1 rounded-lg font-black text-lg ${
                            action.action === 'BUY' ? 'bg-emerald-500 text-white' :
                            action.action === 'SELL' ? 'bg-red-500 text-white' :
                            'bg-blue-500 text-white'
                        }`}>
                            {action.action}
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-white flex items-center">
                                {action.asset} 
                                <span className="text-xs text-slate-400 font-mono ml-2 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{action.ticker}</span>
                            </h4>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                         <span className="bg-slate-700 text-slate-200 px-3 py-1 rounded text-sm font-mono font-bold">{action.quantity}</span>
                     </div>
                  </div>
                  
                  {/* Detailed Plan */}
                  <div className="p-6">
                    <div className="flex gap-2 mb-4">
                        {action.strategyTag && (
                            <span className="flex items-center text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/30">
                                <Tag size={12} className="mr-1"/> {action.strategyTag}
                            </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded border ${
                           action.urgency === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-slate-700/50 text-slate-400 border-slate-600'
                        }`}>{action.urgency} Priority</span>
                    </div>

                    <p className="text-slate-300 text-sm leading-relaxed mb-6">
                      {action.reason}
                    </p>

                    {/* Trading Grid */}
                    {action.action === 'BUY' && (
                        <div className="grid grid-cols-3 gap-2 mb-6">
                            <div className="bg-slate-900 p-3 rounded border border-slate-700">
                                <div className="text-xs text-slate-500 uppercase mb-1 font-bold">{t('entryZone')}</div>
                                <div className="text-emerald-400 font-mono font-bold">
                                    {action.entryLow?.toFixed(2)} - {action.entryHigh?.toFixed(2)}
                                </div>
                            </div>
                            <div className="bg-slate-900 p-3 rounded border border-slate-700">
                                <div className="text-xs text-slate-500 uppercase mb-1 font-bold">{t('targetPrice')}</div>
                                <div className="text-blue-400 font-mono font-bold flex items-center">
                                    <Target size={12} className="mr-1" /> {action.targetPrice?.toFixed(2)}
                                </div>
                            </div>
                            <div className="bg-slate-900 p-3 rounded border border-slate-700">
                                <div className="text-xs text-slate-500 uppercase mb-1 font-bold">{t('stopLoss')}</div>
                                <div className="text-red-400 font-mono font-bold flex items-center">
                                    <ShieldAlert size={12} className="mr-1" /> {action.stopLoss?.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Execution Bar */}
                    <div className="flex justify-between items-center border-t border-slate-700 pt-4">
                       <div className="flex gap-4">
                          <div className="text-xs text-slate-500">
                             {t('estValue')}: <span className="text-slate-300 font-mono block text-sm">${action.estimatedValue?.toLocaleString()}</span>
                          </div>
                          {action.riskRewardRatio && (
                              <div className="text-xs text-slate-500">
                                  {t('rrRatio')}: <span className="text-emerald-400 font-mono block text-sm">1 : {action.riskRewardRatio.toFixed(2)}</span>
                              </div>
                          )}
                       </div>

                       {action.status === 'Executed' ? (
                           <span className="flex items-center text-emerald-400 text-sm font-bold bg-emerald-900/20 px-4 py-2 rounded border border-emerald-500/30">
                             <CheckCircle size={18} className="mr-2"/> {t('executed')}
                           </span>
                       ) : (
                           <button 
                             onClick={() => handleExecute(action)}
                             className="flex items-center bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-2 rounded transition-colors shadow-lg shadow-blue-900/20"
                           >
                             <Zap size={16} className="mr-2" /> {t('executeTrade')}
                           </button>
                       )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Impact Column */}
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 h-full">
              <h3 className="text-slate-100 font-bold mb-6 flex items-center">
                <BarChart3 className="mr-2 text-purple-400" />
                {t('impact')}
              </h3>
              
              <div className="bg-gradient-to-br from-purple-900/20 to-slate-900 rounded-xl p-6 border border-purple-500/20">
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {displayAdvice.projectedImpact}
                  </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History List */}
      {activeTab === 'history' && (
        <div className="grid gap-4 animate-fade-in">
           {adviceHistory.length === 0 ? (
             <div className="text-center p-12 text-slate-500 border border-slate-700 border-dashed rounded-xl">
               <History size={48} className="mx-auto mb-4 opacity-50"/>
               <p>{t('noHistory')}</p>
             </div>
           ) : (
             adviceHistory.map((historyItem) => (
                <div key={historyItem.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer" onClick={() => { setCurrentAdvice(historyItem); setActiveTab('latest'); }}>
                   <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                         <div className="bg-blue-900/30 p-2 rounded-lg text-blue-400">
                            <BrainCircuit size={20} />
                         </div>
                         <div>
                            <h4 className="font-bold text-white">Plan #{historyItem.id.slice(-4)}</h4>
                            <p className="text-xs text-slate-400 flex items-center mt-1">
                               <Clock size={10} className="mr-1"/> {new Date(historyItem.timestamp).toLocaleString()}
                            </p>
                         </div>
                      </div>
                      <div className="text-right">
                         <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">{historyItem.actions.length} Actions</span>
                      </div>
                   </div>
                   <p className="text-slate-400 text-sm line-clamp-2 pl-12">{historyItem.summary}</p>
                </div>
             ))
           )}
        </div>
      )}

      {!displayAdvice && !loading && activeTab === 'latest' && (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <div className="text-center opacity-30">
            <BrainCircuit size={80} className="mx-auto mb-4" />
            <p className="text-xl font-medium">Ready to analyze market data</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentAdvisor;
