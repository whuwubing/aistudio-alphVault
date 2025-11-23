import React, { useState } from 'react';
import { classifyMarketState } from '../services/geminiService';
import { MarketStateAnalysis } from '../types';
import { Brain, ArrowRight, Loader2, TrendingUp, AlertTriangle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const MarketClassifier: React.FC = () => {
  const { t, language } = useApp();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<MarketStateAnalysis | null>(null);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const result = await classifyMarketState(input, language);
      setAnalysis(result);
    } catch (error) {
      console.error(error);
      alert('Failed to analyze market data. Please check your API key.');
    } finally {
      setLoading(false);
    }
  };

  const presetScenarios = [
    t('scenario1'),
    t('scenario2'),
    t('scenario3')
  ];
  
  // Real prompt values (mapped from UI scenarios)
  const scenarioPrompts = [
    "Inflation is rising, central banks are hawkish, but tech earnings are strong.",
    "Economic slowdown, deflation fears, commodities crashing, bonds rallying.",
    "Stable growth, low volatility, gold breaking all-time highs."
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Brain size={120} />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
          <Brain className="mr-3 text-purple-400" /> {t('classifyTitle')}
        </h2>
        <p className="text-slate-400 mb-6 max-w-2xl">
          {t('classifyDesc')}
        </p>

        <div className="space-y-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('classifyPlaceholder')}
            className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none placeholder:text-slate-600"
          />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
              {presetScenarios.map((text, i) => (
                <button 
                  key={i}
                  onClick={() => setInput(scenarioPrompts[i])}
                  className="px-3 py-1 bg-slate-700/50 hover:bg-slate-700 text-xs text-slate-300 rounded-full border border-slate-600 whitespace-nowrap transition-colors"
                >
                  {text}
                </button>
              ))}
            </div>
            
            <button
              onClick={handleAnalyze}
              disabled={loading || !input}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium flex items-center transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Brain className="mr-2" size={18} />}
              {loading ? t('analyzingBtn') : t('analyzeBtn')}
            </button>
          </div>
        </div>
      </div>

      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
          {/* Result Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">{t('marketRegime')}</h3>
                <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mt-1">
                  {analysis.regime}
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  analysis.trend === 'Bullish' ? 'bg-emerald-500/20 text-emerald-400' :
                  analysis.trend === 'Bearish' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {analysis.trend === 'Bullish' ? <TrendingUp size={12} className="mr-1" /> : <AlertTriangle size={12} className="mr-1" />}
                  {analysis.trend}
                </span>
                <p className="text-slate-500 text-xs mt-2">{t('confidence')}: {analysis.confidence}%</p>
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
              <p className="text-slate-300 italic text-sm leading-relaxed">"{analysis.reasoning}"</p>
            </div>
          </div>

          {/* Allocation Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-md flex flex-col justify-center">
            <h3 className="text-slate-100 font-semibold mb-6 flex items-center">
              <ArrowRight className="mr-2 text-emerald-400" size={18} />
              {t('recommendedAllocation')}
            </h3>
            <div className="space-y-4">
              <AllocationBar label={t('equities')} value={analysis.suggestedAllocation.equity} color="bg-blue-500" />
              <AllocationBar label={t('bonds')} value={analysis.suggestedAllocation.bonds} color="bg-emerald-500" />
              <AllocationBar label={t('commodities')} value={analysis.suggestedAllocation.commodities} color="bg-amber-500" />
              <AllocationBar label={t('cash')} value={analysis.suggestedAllocation.cash} color="bg-slate-500" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AllocationBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-200 font-mono">{value}%</span>
    </div>
    <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
      <div className={`${color} h-full rounded-full transition-all duration-1000 ease-out`} style={{ width: `${value}%` }}></div>
    </div>
  </div>
);

export default MarketClassifier;