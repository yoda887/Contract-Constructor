import React from 'react';
import { 
  FileCheck, ShieldCheck, Download, Copy, Printer, FileText, Layers, Plus 
} from 'lucide-react';
import { ContractDocument } from '../../types';
import { exportDocumentToJson, copyDocumentToClipboard, printDocument } from '../../services/exportService';

interface HeaderProps {
  mainMode: 'drafting' | 'qa';
  onModeChange: (mode: 'drafting' | 'qa') => void;
  document: ContractDocument;
  onRunAudit: () => void;
  onOpenNewClauseModal: () => void;
  onOpenTemplateModal: () => void;
  showToast: (msg: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  mainMode,
  onModeChange,
  document,
  onRunAudit,
  onOpenNewClauseModal,
  onOpenTemplateModal,
  showToast
}) => {
  const handleCopy = async () => {
    await copyDocumentToClipboard(document);
    showToast('Полный текст договора скопирован в буфер обмена');
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-sm shrink-0">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        
        {/* APP BRAND & TITLE */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-xl text-white shadow-xs">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-extrabold text-base tracking-tight text-white font-sans">
                Legal Contract Constructor
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 font-mono">
                v2.5 Pro
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
              Конструктор договоров, библиотека клауз и автоматические анкеты (Q&A)
            </p>
          </div>
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

        {/* TOP ACTIONS BUTTONS */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenNewClauseModal}
            className="hidden md:flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
            title="Создать новую клаузу в библиотеке"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>+ Клауза</span>
          </button>

          <button
            onClick={onOpenTemplateModal}
            className="hidden md:flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
            title="Управление образцами договоров"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Шаблоны</span>
          </button>

          <button
            onClick={onRunAudit}
            className="flex items-center space-x-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors"
            title="Запустить юридический аудит документа"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Аудит</span>
          </button>

          <button
            onClick={handleCopy}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
            title="Скопировать текст договора"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={() => exportDocumentToJson(document)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
            title="Скачать JSON проект"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => printDocument()}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
            title="Печать договора"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
