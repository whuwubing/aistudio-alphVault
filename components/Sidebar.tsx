import React from 'react';
import { LayoutDashboard, LineChart, ShieldAlert, Wallet, BrainCircuit, Target, Lightbulb } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const { t } = useApp();

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { id: 'advisor', icon: Lightbulb, label: t('investmentAdvisor') },
    { id: 'pool', icon: Target, label: t('targetPool') },
    { id: 'market', icon: BrainCircuit, label: t('marketClassifier') },
    { id: 'strategy', icon: LineChart, label: t('strategyCenter') },
    { id: 'risk', icon: ShieldAlert, label: t('riskManager') },
    { id: 'portfolio', icon: Wallet, label: t('portfolio') },
  ];

  return (
    <div className="w-20 md:w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-screen sticky top-0 transition-all duration-300">
      <div className="p-6 flex items-center justify-center md:justify-start border-b border-slate-700">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-0 md:mr-3 shadow-lg shadow-blue-500/30">
          <span className="font-bold text-white text-xl">α</span>
        </div>
        <span className="text-xl font-bold text-slate-100 hidden md:block tracking-tight">AlphaVault</span>
      </div>
      
      <nav className="flex-1 py-6 space-y-2 px-3 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 group relative ${
              currentView === item.id
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-100'
            }`}
          >
            <item.icon size={22} className={`${currentView === item.id ? 'text-white' : 'text-slate-400 group-hover:text-blue-400 transition-colors'}`} />
            <span className="ml-3 font-medium hidden md:block">{item.label}</span>
            {currentView === item.id && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white hidden md:block shadow-glow"></div>
            )}
            
            {/* Tooltip for mobile */}
            <div className="md:hidden absolute left-full ml-2 px-2 py-1 bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              {item.label}
            </div>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="bg-slate-900/50 rounded-xl p-4 hidden md:block border border-slate-700/50">
          <p className="text-xs text-slate-500 uppercase font-bold mb-1">{t('targetYield')}</p>
          <div className="flex justify-between items-end mb-1">
            <span className="text-2xl font-bold text-emerald-400">20.0%</span>
            <span className="text-xs text-slate-400 mb-1">{t('annually')}</span>
          </div>
          <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '65%' }}></div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 text-right">{t('currentPace')}: 13.2%</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;