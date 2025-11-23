import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { MOCK_PERFORMANCE_DATA } from '../constants';
import { TrendingUp, TrendingDown, DollarSign, Activity, RefreshCw, Zap } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard: React.FC = () => {
  const { t, portfolio, totalValue, totalPnL, refreshPortfolioPrices, isRefreshing, lastUpdated } = useApp();
  
  const assetAllocation = portfolio.map(item => ({
    name: item.assetClass,
    value: item.marketValue
  }));

  // Group by asset class for the pie chart to be accurate
  const groupedAllocation = Object.values(assetAllocation.reduce((acc: any, item) => {
    if (!acc[item.name]) acc[item.name] = { name: item.name, value: 0 };
    acc[item.name].value += item.value;
    return acc;
  }, {}));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-4 sm:gap-0">
         <div className="flex items-center gap-3">
           <p className="text-slate-400 text-sm">
             {t('lastUpdated')}: {new Date(lastUpdated).toLocaleTimeString()}
           </p>
           <div className="flex items-center px-2 py-0.5 rounded bg-blue-900/20 border border-blue-500/30 text-[10px] font-medium text-blue-300">
              <Zap size={10} className="mr-1 fill-current" />
              {t('dataSourceHybrid')}
           </div>
         </div>
         <button 
           onClick={() => refreshPortfolioPrices()}
           disabled={isRefreshing}
           className="flex items-center text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-1.5 rounded-full transition-colors border border-slate-700 shadow-sm"
         >
           <RefreshCw size={12} className={`mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
           {isRefreshing ? t('refreshing') : t('refreshData')}
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          title={t('totalNetWorth')} 
          value={`$${Math.floor(totalValue).toLocaleString()}`} 
          subValue={`+12.5% ${t('ytd')}`} 
          icon={DollarSign} 
          trend="up"
        />
        <Card 
          title={t('totalPnL')} 
          value={`$${Math.floor(totalPnL).toLocaleString()}`} 
          subValue={t('activePositions')} 
          icon={TrendingUp} 
          trend={totalPnL >= 0 ? "up" : "down"}
          color={totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}
          animate={true}
        />
        <Card 
          title={t('sharpeRatio')} 
          value="1.85" 
          subValue={t('riskAdjusted')} 
          icon={Activity} 
          trend="up"
        />
        <Card 
          title={t('drawdown')} 
          value="-4.2%" 
          subValue={t('maxFromPeak')} 
          icon={TrendingDown} 
          trend="down"
          color="text-red-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-100 mb-6">{t('performanceVsTarget')}</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_PERFORMANCE_DATA}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" name={t('portfolioValueChart')} />
                <Line type="monotone" dataKey="target" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} name={t('growthTarget')} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-slate-100 mb-2">{t('assetAllocation')}</h3>
          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={groupedAllocation}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {groupedAllocation.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className="text-center">
                 <span className="block text-slate-400 text-xs">{t('totalAssets')}</span>
                 <span className="block text-slate-100 font-bold text-lg">{portfolio.length}</span>
               </div>
            </div>
          </div>
          <div className="space-y-3 mt-4">
            {groupedAllocation.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-100">${Math.floor(item.value).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Card = ({ title, value, subValue, icon: Icon, trend, color, animate }: any) => (
  <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-sm hover:border-blue-500/50 transition-colors">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-700/50 rounded-lg text-slate-400">
        <Icon size={20} />
      </div>
      {trend && (
        <span className={`text-xs px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {trend === 'up' ? '↗' : '↘'}
        </span>
      )}
    </div>
    <div>
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      <h3 className={`text-2xl font-bold mt-1 ${color || 'text-slate-100'} ${animate ? 'transition-all duration-300' : ''}`}>{value}</h3>
      <p className="text-slate-500 text-xs mt-1">{subValue}</p>
    </div>
  </div>
);

export default Dashboard;