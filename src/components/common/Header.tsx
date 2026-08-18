import React from 'react';
import { FileText, Layers } from 'lucide-react';
import { ContractDocument } from '../../types';

interface HeaderProps {
  mainMode: 'drafting' | 'qa';
  onModeChange: (mode: 'drafting' | 'qa') => void;
  document: ContractDocument;
  onRunAudit: () => void;
  onOpenNewClauseModal?: () => void;
  onOpenTemplateModal?: () => void;
  showToast: (msg: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  mainMode,
  onModeChange,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-sm shrink-0">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        
        {/* APP BRAND & TITLE */}
        <div className="flex items-center space-x-3">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 font-mono">
            v2.5 Pro
          </span>
        </div>

        {/* MAIN MODE SWITCHER (КОНСТРУКТОР vs Q&A АНКЕТА) */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700/80">
          <button
            onClick={() => onModeChange('drafting')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              mainMode === 'drafting'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Конструктор шаблонов</span>
          </button>
          
          <button
            onClick={() => onModeChange('qa')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              mainMode === 'qa'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>2. Q&A Анкета договора</span>
          </button>
        </div>

      </div>
    </header>
  );
};
