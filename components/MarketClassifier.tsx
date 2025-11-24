
import React, { useState, useEffect } from 'react';
import { classifyMarketState } from '../services/geminiService';
import { fetchKLineData, KLineData } from '../services/stockService';
import { MarketStateAnalysis, QuantitativeMetrics } from '../types';
import { Brain, Loader2, TrendingUp, AlertTriangle, Activity, Calendar, Clock, CheckCircle, BarChart2, Gauge, ArrowUp, ArrowDown } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const ASSETS = [
  { id: 'sh000001', nameKey: 'aShare', symbol: 'SHCOMP' },
  { id: 'sz399006', nameKey: 'chinext', symbol: 'CHINEXT' },
  { id: 'hkHSI', nameKey: 'hkShare', symbol: 'HSI' },
  { id: 'hkHSTECH', nameKey: 'hstech', symbol: 'HSTECH' },
  { id: 'usQQQ', nameKey: 'nasdaq', symbol: 'QQQ' },
  { id: 'usXAU', nameKey: 'gold', symbol: 'XAUUSD' }, 
  { id: 'usVIX', nameKey: 'vix', symbol: 'IVX' },
];

const MarketClassifier: React.FC = () => {
  const { t, language, marketHistory, addMarketAnalysis } = useApp();
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[2]); // Default HSI
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [kLineData, setKLineData] = useState<KLineData[]>([]);
  const [metrics, setMetrics] = useState<QuantitativeMetrics | null>(null);
  const [statusText, setStatusText] = useState('');
  const [progress, setProgress] = useState(0);
  
  // Check if we have done an analysis today for THIS specific asset
  const todayStr = new Date().toDateString();
  const todayAnalysis = marketHistory.find(m => 
    m.metrics?.symbol === selectedAsset.symbol &&
    m.timestamp && new Date(m.timestamp).toDateString() === todayStr
  );

  // Get latest analysis for this asset to display even if not today's
  const latestAssetAnalysis = todayAnalysis || marketHistory.find(m => m.metrics?.symbol === selectedAsset.symbol);

  useEffect(() => {
    loadData();
  }, [selectedAsset]);

  const loadData = async () => {
    setDataLoading(true);
    setMetrics(null);
    try {
      // Need enough data for MACD(26) + signal(9) => ~35-40 points min. Fetching 60 is safe.
      const data = await fetchKLineData(selectedAsset.symbol, 60); 
      setKLineData(data);
      if (data.length > 40) {
        const computed = calculateMetrics(data);
        setMetrics(computed);
      }
    } catch (e) {
      console.error("Failed to load KLine data", e);
    } finally {
      setDataLoading(false);
    }
  };

  // --- QUANT ALGORITHMS ---

  const calculateRSI = (prices: number[], period: number = 14): number => {
      if (prices.length < period + 1) return 50;
      
      let gains = 0;
      let losses = 0;

      for (let i = 1; i <= period; i++) {
          const change = prices[i] - prices[i - 1];
          if (change >= 0) gains += change;
          else losses += Math.abs(change);
      }

      let avgGain = gains / period;
      let avgLoss = losses / period;

      // Smooth
      for (let i = period + 1; i < prices.length; i++) {
          const change = prices[i] - prices[i - 1];
          const gain = change >= 0 ? change : 0;
          const loss = change < 0 ? Math.abs(change) : 0;

          avgGain = (avgGain * (period - 1) + gain) / period;
          avgLoss = (avgLoss * (period - 1) + loss) / period;
      }

      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - (100 / (1 + rs));
  };

  const calculateEMA = (prices: number[], period: number): number[] => {
      const k = 2 / (period + 1);
      const emaArray = [prices[0]];
      for (let i = 1; i < prices.length; i++) {
          emaArray.push(prices[i] * k + emaArray[i - 1] * (1 - k));
      }
      return emaArray;
  };

  const calculateMACD = (prices: number[]) => {
      const ema12 = calculateEMA(prices, 12);
      const ema26 = calculateEMA(prices, 26);
      
      const macdLine = ema12.map((val, i) => val - ema26[i]);
      const signalLine = calculateEMA(macdLine, 9);
      
      const lastMACD = macdLine[macdLine.length - 1];
      const lastSignal = signalLine[signalLine.length - 1];
      
      return {
          line: lastMACD,
          signal: lastSignal,
          histogram: lastMACD - lastSignal
      };
  };

  const calculateBollingerBands = (prices: number[], period: number = 20, multiplier: number = 2) => {
      if (prices.length < period) return { upper: 0, lower: 0, middle: 0, bandwidth: 0 };
      
      const slice = prices.slice(-period);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);

      const upper = mean + (multiplier * stdDev);
      const lower = mean - (multiplier * stdDev);
      const bandwidth = ((upper - lower) / mean) * 100;

      return { upper, lower, middle: mean, bandwidth };
  };

  const calculateMetrics = (data: KLineData[]): QuantitativeMetrics => {
    const prices = data.map(d => d.close);
    const lastPrice = prices[prices.length - 1];
    
    // 1. Calculate MA20 & Deviation
    const slice20 = prices.slice(-20);
    const ma20 = slice20.reduce((a, b) => a + b, 0) / 20;
    const maDeviation = ((lastPrice - ma20) / ma20) * 100;

    // 2. Calculate Volatility
    const logReturns = [];
    for (let i = 1; i < slice20.length; i++) {
        logReturns.push(Math.log(slice20[i] / slice20[i-1]));
    }
    const meanReturn = logReturns.reduce((a,b) => a+b, 0) / logReturns.length;
    const variance = logReturns.reduce((acc, val) => acc + Math.pow(val - meanReturn, 2), 0) / logReturns.length;
    const stdDev = Math.sqrt(variance);
    const annualizedVol = stdDev * Math.sqrt(252) * 100; // Annualized %

    // 3. Professional Indicators
    const rsi = calculateRSI(prices);
    const macdData = calculateMACD(prices);
    const bollinger = calculateBollingerBands(prices);

    // 4. Determine Regime (Internal Heuristic)
    let regime: string = 'Unknown';
    if (selectedAsset.symbol === 'IVX') {
        if (lastPrice > 30) regime = 'Crash';
        else if (lastPrice > 20) regime = 'Mean Reversion';
        else regime = 'Trend';
    } else {
        // RSI Logic
        if (rsi > 70) regime = 'Overbought';
        else if (rsi < 30) regime = 'Oversold';
        else if (annualizedVol > 20 && maDeviation < -5) regime = 'Crash';
        else if (Math.abs(maDeviation) > 2) regime = 'Trend';
        else regime = 'Mean Reversion';
    }

    return {
        symbol: selectedAsset.symbol,
        currentPrice: lastPrice,
        ma20,
        maDeviation,
        volatility: annualizedVol,
        trendStrength: Math.min(Math.abs(maDeviation) * 10 + Math.abs(macdData.histogram) * 5, 100),
        regimeType: regime,
        // New Props
        rsi,
        macd: macdData.line,
        macdSignal: macdData.signal,
        macdHistogram: macdData.histogram,
        bollingerUpper: bollinger.upper,
        bollingerLower: bollinger.lower,
        bollingerBandwidth: bollinger.bandwidth
    };
  };

  const handleRunDailyAnalysis = async () => {
    if (!metrics) {
        await loadData();
        if (!metrics) return;
    }
    setLoading(true);
    setProgress(10);
    setStatusText(t('initAnalysis'));

    console.log("--- STEP 1: Run Analysis Triggered ---");

    try {
      // Mock progress steps for UX
      setTimeout(() => { setProgress(40); setStatusText(t('consultingAI')); }, 800);
      
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Analysis Timeout")), 20000));
      const analysisPromise = classifyMarketState(metrics, language);
      
      const result = await Promise.race([analysisPromise, timeoutPromise]) as MarketStateAnalysis;
      
      setProgress(90);
      setStatusText(t('finalizing'));

      console.log("--- STEP 2: Result Got ---", result);

      const analysisWithChart = {
          ...result,
          chartData: kLineData.slice(-30) // Save last 30 days
      };
      
      setTimeout(() => {
          addMarketAnalysis(analysisWithChart);
          setLoading(false);
          setProgress(100);
          setStatusText('');
      }, 500);

    } catch (error) {
      console.error("Analysis Error", error);
      alert('Analysis failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-10">
      
      {/* 0. Asset Tabs */}
      <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
        {ASSETS.map(asset => (
            <button
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                    selectedAsset.id === asset.id 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
            >
                {t(asset.nameKey as any) || asset.symbol}
            </button>
        ))}
      </div>

      {/* 1. Quantitative Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {/* Chart Area */}
         <div className="md:col-span-3 bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-sm relative overflow-hidden">
            <h3 className="text-white font-bold flex items-center mb-4 z-10 relative">
                <Activity className="mr-2 text-blue-400" /> Quantitative Tracking ({selectedAsset.symbol})
            </h3>
            
            {/* Bollinger Bands Visualization hint if needed */}
            <div className="h-[300px] w-full z-10 relative">
               {dataLoading ? (
                   <div className="h-full flex items-center justify-center text-slate-500">
                       <Loader2 className="animate-spin mr-2" /> Loading Data...
                   </div>
               ) : (
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={kLineData}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="date" hide />
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
                        <Area type="monotone" dataKey="close" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPrice)" />
                      </AreaChart>
                   </ResponsiveContainer>
               )}
            </div>
         </div>

         {/* Metrics Column */}
         <div className="md:col-span-1 space-y-4">
             {/* RSI CARD */}
             <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-sm">
                <div className="text-xs text-slate-500 font-bold uppercase mb-2">{t('rsi')}</div>
                <div className="flex items-end justify-between">
                    <span className={`text-2xl font-mono font-bold ${
                        metrics ? (metrics.rsi > 70 ? 'text-red-400' : metrics.rsi < 30 ? 'text-emerald-400' : 'text-slate-200') : 'text-slate-500'
                    }`}>
                        {metrics ? metrics.rsi.toFixed(1) : '--'}
                    </span>
                    <span className="text-[10px] text-slate-400 mb-1">
                        {metrics && (metrics.rsi > 70 ? t('overbought') : metrics.rsi < 30 ? t('oversold') : t('neutral'))}
                    </span>
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                        className={`h-full ${metrics ? (metrics.rsi > 70 ? 'bg-red-500' : metrics.rsi < 30 ? 'bg-emerald-500' : 'bg-blue-500') : 'bg-slate-600'}`} 
                        style={{ width: `${metrics ? metrics.rsi : 0}%` }}
                    />
                </div>
             </div>

             {/* MACD CARD */}
             <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-sm">
                <div className="text-xs text-slate-500 font-bold uppercase mb-2">{t('macd')}</div>
                <div className="flex items-end justify-between">
                    <span className={`text-xl font-mono font-bold ${
                        metrics ? (metrics.macdHistogram > 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500'
                    }`}>
                        {metrics ? metrics.macdHistogram.toFixed(2) : '--'}
                    </span>
                    {metrics && (
                        metrics.macdHistogram > 0 
                        ? <ArrowUp size={16} className="text-emerald-500 mb-1"/> 
                        : <ArrowDown size={16} className="text-red-500 mb-1"/>
                    )}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">{t('momentum')} (Hist)</div>
             </div>

             {/* BOLLINGER CARD */}
             <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-sm">
                <div className="text-xs text-slate-500 font-bold uppercase mb-2">{t('bollinger')}</div>
                <div className="text-xl font-mono font-bold text-blue-300">
                    {metrics ? metrics.bollingerBandwidth.toFixed(1) : '--'}%
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                    {metrics && metrics.bollingerBandwidth < 5 ? t('volatilitySqueeze') : 'Width'}
                </div>
             </div>
         </div>
      </div>

      {/* 2. Analysis Action Area */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-lg p-8 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-6 opacity-5">
           <Brain size={150} />
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 relative z-10">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center">
                    <Gauge className="mr-3 text-purple-400" /> AI Quant Strategist
                </h2>
                <p className="text-slate-400 mt-1 text-sm">
                    Multi-factor analysis: Volatility + Trend + Momentum + Squeeze
                </p>
            </div>
            <div className="mt-4 md:mt-0">
                {todayAnalysis ? (
                    <div className="flex items-center bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-500/20 font-bold">
                       <CheckCircle size={18} className="mr-2" /> {t('dailyDone')}
                    </div>
                 ) : (
                    <button 
                       onClick={handleRunDailyAnalysis}
                       disabled={loading || !metrics}
                       className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-purple-900/20 flex items-center transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
                    >
                       {loading ? <Loader2 className="animate-spin mr-2" /> : <BarChart2 className="mr-2" />}
                       {loading ? statusText : t('analyzeBtn')}
                    </button>
                 )}
            </div>
        </div>

        {/* Loading Overlay */}
        {loading && (
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-fade-in px-8 text-center">
                <Loader2 size={48} className="text-purple-500 animate-spin mb-6" />
                <h3 className="text-xl font-bold text-white mb-2">{statusText}</h3>
                <div className="w-64 bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        )}

        {latestAssetAnalysis && (
              <div className="animate-slide-up relative z-10">
                 <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 mb-6 backdrop-blur-sm">
                    <div className="flex justify-between items-start mb-4">
                       <div>
                          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t('marketRegime')}</h3>
                          <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mt-1">
                             {latestAssetAnalysis.regime}
                          </div>
                       </div>
                       <div className="text-right">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mb-2 ${
                              latestAssetAnalysis.trend === 'Bullish' ? 'bg-emerald-500/20 text-emerald-400' :
                              latestAssetAnalysis.trend === 'Bearish' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                          }`}>
                              {latestAssetAnalysis.trend === 'Bullish' ? <TrendingUp size={12} className="mr-1"/> : <AlertTriangle size={12} className="mr-1"/>}
                              {latestAssetAnalysis.trend}
                          </div>
                          <div className="text-xs text-slate-500">{new Date(latestAssetAnalysis.timestamp || 0).toLocaleDateString()}</div>
                       </div>
                    </div>
                    <p className="text-slate-300 italic text-lg leading-relaxed border-l-4 border-purple-500 pl-4">
                       "{latestAssetAnalysis.reasoning}"
                    </p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <AllocationBar label={t('equities')} value={latestAssetAnalysis.suggestedAllocation.equity} color="bg-blue-500" />
                     <AllocationBar label={t('bonds')} value={latestAssetAnalysis.suggestedAllocation.bonds} color="bg-emerald-500" />
                     <AllocationBar label={t('commodities')} value={latestAssetAnalysis.suggestedAllocation.commodities} color="bg-amber-500" />
                     <AllocationBar label={t('cash')} value={latestAssetAnalysis.suggestedAllocation.cash} color="bg-slate-500" />
                 </div>
              </div>
        )}
      </div>

      {/* 3. History Timeline */}
      <div className="space-y-4">
         <h3 className="text-xl font-bold text-white flex items-center">
            <Clock className="mr-2 text-slate-400" /> {selectedAsset.symbol} {t('historicalTimeline')}
         </h3>
         
         {marketHistory.filter(m => m.metrics?.symbol === selectedAsset.symbol).length === 0 ? (
            <div className="text-center p-8 border border-slate-700 border-dashed rounded-xl text-slate-500">
               {t('noMarketHistory')}
            </div>
         ) : (
            <div className="relative border-l-2 border-slate-700 ml-4 space-y-8 pl-8 py-4">
               {marketHistory
                  .filter(m => m.metrics?.symbol === selectedAsset.symbol)
                  .map((history, idx) => (
                  <div key={idx} className="relative animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
                     <div className="absolute -left-[41px] bg-slate-900 border-2 border-slate-600 w-6 h-6 rounded-full flex items-center justify-center z-10">
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                     </div>
                     <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-500 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-sm font-bold text-white">{history.regime}</span>
                           <span className="text-xs text-slate-500">{new Date(history.timestamp || 0).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{history.reasoning}</p>
                        
                        {/* Show saved metrics if available */}
                        {history.metrics && history.metrics.rsi && (
                            <div className="flex gap-4 mt-2 pt-2 border-t border-slate-700/50 text-xs font-mono text-slate-500">
                                <span className={history.metrics.rsi > 70 ? 'text-red-400' : history.metrics.rsi < 30 ? 'text-emerald-400' : ''}>
                                    RSI: {history.metrics.rsi.toFixed(1)}
                                </span>
                                <span>Vol: {history.metrics.volatility.toFixed(1)}%</span>
                            </div>
                        )}
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>

    </div>
  );
};

const AllocationBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
    <div className="flex justify-between text-xs mb-1.5">
      <span className="text-slate-400 font-semibold">{label}</span>
      <span className="text-white font-mono">{value}%</span>
    </div>
    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
      <div className={`${color} h-full rounded-full transition-all duration-1000 ease-out`} style={{ width: `${value}%` }}></div>
    </div>
  </div>
);

export default MarketClassifier;
