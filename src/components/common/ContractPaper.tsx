import React, { useState } from 'react';
import { 
  ChevronUp, ChevronDown, Trash2, Edit3, Indent, Outdent, Type, GripVertical, AlertCircle, Link2, Unlink, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ContractDocument, Clause } from '../../types';
import { HighlightedClauseText } from '../common/HighlightedClauseText';
import { EditableVariableSpan } from '../common/EditableVariableSpan';
import { getHierarchicalNumber, isClauseTitleVisible, getClauseTitle } from '../../utils/numbering';
import { getExpandedRenderedClauses } from '../../utils/variableResolver';

interface ContractPaperProps {
  document: ContractDocument;
  readOnly?: boolean;
  selectedClauseId?: string | null;
  onSelectClause?: (clauseId: string | null) => void;
  onReorder?: (index: number, direction: 'up' | 'down') => void;
  onMoveClause?: (fromIndex: number, toIndex: number) => void;
  onChangeLevel?: (clauseId: string, delta: number) => void;
  onToggleTitle?: (clauseId: string) => void;
  onRemove?: (clauseId: string) => void;
  onEditClause?: (clause: Clause) => void;
  onVariableChange?: (varKey: string, newValue: string) => void;
  onAddClauseAbove?: (clauseId: string) => void;
  onAddClauseBelow?: (clauseId: string) => void;
  onOpenLibraryForClause?: (clauseId: string, position: 'above' | 'below') => void;
  onConvertClauseToAdHoc?: (clauseId: string) => void;
}

