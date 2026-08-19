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
    <div className="space-y-1.5 font-ui-sans">
      {/* TITLE BAR ABOVE TOOLBAR (MS WORD TITLE STYLE) */}
      <div className="flex items-center justify-between py-1.5 px-3.5 bg-slate-200/80 border border-slate-300/80 rounded-t-xl shadow-2xs text-xs">
        <span className="font-bold text-slate-800 tracking-wide truncate max-w-sm flex items-center gap-1.5">
          <span className="text-blue-600">📄</span>
          <span>{templateTitle}</span>
        </span>
        <span className="text-[11px] text-slate-600 font-semibold px-2 py-0.5 bg-white/70 rounded-full border border-slate-300/60 shadow-2xs whitespace-nowrap">
          {document.clauses.length} {document.clauses.length === 1 ? 'пункт' : document.clauses.length > 1 && document.clauses.length < 5 ? 'пункта' : 'пунктов'}
        </span>
      </div>

      {/* TOOLBAR */}
      <div className="bg-slate-100/90 border border-slate-200/90 rounded-b-xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-2xs text-xs">
        
        {/* GROUP 1: TEMPLATE OPERATIONS */}
        <div className="flex items-center space-x-1 bg-white border border-slate-200/90 rounded-lg p-1 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 select-none whitespace-nowrap">
            Шаблон:
          </span>
          {onOpenTemplateModal && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenTemplateModal('select');
              }}
              title="Выбрать и открыть шаблон"
              className="px-2 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 rounded-md transition-all cursor-pointer flex items-center space-x-1 font-semibold whitespace-nowrap"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Открыть</span>
            </button>
          )}

          {onOpenTemplateModal && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenTemplateModal('create');
              }}
              title="Создать новый шаблон"
              className="px-2 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 rounded-md transition-all cursor-pointer flex items-center space-x-1 font-semibold whitespace-nowrap"
            >
              <FolderPlus className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Новый</span>
            </button>
          )}

          {onSaveTemplate && selectedTemplateId && templates.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSaveTemplate();
              }}
              title="Сохранить изменения в базы шаблонов"
              className="px-2 py-1 text-blue-700 hover:text-blue-900 hover:bg-blue-50 active:bg-blue-100 rounded-md transition-all cursor-pointer flex items-center space-x-1 font-bold whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5 text-blue-600" />
              <span>Сохранить</span>
            </button>
          )}

          {onDeleteTemplate && selectedTemplateId && templates.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeleteTemplate(selectedTemplateId);
              }}
              title="Удалить выбранный шаблон"
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* GROUP 2: CLAUSE ADDITION & OPTIONS */}
        <div className="flex items-center space-x-2.5 flex-wrap">
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
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-2xs hover:shadow-xs transition-all whitespace-nowrap"
                title="Создать новый пункт договора"
              >
                <Plus className="w-4 h-4 text-white stroke-[2.5]" />
                <span>Создать пункт</span>
                {(hasClauses || selectedClause) && <ChevronDown className="w-3 h-3 ml-0.5 text-blue-200 shrink-0" />}
              </button>

              <AnimatePresence>
                {showPopover && (hasClauses || selectedClause) && (
                  <motion.div
                    key="preview-toolbar-popover"
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-full left-0 mt-1 z-50 w-56 bg-white rounded-xl shadow-xl border border-slate-200/90 p-1.5 text-xs text-slate-800 font-ui-sans"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {selectedClause ? (
                      <>
                        <div className="px-2.5 py-1.5 bg-blue-50/90 rounded-lg border border-blue-100 mb-1">
                          <div className="text-[10px] font-bold text-blue-900 truncate">
                            {selectedClauseNumber ? `Выделен пункт № ${selectedClauseNumber}` : 'Выделен пункт'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setShowPopover(false);
                            onAddClause('above', selectedClause.id);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2 font-medium cursor-pointer transition-colors text-xs whitespace-nowrap"
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
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2 font-medium cursor-pointer transition-colors text-xs whitespace-nowrap"
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Ниже пункта № {selectedClauseNumber || ''}</span>
                        </button>

                        <div className="h-px bg-slate-100 my-1" />
                      </>
                    ) : (
                      <div className="px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 mb-1">
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

          <div className="flex items-center space-x-2 text-xs font-medium text-slate-700">
            <label className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-900 transition-colors select-none">
              <input
                type="checkbox"
                checked={document.includeTitleInClause}
                onChange={(e) => onUpdateDocumentSettings(prev => ({ ...prev, includeTitleInClause: e.target.checked }))}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5 cursor-pointer"
              />
              <span>Заголовки</span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-900 transition-colors select-none">
              <input
                type="checkbox"
                checked={document.bilingual}
                onChange={(e) => onUpdateDocumentSettings(prev => ({ ...prev, bilingual: e.target.checked }))}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5 cursor-pointer"
              />
              <span>RU/EN</span>
            </label>
          </div>
        </div>

        {/* GROUP 3: EXPORT & ACTIONS */}
        <div className="flex items-center space-x-2 flex-wrap">
          {/* WORD GROUP */}
          <div className="flex items-center bg-white border border-slate-200/90 rounded-lg p-1 shadow-2xs">
            {onOpenDocxImportModal && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenDocxImportModal();
                }}
                title="Импорт договора из Word (.docx)"
                className="px-2.5 py-1 text-slate-700 hover:text-blue-700 hover:bg-slate-100 rounded-md transition-all cursor-pointer flex items-center space-x-1.5 font-semibold text-xs whitespace-nowrap"
              >
                <FileUp className="w-3.5 h-3.5 text-slate-600" />
                <span>Импорт</span>
              </button>
            )}

            <div className="h-3.5 w-px bg-slate-200 mx-1" />

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
              className="px-2.5 py-1 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-all cursor-pointer flex items-center space-x-1.5 font-bold text-xs whitespace-nowrap shadow-2xs"
              title="Экспорт договора в Word (.docx)"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-600" />
              <span>Word .docx</span>
            </button>
          </div>

          {/* UTILITY ACTIONS */}
          <div className="flex items-center space-x-0.5 bg-white border border-slate-200/90 rounded-lg p-1 shadow-2xs">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all cursor-pointer"
              title="Скопировать текст договора"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => exportDocumentToJson(document)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all cursor-pointer"
              title="Скачать JSON проект"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => printDocument()}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all cursor-pointer"
              title="Печать договора"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};


