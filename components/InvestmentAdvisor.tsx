import React, { useState } from 'react';
import { BrainCircuit, Play, ArrowRight, AlertTriangle, CheckCircle, TrendingUp, RefreshCcw } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { generateHolisticAdvice } from '../services/geminiService';
import { HolisticAdvice } from '../types';

const InvestmentAdvisor: React.FC = () => {
  const { t, portfolio, watchlist, language, marketRegimeContext } = useApp();
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<HolisticAdvice | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateHolisticAdvice(portfolio, watchlist, marketRegimeContext, language);
      setAdvice(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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

      {advice && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
          {/* Summary Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-slate-400 text-sm font-bold uppercase mb-4 tracking-wider">{t('marketRegime')} & {t('strategyCenter')}</h3>
              <p className="text-xl text-white leading-relaxed font-medium">
                {advice.summary}
              </p>
              <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 flex items-start">
                 <TrendingUp className="text-emerald-400 mr-3 mt-1 flex-shrink-0" size={20} />
                 <p className="text-slate-400 text-sm italic">{advice.marketContext}</p>
              </div>
            </div>

            <h3 className="text-xl font-bold text-white flex items-center pt-2">
              <CheckCircle className="mr-2 text-blue-400" /> {t('actions')}
            </h3>
            
            <div className="space-y-4">
              {advice.actions.map((action, idx) => (
                <div key={idx} className="bg-slate-800 rounded-xl p-0 border border-slate-700 overflow-hidden flex flex-col md:flex-row">
                  <div className={`w-full md:w-32 p-4 flex flex-col justify-center items-center ${
                    action.action === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' :
                    action.action === 'SELL' ? 'bg-red-500/10 text-red-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    <span className="font-black text-xl">{action.action}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded mt-1 ${
                       action.urgency === 'High' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>{action.urgency}</span>
                  </div>
                  
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-bold text-white">{action.asset}</h4>
                      <span className="bg-slate-700 text-slate-200 px-3 py-1 rounded text-sm font-mono">{action.quantity}</span>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed border-l-2 border-slate-600 pl-3">
                      {action.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Impact Column */}
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 h-full">
              <h3 className="text-slate-100 font-bold mb-6 flex items-center">
                <ArrowRight className="mr-2 text-purple-400" />
                {t('impact')}
              </h3>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-purple-900/20 to-slate-900 rounded-xl p-6 border border-purple-500/20">
                   <p className="text-slate-300 text-sm leading-relaxed">
                     {advice.projectedImpact}
                   </p>
                </div>

                <div className="border-t border-slate-700 pt-6">
                  <h4 className="text-xs text-slate-500 uppercase font-bold mb-4">{t('growthTarget')} Progress</h4>
                  
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Current Yield</span>
                    <span className="text-white">12.5%</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2 rounded-full mb-4">
                    <div className="bg-slate-500 h-full rounded-full" style={{ width: '60%' }}></div>
                  </div>

                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-emerald-400 font-bold">Projected Yield</span>
                    <span className="text-emerald-400 font-bold">18.2%</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2 rounded-full relative overflow-hidden">
                     {/* Pattern for projection */}
                    <div className="bg-emerald-500 h-full rounded-full absolute top-0 left-0" style={{ width: '91%' }}></div>
                    <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjwqonyQpCASmAcPAdZBACW0RtN6w2C/QAAAABJRU5ErkJggg==')] opacity-30"></div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 text-right">
                    *Based on AI Model projections
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!advice && !loading && (
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