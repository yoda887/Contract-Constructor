import React, { useState, useRef, useEffect } from 'react';
import { LayoutTemplate, Trash2, FileEdit, Plus, Copy, Download, Printer, ChevronDown, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine, Save, FolderOpen, FolderPlus, FileDown, FileUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SampleTemplate, ContractDocument, Clause } from '../../types';
import { exportDocumentToJson, exportDocumentToDocx, copyDocumentToClipboard, printDocument } from '../../services/exportService';

interface PreviewToolbarProps {
  document: ContractDocument;
  onUpdateDocumentSettings: (updater: (prev: ContractDocument) => ContractDocument) => void;
  templates: SampleTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  onSaveTemplate?: () => void;
  onDeleteTemplate?: (templateId: string) => void;
  onOpenTemplateModal?: (mode?: 'select' | 'create') => void;
  onOpenDocxImportModal?: () => void;
  onAddClause?: (position?: 'above' | 'below' | 'start' | 'end', relativeToClauseId?: string) => void;
  selectedClause?: Clause | null;
  selectedClauseNumber?: number | null;
  showToast?: (msg: string) => void;
}

export const PreviewToolbar: React.FC<PreviewToolbarProps> = ({
  document,
  onUpdateDocumentSettings,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  onOpenTemplateModal,
  onOpenDocxImportModal,
  onAddClause,
  selectedClause,
  selectedClauseNumber,
  showToast
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const hasClauses = document.clauses.length > 0;

  useEffect(() => {
    if (!showPopover) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    window.document.addEventListener('mousedown', handleClickOutside);
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, [showPopover]);
  const handleCopy = async () => {
    await copyDocumentToClipboard(document);
    if (showToast) {
      showToast('Полный текст договора скопирован в буфер обмена');
    }
  };

  const activeTemplate = templates.find(t => t.id === selectedTemplateId);
  const templateTitle = activeTemplate ? activeTemplate.name : (document.title || 'Договор');

  return (
    <div className="space-y-1">
      {/* TITLE BAR ABOVE TOOLBAR (MS WORD TITLE STYLE) */}
      <div className="flex items-center justify-center py-1 px-3 bg-slate-200/80 border border-slate-300 rounded-t-lg shadow-2xs">
        <span className="text-xs font-semibold text-slate-800 tracking-wide truncate max-w-md text-center">
          {templateTitle}
        </span>
      </div>

      {/* TOOLBAR */}
      <div className="bg-slate-100/90 border border-slate-200 rounded-b-lg p-1.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs text-xs">
        {/* TEMPLATE ACTIONS (ICON ONLY) */}
        <div className="flex items-center space-x-1 flex-wrap">
          {/* Icon button: Загрузить шаблон */}
          {onOpenTemplateModal && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenTemplateModal('select');
              }}
              title="Выбрать и открыть шаблон"
              className="p-1.5 text-slate-700 hover:text-amber-800 hover:bg-slate-200/80 active:bg-slate-300/80 rounded border border-transparent hover:border-slate-300/70 transition-all cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-amber-600" />
            </button>
          )}

          {/* Icon button: Создать новый шаблон */}
          {onOpenTemplateModal && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenTemplateModal('create');
              }}
              title="Создать новый шаблон"
              className="p-1.5 text-slate-700 hover:text-emerald-800 hover:bg-slate-200/80 active:bg-slate-300/80 rounded border border-transparent hover:border-slate-300/70 transition-all cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-emerald-600" />
            </button>
          )}

          {/* Icon button: Сохранить шаблон */}
          {onSaveTemplate && selectedTemplateId && templates.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSaveTemplate();
              }}
              title="Сохранить изменения в шаблон"
              className="p-1.5 text-slate-700 hover:text-blue-800 hover:bg-slate-200/80 active:bg-slate-300/80 rounded border border-transparent hover:border-slate-300/70 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-blue-600" />
            </button>
          )}

          {/* Icon button: Удалить шаблон */}
          {onDeleteTemplate && selectedTemplateId && templates.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeleteTemplate(selectedTemplateId);
              }}
              title="Удалить выбранный шаблон"
              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 active:bg-red-100 rounded border border-transparent hover:border-red-200 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

      {/* RIGHT SIDE: DOCUMENT ACTIONS (MS WORD STYLE) */}
      <div className="flex items-center space-x-2 text-xs font-medium text-slate-700 flex-wrap">
        
        {onAddClause && (
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (hasClauses || selectedClause) {
                  setShowPopover(!showPopover);
                } else {
                  onAddClause('end');
                }
              }}
              className="bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-medium px-2.5 py-1 rounded border border-slate-300 flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-colors"
              title="Создать новый пункт договора"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Создать пункт</span>
              {(hasClauses || selectedClause) && <ChevronDown className="w-3 h-3 ml-0.5 text-slate-500 shrink-0" />}
            </button>

            <AnimatePresence>
              {showPopover && (hasClauses || selectedClause) && (
                <motion.div
                  key="preview-toolbar-popover"
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full left-0 mt-1 z-50 w-56 bg-white rounded-md shadow-lg border border-slate-200 p-1 text-xs text-slate-800 font-sans"
                  onClick={(e) => e.stopPropagation()}
                >
                  {selectedClause ? (
                    <>
                      <div className="px-2 py-1 bg-slate-100 rounded border border-slate-200 mb-1">
                        <div className="text-[10px] font-bold text-slate-700 truncate">
                          {selectedClauseNumber ? `Выделен пункт № ${selectedClauseNumber}` : 'Выделен пункт'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowPopover(false);
                          onAddClause('above', selectedClause.id);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2 font-medium cursor-pointer transition-colors text-xs"
                      >
                        <ArrowUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Выше пункта № {selectedClauseNumber || ''}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowPopover(false);
                          onAddClause('below', selectedClause.id);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2 font-medium cursor-pointer transition-colors text-xs"
                      >
                        <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Ниже пункта № {selectedClauseNumber || ''}</span>
                      </button>

                      <div className="h-px bg-slate-200 my-1" />
                    </>
                  ) : (
                    <div className="px-2 py-1 bg-slate-50 rounded border border-slate-200 mb-1">
                      <div className="text-[10px] font-bold text-slate-600 truncate">
                        Выберите позицию в договоре
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowPopover(false);
                      onAddClause('start');
                    }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 hover:text-slate-900 flex items-center space-x-2 font-medium cursor-pointer transition-colors text-xs"
                  >
                    <ArrowUpToLine className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>В начало договора</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPopover(false);
                      onAddClause('end');
                    }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 hover:text-slate-900 flex items-center space-x-2 font-medium cursor-pointer transition-colors text-xs"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>В конец договора</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}



        <label className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-900 transition-colors select-none text-xs font-medium">
          <input
            type="checkbox"
            checked={document.includeTitleInClause}
            onChange={(e) => onUpdateDocumentSettings(prev => ({ ...prev, includeTitleInClause: e.target.checked }))}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5 cursor-pointer"
          />
          <span>Заголовки</span>
        </label>

        <label className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-900 transition-colors select-none text-xs font-medium">
          <input
            type="checkbox"
            checked={document.bilingual}
            onChange={(e) => onUpdateDocumentSettings(prev => ({ ...prev, bilingual: e.target.checked }))}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5 cursor-pointer"
          />
          <span>RU/EN</span>
        </label>

        {/* Separator */}
        <div className="h-4 w-px bg-slate-300/80 mx-0.5" />

        {/* WORD (DOCX) ACTIONS GROUP */}
        <div className="flex items-center bg-blue-50/90 border border-blue-200/90 rounded p-0.5 shadow-2xs">
          {onOpenDocxImportModal && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenDocxImportModal();
              }}
              title="Импорт договора из Word (.docx) в шаблон"
              className="px-2 py-1 text-blue-700 hover:text-blue-950 hover:bg-blue-100/90 active:bg-blue-200/90 rounded transition-all cursor-pointer flex items-center space-x-1 font-semibold text-[11px]"
            >
              <FileUp className="w-3.5 h-3.5 text-blue-600" />
              <span>Импорт Word</span>
            </button>
          )}

          <div className="h-3.5 w-px bg-blue-200 mx-0.5" />

          <button
            type="button"
            onClick={async () => {
              try {
                await exportDocumentToDocx(document);
                if (showToast) showToast('Файл .docx успешно сгенерирован');
              } catch (e) {
                console.error('DOCX Export error:', e);
                if (showToast) showToast('Ошибка при экспорте в .docx');
              }
            }}
            className="px-2 py-1 text-blue-700 hover:text-blue-950 hover:bg-blue-100/90 active:bg-blue-200/90 rounded transition-all cursor-pointer flex items-center space-x-1 font-semibold text-[11px]"
            title="Экспорт договора в Word (.docx)"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-600" />
            <span>Экспорт Word</span>
          </button>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-slate-300/80 mx-0.5" />

        <div className="flex items-center space-x-0.5">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-slate-700 hover:text-blue-700 hover:bg-slate-200/80 active:bg-slate-300/80 rounded border border-transparent hover:border-slate-300/70 transition-all cursor-pointer"
            title="Скопировать текст договора"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => exportDocumentToJson(document)}
            className="p-1.5 text-slate-700 hover:text-blue-700 hover:bg-slate-200/80 active:bg-slate-300/80 rounded border border-transparent hover:border-slate-300/70 transition-all cursor-pointer"
            title="Скачать JSON проект"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => printDocument()}
            className="p-1.5 text-slate-700 hover:text-blue-700 hover:bg-slate-200/80 active:bg-slate-300/80 rounded border border-transparent hover:border-slate-300/70 transition-all cursor-pointer"
            title="Печать договора"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
);
};

