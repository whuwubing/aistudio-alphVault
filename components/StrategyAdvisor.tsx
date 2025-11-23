import React, { useState } from 'react';
import { generateStrategy } from '../services/geminiService';
import { AssetClass, StrategyRecommendation } from '../types';
import { Lightbulb, Loader2, Target, LogIn, LogOut, Shield } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const StrategyAdvisor: React.FC = () => {
  const { t, language } = useApp();
  const [selectedAsset, setSelectedAsset] = useState<AssetClass>(AssetClass.HK_STOCKS);
  const [marketCondition, setMarketCondition] = useState('');
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState<StrategyRecommendation | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const condition = marketCondition || (language === 'zh' ? '震荡偏多' : 'Volatile with upward bias');
      const result = await generateStrategy(selectedAsset, condition, language);
      setStrategy(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 animate-fade-in">
      {/* Control Panel */}
      <div className="w-full md:w-1/3 space-y-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <Target className="mr-2 text-blue-400" /> {t('strategyGenerator')}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">{t('targetAsset')}</label>
              <select 
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value as AssetClass)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {Object.values(AssetClass).map(ac => (
                  <option key={ac} value={ac}>{ac}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">{t('marketContext')}</label>
              <input
                type="text"
                value={marketCondition}
                onChange={(e) => setMarketCondition(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-600"
                placeholder={t('marketContextPlaceholder')}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-medium flex items-center justify-center transition-all mt-4"
            >
              {loading ? <Loader2 className="animate-spin" /> : t('generateBtn')}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-xl text-sm text-blue-200">
          <p className="flex items-start">
            <Lightbulb size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            {t('strategyInfo')}
          </p>
        </div>
      </div>

      {/* Results Panel */}
      <div className="w-full md:w-2/3">
        {strategy ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden animate-slide-up h-full flex flex-col">
            <div className="bg-slate-900/50 p-6 border-b border-slate-700 flex justify-between items-start">
              <div>
                <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">{strategy.type}</span>
                <h3 className="text-3xl font-bold text-white mt-1">{strategy.name}</h3>
              </div>
              <div className={`px-4 py-2 rounded-lg border ${
                strategy.riskLevel === 'High' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                strategy.riskLevel === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                <span className="text-xs font-bold uppercase">Risk: {strategy.riskLevel}</span>
              </div>
            </div>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <div>
                <h4 className="text-slate-400 text-sm font-semibold mb-2">{t('desc')}</h4>
                <p className="text-slate-200 leading-relaxed">{strategy.description}</p>
              </div>

              <div>
                <h4 className="text-slate-400 text-sm font-semibold mb-2">{t('rationale')}</h4>
                <div className="bg-slate-700/30 p-4 rounded-lg border-l-4 border-blue-500">
                  <p className="text-slate-300 italic">"{strategy.rationale}"</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                  <h5 className="text-emerald-400 flex items-center text-sm font-bold mb-2">
                    <LogIn size={16} className="mr-2" /> {t('entryTrigger')}
                  </h5>
                  <p className="text-slate-300 text-sm">{strategy.entryTrigger}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                  <h5 className="text-red-400 flex items-center text-sm font-bold mb-2">
                    <LogOut size={16} className="mr-2" /> {t('exitTrigger')}
                  </h5>
                  <p className="text-slate-300 text-sm">{strategy.exitTrigger}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <div className="flex items-center text-slate-400 text-sm">
                  <Shield size={16} className="mr-2" />
                  {t('protectionFocus')}
                </div>
                <div className="text-xl font-bold text-emerald-400">
                  {t('targetReturn')}: {strategy.targetReturn}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full bg-slate-800 rounded-xl border border-slate-700 border-dashed flex flex-col items-center justify-center text-slate-500 p-12 text-center">
            <Target size={48} className="mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-slate-400">{t('noStrategy')}</h3>
            <p className="max-w-md mt-2">{t('noStrategyDesc')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyAdvisor;