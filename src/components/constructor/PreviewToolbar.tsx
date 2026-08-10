import React from 'react';
import { LayoutTemplate, Trash2, FileEdit, Sparkles } from 'lucide-react';
import { SampleTemplate, ContractDocument } from '../../types';

interface PreviewToolbarProps {
  document: ContractDocument;
  onUpdateDocumentSettings: (updater: (prev: ContractDocument) => ContractDocument) => void;
  templates: SampleTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  onDeleteTemplate?: (templateId: string) => void;
  onOpenPreambleModal?: () => void;
}

export const PreviewToolbar: React.FC<PreviewToolbarProps> = ({
  document,
  onUpdateDocumentSettings,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onDeleteTemplate,
  onOpenPreambleModal
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
      {/* TEMPLATE SELECTOR */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
          <LayoutTemplate className="w-4 h-4 text-blue-600" />
          <span>Образец договора:</span>
        </div>
        <select
          value={selectedTemplateId}
          onChange={(e) => onSelectTemplate(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {templates.map(tpl => (
            <option key={tpl.id} value={tpl.id}>
              {tpl.name} ({tpl.category})
            </option>
          ))}
        </select>

        {onDeleteTemplate && selectedTemplateId && templates.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDeleteTemplate(selectedTemplateId);
            }}
            title="Удалить выбранный шаблон"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200 bg-slate-50 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* RIGHT SIDE: PREAMBLE MODAL & TOGGLES */}
      <div className="flex items-center space-x-3 text-xs font-semibold text-slate-600">
        
        {onOpenPreambleModal && (
          <button
            type="button"
            onClick={onOpenPreambleModal}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <FileEdit className="w-3.5 h-3.5 text-blue-600" />
            <span>Переменные и Преамбула</span>
          </button>
        )}

        <label className="flex items-center space-x-2 cursor-pointer hover:text-slate-900 transition-colors select-none">
          <input
            type="checkbox"
            checked={document.includeTitleInClause}
            onChange={(e) => onUpdateDocumentSettings(prev => ({ ...prev, includeTitleInClause: e.target.checked }))}
            className="rounded text-blue-600 focus:ring-blue-500/20 w-4 h-4 cursor-pointer"
          />
          <span>Заголовки пунктов</span>
        </label>

        <label className="flex items-center space-x-2 cursor-pointer hover:text-slate-900 transition-colors select-none">
          <input
            type="checkbox"
            checked={document.bilingual}
            onChange={(e) => onUpdateDocumentSettings(prev => ({ ...prev, bilingual: e.target.checked }))}
            className="rounded text-blue-600 focus:ring-blue-500/20 w-4 h-4 cursor-pointer"
          />
          <span>Двуязычный (RU/EN)</span>
        </label>
      </div>
    </div>
  );
};