export const ContractPaper: React.FC<ContractPaperProps> = ({
  document,
  readOnly = false,
  selectedClauseId,
  onSelectClause,
  onReorder,
  onMoveClause,
  onChangeLevel,
  onToggleTitle,
  onRemove,
  onEditClause,
  onVariableChange,
  onAddClauseAbove,
  onAddClauseBelow,
  onOpenLibraryForClause,
  onConvertClauseToAdHoc
}) => {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const expandedItems = getExpandedRenderedClauses(document);
  const clausesForNumbering = expandedItems.map(item => {
    const cl = { ...item.clause };
    if (item.totalInstances > 1) {
      cl.id = `${item.clause.id}-repeat-${item.instanceIndex}`;
      cl.titleRu = `${item.clause.titleRu} (${item.instanceIndex + 1})`;
      if (cl.titleEn) cl.titleEn = `${item.clause.titleEn} (${item.instanceIndex + 1})`;
    }
    return cl;
  });

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (readOnly) return;
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (readOnly) return;
    e.preventDefault();
    if (draggedIdx === index) return;
    setDragOverIdx(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    if (readOnly) return;
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) return;
    if (onMoveClause) {
      onMoveClause(draggedIdx, targetIndex);
    } else if (onReorder) {
      const direction = targetIndex < draggedIdx ? 'up' : 'down';
      onReorder(draggedIdx, direction);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-10 min-h-[850px] font-serif text-slate-900 text-sm leading-relaxed space-y-6">
      
      {/* HEADER */}
      {document.printTitle !== false && (
        <div className="text-center space-y-2 border-b border-slate-200 pb-6 font-sans">
          <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">
            {document.title}
          </h2>
          <div className="flex justify-between items-center text-xs text-slate-500 font-semibold pt-2">
            <span>
              <EditableVariableSpan
                varKey="Город"
                value={document.city || 'Город'}
                onVariableChange={onVariableChange}
              />
            </span>
            <span>
              <EditableVariableSpan
                varKey="Дата договора"
                value={document.date || 'Дата'}
                onVariableChange={onVariableChange}
              />
            </span>
          </div>
        </div>
      )}

      {/* PREAMBLE (Only if showSystemPreamble is true) */}
      {document.showSystemPreamble === true && (
        <div className="text-justify text-xs leading-relaxed text-slate-800 font-sans border-b border-slate-100 pb-4">
          <p>
            <strong className="font-bold text-slate-900">{document.partyA.name}</strong> ({document.partyA.role}), в лице{' '}
            <EditableVariableSpan
              varKey="директор стороны а (род. падеж)"
              value={document.partyA.directorGenitive || document.partyA.director}
              onVariableChange={onVariableChange}
            />
            , действующего на основании Устава, с одной стороны, и{' '}
            <strong className="font-bold text-slate-900">{document.partyB.name}</strong> ({document.partyB.role}), в лице{' '}
            <EditableVariableSpan
              varKey="директор стороны б (род. падеж)"
              value={document.partyB.directorGenitive || document.partyB.director}
              onVariableChange={onVariableChange}
            />
            , с другой стороны, заключили настоящий Договор о нижеследующем:
          </p>
        </div>
      )}

      {/* CLAUSES LIST WITH UNIFORM MARGINS & HORIZONTAL DIVIDERS */}
      <div className="pt-2 font-sans divide-y divide-slate-200/70">
        {expandedItems.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
            <p className="text-slate-500 font-medium">В договоре нет пунктов (или все пункты скрыты по условиям активации).</p>
          </div>
        ) : (
          <div className="space-y-1">
            <AnimatePresence initial={false}>
              {expandedItems.map((item, idx) => {
                const clause = item.clause;
                const rawNum = getHierarchicalNumber(clausesForNumbering, idx, document.includeTitleInClause);
                const num = (document.includeNumbering !== false && !clause.formatAsTitle) ? rawNum : '';
                const clauseLevel = clause.level || 0;
                const isFormatAsTitle = clause.formatAsTitle;
                const isTitleVisible = isClauseTitleVisible(clause, document.includeTitleInClause) && !isFormatAsTitle;
                const title = isFormatAsTitle ? '' : getClauseTitle(clause, document.includeTitleInClause);
                const isSelected = !readOnly && selectedClauseId === clause.id;

                const isDragging = !readOnly && draggedIdx === idx;
                const isOver = !readOnly && dragOverIdx === idx;
                const isOverAbove = isOver && draggedIdx !== null && idx < draggedIdx;
                const isOverBelow = isOver && draggedIdx !== null && idx > draggedIdx;

                // Overwrite the variables for this specific repeated instance
                const tempDoc: ContractDocument = {
                  ...document,
                  customVariables: {
                    ...document.customVariables,
                    ...(clause.repeatClauseField ? {
                      [clause.repeatClauseField.replace(/^#/, '').replace(/^\[/, '').replace(/\]$/, '')]: document.repeatingLists?.[clause.repeatClauseField]?.[item.instanceIndex] || '',
                      [clause.repeatClauseField]: document.repeatingLists?.[clause.repeatClauseField]?.[item.instanceIndex] || ''
                    } : {})
                  }
                };

                return (
                  <motion.div
                    key={`${clause.id}-inst-${item.instanceIndex}`}
                    layout={!isDragging ? 'position' : false}
                    initial={{ opacity: 0, height: 0, y: -6, backgroundColor: '#dbeafe' }}
                    animate={{ 
                      opacity: 1, 
                      height: 'auto', 
                      y: 0, 
                      backgroundColor: isSelected ? 'rgba(239, 246, 255, 0.9)' : 'rgba(255, 255, 255, 0)' 
                    }}
                    exit={{ opacity: 0, height: 0, scale: 0.97, overflow: 'hidden' }}
                    transition={{
                      opacity: { duration: 0.2 },
                      height: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                      y: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
                      backgroundColor: { duration: 0.8, ease: 'easeOut' },
                      layout: { type: 'spring', stiffness: 500, damping: 42 }
                    }}
                    draggable={!readOnly}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    style={{ paddingLeft: clauseLevel > 0 ? `${clauseLevel * 16}px` : undefined }}
                    onClick={() => {
                      if (!readOnly && onSelectClause) {
                        onSelectClause(isSelected ? null : clause.id);
                      }
                    }}
                    className={`group relative py-3.5 px-3 -mx-3 rounded-lg transition-colors ${
                      !readOnly ? 'cursor-pointer' : ''
                    } ${
                      isSelected
                        ? 'border-l-2 border-l-blue-600 shadow-2xs'
                        : !readOnly ? 'hover:bg-slate-50/70' : ''
                    } ${isDragging ? 'opacity-25 bg-slate-100 border border-dashed border-slate-300' : ''}`}
                  >
                    {/* DROP LINE INDICATOR ABOVE */}
                    {isOverAbove && (
                      <div className="relative mb-2 transition-all">
                        <div className="h-1 bg-blue-600 rounded-full shadow-sm animate-pulse" />
                        <div className="absolute -left-1.5 -top-[3px] w-2.5 h-2.5 bg-blue-600 rounded-full" />
                      </div>
                    )}

                    {/* CLAUSE CONTENT AREA */}
                    <div className="space-y-1 relative pl-5 -ml-5">
                      {/* Draggable grip handle */}
                      {!readOnly && (
                        <div 
                          className="absolute left-0 top-0.5 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-200/60"
                          title="Зажмите и перетащите для изменения порядка пунктов"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {/* Origin and repeats visual metadata tag indicators */}
                      {!readOnly && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 select-none pb-1 font-sans">
                          {Boolean(clause.isAdHoc || clause.id?.startsWith('adhoc-') || clause.isLinkedToLibrary === false) ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs bg-amber-50 text-amber-800 font-semibold border border-amber-200" title="Автономный пункт (Ad-hoc) — редактируется свободно прямо в шаблоне">
                              ✏️ Ad-hoc
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-xs bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-900 font-bold border border-blue-200 cursor-pointer transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                onConvertClauseToAdHoc && onConvertClauseToAdHoc(clause.id);
                              }}
                              title="Связана с библиотекой (автообновление). Прямое редактирование в шаблоне заблокировано. Нажмите, чтобы отвязать и сделать Ad-hoc."
                            >
                              <Link2 className="w-3 h-3 text-blue-600 inline" />
                              <span>🔗 Связана с библиотекой</span>
                            </span>
                          )}
                          {item.totalInstances > 1 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs bg-green-50 text-green-700 font-semibold border border-green-100">
                              🔄 Повтор ({item.instanceIndex + 1}/{item.totalInstances})
                            </span>
                          )}
                          {clause.formatAsTitle && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs bg-purple-50 text-purple-700 font-semibold border border-purple-100 animate-pulse">
                              👑 Заголовок документа
                            </span>
                          )}
                          {clause.hideNumber && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                              ¶ Без номера
                            </span>
                          )}
                        </div>
                      )}

                      {isFormatAsTitle ? (
                        <div className="text-center font-black text-slate-900 text-sm tracking-wide uppercase border-b border-slate-100 pb-2">
                          <HighlightedClauseText
                            text={clause.contentRu}
                            document={tempDoc}
                            prefix={null}
                            clauseNum={''}
                            hasTitle={false}
                            disableAutoSubnumbers={clause.noAutoSubnumbers}
                            clauseLevel={clauseLevel}
                            onVariableChange={onVariableChange}
                          />
                        </div>
                      ) : (
                        <>
                          {title ? (
                            <h3 
                              className={`clause-title font-extrabold text-xs text-slate-900 uppercase tracking-wide ${clauseLevel > 0 ? `level-${Math.min(clauseLevel, 4)}` : 'level-0'}`}
                              style={{
                                paddingLeft: clauseLevel > 0 ? `calc(var(--clause-indent-unit, 24px) * ${clauseLevel})` : undefined
                              }}
                            >
                              {num ? `${num}. ` : ''}{title}
                            </h3>
                          ) : null}

                          {document.bilingual ? (
                            <div className="grid grid-cols-2 gap-4 text-xs font-serif pt-0.5">
                              <div className="text-justify border-r border-slate-100 pr-3 leading-relaxed text-slate-800">
                                <HighlightedClauseText
                                  text={clause.contentRu}
                                  document={tempDoc}
                                  prefix={!title && num ? <span className="font-bold">{num}. </span> : null}
                                  clauseNum={num}
                                  hasTitle={Boolean(title)}
                                  disableAutoSubnumbers={clause.noAutoSubnumbers}
                                  clauseLevel={clauseLevel}
                                  onVariableChange={onVariableChange}
                                />
                              </div>
                              <div className="text-justify text-slate-600 italic leading-relaxed">
                                <HighlightedClauseText
                                  text={clause.contentEn || 'English translation pending...'}
                                  document={tempDoc}
                                  prefix={!title && num ? <span className="font-bold">{num}. </span> : null}
                                  clauseNum={num}
                                  hasTitle={Boolean(title)}
                                  disableAutoSubnumbers={clause.noAutoSubnumbers}
                                  clauseLevel={clauseLevel}
                                  onVariableChange={onVariableChange}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="clause-content text-xs text-justify leading-relaxed text-slate-800 font-serif">
                              <HighlightedClauseText
                                text={clause.contentRu}
                                document={tempDoc}
                                prefix={!title && num ? <span className="font-bold">{num}. </span> : null}
                                clauseNum={num}
                                hasTitle={Boolean(title)}
                                disableAutoSubnumbers={clause.noAutoSubnumbers}
                                clauseLevel={clauseLevel}
                                onVariableChange={onVariableChange}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* HORIZONTAL ACTION CONTROLS FLOATING AT TOP RIGHT */}
                    {!readOnly && (
                      <div className="absolute top-2 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-0.5 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-md p-0.5 shadow-2xs" onClick={e => e.stopPropagation()}>
                        {onToggleTitle && (
                          <button
                            onClick={() => onToggleTitle(clause.id)}
                            className={`p-1 rounded transition-colors ${
                              isTitleVisible
                                ? 'text-blue-600 bg-blue-50/90 hover:bg-blue-100'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                            title={isTitleVisible ? "Скрыть заголовок пункта" : "Показать заголовок пункта"}
                          >
                            <Type className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onReorder && (
                          <>
                            <button
                              disabled={idx === 0}
                              onClick={() => onReorder(idx, 'up')}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded hover:bg-slate-100 transition-colors"
                              title="Переместить выше"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={idx === document.clauses.length - 1}
                              onClick={() => onReorder(idx, 'down')}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded hover:bg-slate-100 transition-colors"
                              title="Переместить ниже"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {onChangeLevel && (
                          <>
                            <button
                              disabled={clauseLevel >= 3}
                              onClick={() => onChangeLevel(clause.id, 1)}
                              className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-20 rounded hover:bg-blue-50 transition-colors"
                              title="Понизить уровень / Подвинуть вправо (подпункт)"
                            >
                              <Indent className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={clauseLevel <= 0}
                              onClick={() => onChangeLevel(clause.id, -1)}
                              className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-20 rounded hover:bg-blue-50 transition-colors"
                              title="Повысить уровень / Подвинуть влево"
                            >
                              <Outdent className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {onEditClause && (
                          <button
                            onClick={() => onEditClause(clause)}
                            className={`p-1 rounded transition-colors ${
                              (clause.isLinkedToLibrary !== false && !clause.isAdHoc && !clause.id?.startsWith('adhoc-'))
                                ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                                : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title={
                              (clause.isLinkedToLibrary !== false && !clause.isAdHoc && !clause.id?.startsWith('adhoc-'))
                                ? "Клауза связана с библиотекой (редактирование в шаблоне заблокировано). Нажмите для просмотра / отвязки."
                                : "Редактировать пункт"
                            }
                          >
                            {(clause.isLinkedToLibrary !== false && !clause.isAdHoc && !clause.id?.startsWith('adhoc-')) ? (
                              <Lock className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <Edit3 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {onRemove && (
                          <button
                            onClick={() => onRemove(clause.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                            title="Исключить из договора"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* DROP LINE INDICATOR BELOW */}
                    {isOverBelow && (
                      <div className="relative mt-2 transition-all">
                        <div className="h-1 bg-blue-600 rounded-full shadow-sm animate-pulse" />
                        <div className="absolute -left-1.5 -top-[3px] w-2.5 h-2.5 bg-blue-600 rounded-full" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* SIGNATURES & REQUISITES (RENDERED ONLY IF NOT ALREADY PROVIDED AS A CLAUSE IN DOCUMENT) */}
      {!document.clauses.some(c => 
        c.isMultiColumn || 
        (c.columnsCount !== undefined && c.columnsCount > 1) ||
        c.contentRu?.includes('===') ||
        c.contentRu?.includes('|||') ||
        (c.category === 'Реквизиты' || (c.titleRu && (c.titleRu.toLowerCase().includes('реквизит') || c.titleRu.toLowerCase().includes('подпис'))))
      ) && (
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-6 text-[11px] font-sans text-slate-800">
          <div className="space-y-1.5">
            <h4 className="font-bold uppercase text-slate-900 border-b pb-1 border-slate-200">
              {document.partyA.role.toUpperCase()}
            </h4>
            <p className="font-bold">{document.partyA.name}</p>
            <p>Код ЕГРПОУ / ИНН: {document.partyA.code || '—'}</p>
            <p>Адрес: {document.partyA.address || '—'}</p>
            <p>Банк: {document.partyA.bankName || '—'}, IBAN/Счёт: {document.partyA.bankAccount || '—'}</p>
            <p>Директор: {document.partyA.director || '—'}</p>
            <div className="pt-6 font-semibold text-slate-400">
              М.П. ___________________
            </div>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-bold uppercase text-slate-900 border-b pb-1 border-slate-200">
              {document.partyB.role.toUpperCase()}
            </h4>
            <p className="font-bold">{document.partyB.name}</p>
            <p>Код ЕГРПОУ / ИНН: {document.partyB.code || '—'}</p>
            <p>Адрес: {document.partyB.address || '—'}</p>
            <p>Банк: {document.partyB.bankName || '—'}, IBAN/Счёт: {document.partyB.bankAccount || '—'}</p>
            <p>Директор: {document.partyB.director || '—'}</p>
            <div className="pt-6 font-semibold text-slate-400">
              М.П. ___________________
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
