import React from 'react';
import { FileText, Layers, CloudCheck, Maximize2, Minimize2 } from 'lucide-react';
import { ContractDocument } from '../../types';

interface HeaderProps {
  mainMode: 'drafting' | 'qa';
  onModeChange: (mode: 'drafting' | 'qa') => void;
  document: ContractDocument;
  onRunAudit?: () => void;
  onOpenNewClauseModal?: () => void;
  onOpenTemplateModal?: () => void;
  showToast?: (msg: string) => void;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mainMode,
  onModeChange,
  isZenMode = false,
  onToggleZenMode
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-sm shrink-0 font-ui-sans">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        
        {/* APP BRAND & TITLE */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              Конструктор Договоров
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 font-mono">
              v2.5 Pro
            </span>
          </div>

          {/* CLOUD AUTOSAVE STATUS INDICATOR */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700/80 text-[11px] font-medium text-slate-300 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-200">Сохранено в облаке</span>
          </div>
        </div>

        {/* MAIN MODE SWITCHER (КОНСТРУКТОР vs Q&A АНКЕТА) */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700/80">
          <button
            type="button"
            onClick={() => onModeChange('drafting')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              mainMode === 'drafting'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Конструктор шаблонов</span>
          </button>
          
          <button
            type="button"
            onClick={() => onModeChange('qa')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              mainMode === 'qa'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>2. Q&A Анкета договора</span>
          </button>
        </div>

        {/* ZEN MODE TOGGLE BUTTON */}
        {onToggleZenMode && (
          <button
            type="button"
            onClick={onToggleZenMode}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer border ${
              isZenMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border-slate-700'
            }`}
            title={isZenMode ? "Выйти из режима фокуса (Zen Mode)" : "Развернуть лист договора на весь экран (Zen Mode)"}
          >
            {isZenMode ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Обычный режим</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-300" />
                <span className="hidden md:inline">Zen Mode</span>
              </>
            )}
          </button>
        )}

      </div>
    </header>
  );
};

