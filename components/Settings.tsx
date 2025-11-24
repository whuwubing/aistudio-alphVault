
import React, { useRef, useState, useEffect } from 'react';
import { Download, Upload, Trash2, Database, AlertTriangle, ShieldCheck, LifeBuoy, Server, Save, Loader2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const Settings: React.FC = () => {
  const { t, exportData, importData, resetData, attemptRecovery, getBackupStats, forceSaveData, portfolio, watchlist, adviceHistory, marketHistory } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recoverMsg, setRecoverMsg] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [stats, setStats] = useState(getBackupStats());
  const [isImporting, setIsImporting] = useState(false);

  // Update stats whenever the context data changes (reactive diagnostics)
  useEffect(() => {
    setStats(getBackupStats());
  }, [portfolio, watchlist, adviceHistory, marketHistory, getBackupStats]);

  const handleImportClick = () => {
    // Reset value to ensure onChange fires even if selecting the same file again
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      
      // Use timeout to allow file picker UI to close completely before showing alert
      setTimeout(() => {
          try {
              if (!content) {
                  alert("Error: The uploaded file is empty.");
                  setIsImporting(false);
                  return;
              }

              // 1. Confirm Action
              if (window.confirm(t('confirmImport'))) {
                  
                  // 2. Attempt Import
                  const result = importData(content);
                  
                  if (result.success) {
                      const msg = `
${result.message}

--- Imported Data Summary ---
Portfolio Items: ${result.stats?.portfolio || 0}
Watchlist Items: ${result.stats?.watchlist || 0}
Advisor History: ${result.stats?.history || 0}
Market Reports: ${result.stats?.marketHistory || 0}

Click OK to reload the application.
                      `;
                      alert(msg);
                      window.location.reload();
                  } else {
                      alert(`${t('importFailed')}\n\nReason: ${result.message}`);
                  }
              }
          } catch (err) {
              console.error("File processing error", err);
              alert(`Unexpected error reading file: ${(err as Error).message}`);
          } finally {
              setIsImporting(false);
          }
      }, 100);
    };

    reader.onerror = () => {
        alert("Failed to read file from disk.");
        setIsImporting(false);
    };

    reader.readAsText(file);
  };

  const handleReset = () => {
      if (window.confirm(t('confirmReset'))) {
          resetData();
          alert("Data has been reset. Reloading...");
          window.location.reload();
      }
  };

  const handleForceSave = () => {
    forceSaveData();
    setSaveMsg(t('saveSuccess'));
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const handleRecovery = () => {
    if (window.confirm(t('confirmRecovery'))) {
      const success = attemptRecovery();
      if (success) {
        setRecoverMsg(t('recoverySuccess'));
        setTimeout(() => {
           window.location.reload();
        }, 1000);
      } else {
        setRecoverMsg(t('recoveryFailed'));
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Database size={120} />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
          <Database className="mr-3 text-blue-400" /> {t('dataManagement')}
        </h2>
        <p className="text-slate-400 mb-8 max-w-lg">
          {t('dataDesc')}
        </p>

        <div className="space-y-6">
          
          {/* Diagnostics Panel */}
          <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-700">
             <h3 className="text-white font-bold text-lg mb-4 flex items-center">
               <Server className="mr-2 text-slate-400" size={20}/> {t('diagnostics')}
             </h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="p-3 bg-slate-800 rounded border border-slate-700/50">
                  <div className="text-xs text-slate-500 uppercase">{t('currentStorage')} (Port)</div>
                  <div className={`font-mono font-bold text-lg ${stats.portfolioCount > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {stats.portfolioCount} {t('items')}
                  </div>
               </div>
               <div className="p-3 bg-slate-800 rounded border border-slate-700/50">
                  <div className="text-xs text-slate-500 uppercase">{t('currentStorage')} (Watch)</div>
                  <div className={`font-mono font-bold text-lg ${stats.watchlistCount > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {stats.watchlistCount} {t('items')}
                  </div>
               </div>
               <div className="p-3 bg-slate-800 rounded border border-slate-700/50">
                  <div className="text-xs text-slate-500 uppercase">{t('currentStorage')} (Analysis)</div>
                  <div className={`font-mono font-bold text-lg ${stats.marketHistoryCount > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {stats.marketHistoryCount} {t('items')}
                  </div>
               </div>
               <div className="p-3 bg-slate-800 rounded border border-slate-700/50">
                  <div className="text-xs text-slate-500 uppercase">{t('backupStorage')}</div>
                  <div className={`font-mono font-bold text-lg ${stats.watchlistBackupCount > 0 ? 'text-blue-400' : 'text-slate-600'}`}>
                    {stats.watchlistBackupCount} {t('items')}
                  </div>
               </div>
             </div>
             
             <div className="mt-4 flex justify-end">
                <button 
                  onClick={handleForceSave}
                  className="flex items-center text-xs font-bold bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-4 py-2 rounded transition-colors border border-blue-500/30"
                >
                  <Save size={14} className="mr-2"/> {saveMsg || t('forceSave')}
                </button>
             </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Backup */}
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 flex flex-col justify-between">
              <div className="flex items-start gap-4 mb-4">
                  <div className="bg-blue-900/30 p-3 rounded-lg text-blue-400">
                      <Download size={24} />
                  </div>
                  <div>
                      <h3 className="text-white font-bold text-lg">{t('backupData')}</h3>
                      <p className="text-slate-400 text-sm mt-1">{t('backupDesc')}</p>
                  </div>
              </div>
              <button 
                  onClick={exportData}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center justify-center transition-colors shadow-lg shadow-blue-900/20"
              >
                  <Download size={18} className="mr-2" /> {t('exportBtn')}
              </button>
            </div>

            {/* Restore */}
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 flex flex-col justify-between">
              <div className="flex items-start gap-4 mb-4">
                  <div className="bg-emerald-900/30 p-3 rounded-lg text-emerald-400">
                      <Upload size={24} />
                  </div>
                  <div>
                      <h3 className="text-white font-bold text-lg">{t('restoreData')}</h3>
                      <p className="text-slate-400 text-sm mt-1">{t('restoreDesc')}</p>
                  </div>
              </div>
              <div>
                  <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".json"
                      className="hidden" 
                  />
                  <button 
                      onClick={handleImportClick}
                      disabled={isImporting}
                      className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center justify-center transition-colors shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {isImporting ? <Loader2 className="animate-spin mr-2" /> : <Upload size={18} className="mr-2" />} 
                      {isImporting ? "Reading File..." : t('importBtn')}
                  </button>
              </div>
            </div>
          </div>
          
          {/* Emergency Recovery */}
          <div className="bg-orange-900/20 p-6 rounded-xl border border-orange-700/50 flex flex-col sm:flex-row justify-between items-center gap-4">
             <div className="flex items-start gap-4">
                <div className="bg-orange-900/40 p-3 rounded-lg text-orange-400">
                    <LifeBuoy size={24} />
                </div>
                <div>
                    <h3 className="text-white font-bold text-lg">{t('emergencyRecovery')}</h3>
                    <p className="text-slate-400 text-sm mt-1">{t('emergencyDesc')}</p>
                    {stats.watchlistBackupCount > 0 && <p className="text-emerald-400 text-xs mt-1">Backup found: {stats.watchlistBackupCount} items</p>}
                </div>
             </div>
             <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
               <button 
                  onClick={handleRecovery}
                  disabled={stats.watchlistBackupCount === 0 && stats.portfolioBackupCount === 0}
                  className="w-full sm:w-auto px-6 py-3 bg-orange-700 hover:bg-orange-600 text-white rounded-lg font-bold flex items-center justify-center transition-colors shadow-lg shadow-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  <LifeBuoy size={18} className="mr-2" /> {t('recoverBtn')}
               </button>
               {recoverMsg && <span className="text-xs text-orange-300">{recoverMsg}</span>}
             </div>
          </div>

          {/* Reset */}
           <div className="mt-8 pt-8 border-t border-slate-700">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle size={20} />
                    <span className="font-semibold">{t('dangerZone')}</span>
                </div>
                <button 
                    onClick={handleReset}
                    className="text-sm text-red-400 hover:text-red-300 hover:underline flex items-center"
                >
                    <Trash2 size={14} className="mr-1" /> {t('resetBtn')}
                </button>
              </div>
           </div>

        </div>
      </div>

      <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-2">
         <ShieldCheck size={14} />
         {t('privacyNote')}
      </div>
    </div>
  );
};

export default Settings;
