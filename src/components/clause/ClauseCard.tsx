import React, { useState, useRef, useEffect } from 'react';
import { Trash2, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine, Edit3, MoreHorizontal, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Clause } from '../../types';
import { isPartyRoleVariable } from '../../utils/variableResolver';

interface ClauseCardProps {
  clause: Clause;
  inDocument: boolean;
  selectedClause?: Clause | null;
  selectedClauseNumber?: number | null;
  hasClauses?: boolean;
  onToggleAdd: (clause: Clause, position?: 'above' | 'below' | 'start' | 'end', relativeToClauseId?: string) => void;
  onEdit: (clause: Clause) => void;
  onDelete: (clauseId: string) => void;
}

export const ClauseCard: React.FC<ClauseCardProps> = ({
  clause,
  inDocument,
  selectedClause,
  selectedClauseNumber,
  hasClauses,
  onToggleAdd,
  onEdit,
  onDelete
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  // Helper to render text with yellow highlighted bracket variables [Variable] for metrics,
  // and subtle slate badges for structural party role variables.
  const renderHighlightedContent = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');

    const processLineText = (str: string) => {
      const parts = str.split(/(\[[^\]]+\])/g);
      return parts.map((part, idx) => {
        if (!part) return null;
        if (part.startsWith('[') && part.endsWith(']')) {
          const varKey = part.slice(1, -1);
          if (isPartyRoleVariable(varKey)) {
            return (
              <span key={`role-${idx}`} className="font-medium text-slate-700 bg-slate-100 px-1 rounded border border-slate-200">
                {part}
              </span>
            );
          }
          return (
            <span key={`var-${idx}`} className="var-highlight">
              {part}
            </span>
          );
        }
        return <span key={`txt-${idx}`}>{part}</span>;
      });
    };

    let subItemIndex = 0;

    return (
      <div className="space-y-1">
        {lines.map((rawLine, idx) => {
          if (!rawLine.trim()) return null;

          let tabCount = 0;
          let cleanLine = rawLine;
          while (cleanLine.startsWith('\t')) {
            tabCount++;
            cleanLine = cleanLine.substring(1);
          }
          if (tabCount === 0 && cleanLine.startsWith('    ')) {
            tabCount = 1;
            cleanLine = cleanLine.substring(4);
          } else if (tabCount === 0 && cleanLine.startsWith('  ')) {
            tabCount = 1;
            cleanLine = cleanLine.substring(2);
          }

          cleanLine = cleanLine.trimStart();

          const hasPrefix = /^([0-9a-zA-Zа-яА-Я]+\s*[\.\)]|[\-—•])/.test(cleanLine);
          let autoSubPrefix = '';
          if (tabCount > 0 && !hasPrefix) {
            subItemIndex++;
            autoSubPrefix = `${subItemIndex}) `;
          }

          return (
            <div
              key={idx}
              className="text-xs text-slate-800 leading-relaxed"
              style={{
                paddingLeft: tabCount > 0 ? `${tabCount * 16}px` : undefined,
              }}
            >
              {autoSubPrefix && <span className="font-bold text-slate-500 mr-1">{autoSubPrefix}</span>}
              {processLineText(cleanLine)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`clause-card ${inDocument ? 'added-clause ring-1 ring-blue-400/50' : ''}`}
      id={`clause-${clause.id}`}
      data-favorite={clause.isFavorite ? '1' : '0'}
    >
      {/* Кнопка с плюсиком слева сверху для добавления клаузы в документ */}
      <div className="absolute top-0 left-0 z-20" ref={popoverRef}>
        <button
          type="button"
          aria-label="Добавить в шаблон договора"
          title="Добавить в шаблон договора"
          className="action-button add-button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (hasClauses || selectedClause) {
              setShowPopover(!showPopover);
            } else {
              onToggleAdd(clause, 'end');
            }
          }}
        >
          <Plus className="w-3 h-3 text-white stroke-[2.5]" />
        </button>

        {/* Popover choice menu when document has clauses */}
        <AnimatePresence>
          {showPopover && (hasClauses || selectedClause) && (
            <motion.div
              key="clause-popover"
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute top-4 left-0 z-50 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 text-xs text-slate-800 font-sans"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedClause ? (
                <>
                  <div className="px-2 py-1 bg-blue-50/80 rounded-lg border border-blue-100 mb-1">
                    <div className="text-[10px] font-bold text-blue-900 truncate">
                      {selectedClauseNumber ? `Выделен пункт № ${selectedClauseNumber}` : 'Выделен пункт'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPopover(false);
                      onToggleAdd(clause, 'above', selectedClause.id);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2 font-medium cursor-pointer transition-colors text-xs"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Выше пункта № {selectedClauseNumber || ''}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPopover(false);
                      onToggleAdd(clause, 'below', selectedClause.id);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2 font-medium cursor-pointer transition-colors text-xs"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Ниже пункта № {selectedClauseNumber || ''}</span>
                  </button>

                  <div className="h-px bg-slate-100 my-1" />
                </>
              ) : (
                <div className="px-2 py-1 bg-slate-50 rounded-lg border border-slate-200 mb-1">
                  <div className="text-[10px] font-bold text-slate-600 truncate">
                    Выберите позицию в договоре
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPopover(false);
                  onToggleAdd(clause, 'start');
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 flex items-center space-x-2 font-medium cursor-pointer transition-colors text-xs"
              >
                <ArrowUpToLine className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>В начало договора</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPopover(false);
                  onToggleAdd(clause, 'end');
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 flex items-center space-x-2 font-medium cursor-pointer transition-colors text-xs"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>В конец договора</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Блок с системным именем и кнопкой опций */}
      <div className="clause-header-bar flex items-center justify-between gap-2 px-3.5 py-2">
        <span className="clause-name font-bold text-xs text-blue-900 truncate pl-3.5">
          {clause.name}
        </span>
        <button
          type="button"
          title="Опции и свойства пункта"
          aria-label="Опции"
          className="p-1 text-slate-600 hover:text-slate-900 hover:bg-blue-200/60 rounded-md border border-blue-200 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit(clause);
          }}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Блок с заголовком пункта и самим текстом */}
      <div className="clause-body p-3.5">
        <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-slate-100">
          <h4 className="clause-title text-xs font-bold text-slate-900 leading-snug">
            {clause.titleRu || clause.name}
          </h4>
          <button
            type="button"
            title="Редактировать текст пункта"
            aria-label="Редактировать"
            className="p-1 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-md border border-slate-200/80 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(clause);
            }}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Блок с самим текстом пункта */}
        <div className="clause-content">
          <div className="clause-content-list-indent">
            {renderHighlightedContent(clause.contentRu)}
          </div>
        </div>

        {/* Delete action row */}
        <div className="flex items-center justify-end text-[11px] pt-2.5 mt-2.5 border-t border-slate-100 font-ui-sans">
          <button
            type="button"
            onClick={() => onDelete(clause.id)}
            className="text-slate-400 hover:text-rose-600 font-semibold transition-colors flex items-center space-x-1 p-1 rounded-md hover:bg-rose-50 cursor-pointer"
            title="Удалить пункт из библиотеки"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Удалить</span>
          </button>
        </div>

      </div>
    </div>
  );
};
