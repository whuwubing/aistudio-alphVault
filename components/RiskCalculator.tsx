import React, { useState } from 'react';
import { analyzeTradeRisk } from '../services/geminiService';
import { TradePlan } from '../types';
import { ShieldAlert, Calculator, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const RiskCalculator: React.FC = () => {
  const { t, language } = useApp();
  const [formData, setFormData] = useState({
    symbol: '0700.HK',
    entry: 385,
    stop: 370,
    target: 430,
    capital: 1000000
  });
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<TradePlan | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzeTradeRisk(
        formData.symbol, 
        Number(formData.entry), 
        Number(formData.stop), 
        Number(formData.target), 
        Number(formData.capital),
        language
      );
      setPlan(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
      {/* Input Section */}
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <Calculator className="mr-2 text-orange-400" /> {t('riskPlanner')}
          </h2>
          
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">{t('assetSymbol')}</label>
              <input type="text" name="symbol" value={formData.symbol} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-orange-500 outline-none" />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
               <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">{t('entryPrice')}</label>
                <input type="number" name="entry" value={formData.entry} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">{t('stopLoss')}</label>
                <input type="number" name="stop" value={formData.stop} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-red-300 focus:border-red-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">{t('takeProfit')}</label>
                <input type="number" name="target" value={formData.target} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-emerald-300 focus:border-emerald-500 outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">{t('totalCapital')}</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-500">$</span>
                <input type="number" name="capital" value={formData.capital} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pl-8 text-white focus:border-orange-500 outline-none" />
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-lg font-bold flex items-center justify-center transition-all mt-2 shadow-lg shadow-orange-900/20"
            >
              {loading ? t('calculating') : t('analyzeRiskBtn')}
            </button>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <h4 className="text-slate-300 font-semibold mb-2 text-sm">{t('riskRules')}</h4>
          <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
            <li>{t('rule1')}</li>
            <li>{t('rule2')}</li>
            <li>{t('rule3')}</li>
          </ul>
        </div>
      </div>

      {/* Output Section */}
      <div className="space-y-6">
        {plan ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl animate-slide-up">
            <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">{t('analysisResult')}</h3>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${plan.riskRewardRatio >= 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                R/R Ratio: 1:{plan.riskRewardRatio.toFixed(2)}
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <ResultBox label={t('maxPotentialLoss')} value={`-$${plan.maxLoss.toLocaleString()}`} color="text-red-400" />
                <ResultBox label={t('estProfit')} value={`+$${plan.estimatedProfit.toLocaleString()}`} color="text-emerald-400" />
              </div>

              <div className="bg-slate-700/30 rounded-lg p-5 border border-slate-600">
                <div className="flex justify-between items-center mb-2">
                   <span className="text-slate-300 font-medium">{t('kellyCriterion')}</span>
                   <span className="text-orange-400 font-mono font-bold">{plan.kellyPercentage?.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
                  <div className="bg-orange-500 h-full rounded-full" style={{ width: `${Math.min(plan.kellyPercentage || 0, 100)}%` }}></div>
                </div>
                <p className="text-xs text-slate-400">
                  {t('kellyDesc')}
                </p>
              </div>

              <div>
                <h4 className="text-slate-300 font-semibold mb-3 flex items-center">
                  <ShieldAlert size={16} className="mr-2 text-blue-400" /> {t('aiFeedback')}
                </h4>
                <div className="bg-slate-900 rounded-lg p-4 text-sm text-slate-300 leading-relaxed border-l-2 border-blue-500">
                  {plan.aiFeedback}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 bg-emerald-900/20 border border-emerald-500/30 p-3 rounded-lg flex items-center justify-center text-emerald-400 font-semibold">
                  <CheckCircle size={18} className="mr-2" /> {t('accept')}
                </div>
                <div className="flex-1 bg-red-900/20 border border-red-500/30 p-3 rounded-lg flex items-center justify-center text-red-400 font-semibold">
                   <XCircle size={18} className="mr-2" /> {t('reject')}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full bg-slate-800/50 rounded-xl border border-slate-700 border-dashed flex items-center justify-center text-slate-500">
            <div className="text-center p-8">
              <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
              <p>{t('enterDetails')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ResultBox = ({ label, value, color }: any) => (
  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
    <p className="text-slate-500 text-xs uppercase font-bold mb-1">{label}</p>
    <p className={`text-xl font-mono font-bold ${color}`}>{value}</p>
  </div>
);

export default RiskCalculator;