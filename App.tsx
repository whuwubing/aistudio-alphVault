import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import MarketClassifier from './components/MarketClassifier';
import StrategyAdvisor from './components/StrategyAdvisor';
import RiskCalculator from './components/RiskCalculator';
import Portfolio from './components/Portfolio';
import TargetPool from './components/TargetPool';
import InvestmentAdvisor from './components/InvestmentAdvisor';
import { AppProvider, useApp } from './contexts/AppContext';
import { Globe } from 'lucide-react';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const { language, setLanguage, t, totalValue } = useApp();

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'advisor':
        return <InvestmentAdvisor />;
      case 'pool':
        return <TargetPool />;
      case 'market':
        return <MarketClassifier />;
      case 'strategy':
        return <StrategyAdvisor />;
      case 'risk':
        return <RiskCalculator />;
      case 'portfolio':
        return <Portfolio />;
      default:
        return <Dashboard />;
    }
  };

  const getTitle = () => {
    switch (currentView) {
      case 'dashboard': return t('dashboard');
      case 'advisor': return t('advisorTitle');
      case 'pool': return t('targetPool');
      case 'market': return t('marketClassifier');
      case 'strategy': return t('strategyCenter');
      case 'risk': return t('riskManager');
      case 'portfolio': return t('portfolio');
      default: return t('dashboard');
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden selection:bg-blue-500/30">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      
      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden relative scroll-smooth">
        <header className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-700 px-6 py-4 flex justify-between items-center shadow-sm">
          <h1 className="text-xl font-bold text-white capitalize flex items-center gap-2">
            {getTitle()}
          </h1>
          <div className="flex items-center space-x-6">
            <button 
              onClick={toggleLanguage}
              className="flex items-center text-sm text-slate-400 hover:text-white transition-colors bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600"
            >
              <Globe size={16} className="mr-2" />
              {language === 'en' ? 'English' : '中文'}
            </button>

            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400 uppercase tracking-wider">{t('portfolioValue')}</p>
              <p className="text-sm font-bold text-emerald-400 transition-all duration-500 font-mono">
                ${Math.floor(totalValue).toLocaleString()}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
              {t('user').substring(0, 1)}
            </div>
          </div>
        </header>
        
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-20 min-h-[calc(100vh-80px)]">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;