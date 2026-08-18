import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Globe, Tag, Sparkles, Edit3, Link2, Unlink } from 'lucide-react';
import { Clause, ContractDocument } from '../../types';

interface InsertClauseModalProps {
  isOpen: boolean;
  clause: Clause | null;
  document: ContractDocument;
  selectedClauseId?: string | null;
  initialPosition?: 'above' | 'below' | 'start' | 'end';
  onClose: () => void;
  onInsert: (clause: Clause, adaptedVariables: Record<string, string>, settings: { showTitle: boolean; showNumbering: boolean; isBullet: boolean; language: 'ru' | 'uk' | 'en'; relativeToClauseId?: string; position?: 'above' | 'below' | 'start' | 'end'; isLinkedToLibrary?: boolean }) => void;
}

export const InsertClauseModal: React.FC<InsertClauseModalProps> = ({
  isOpen,
  clause,
  document,
  selectedClauseId,
  initialPosition = 'below',
  onClose,
  onInsert
}) => {
  const [language, setLanguage] = useState<'ru' | 'uk' | 'en'>('ru');
  const [showTitle, setShowTitle] = useState(true);
  const [showNumbering, setShowNumbering] = useState(true);
  const [isBullet, setIsBullet] = useState(false);
  const [isLinkedToLibrary, setIsLinkedToLibrary] = useState(true);

  // Active chip being edited
  const [selectedChipKey, setSelectedChipKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // Adapted variables state: key -> replacement value
  const [adaptedVars, setAdaptedVars] = useState<Record<string, string>>({});

  // Get raw clause text based on language
  const rawText = useMemo(() => {
    if (!clause) return '';
    if (language === 'uk' && clause.contentUk) return clause.contentUk;
    if (language === 'en' && clause.contentEn) return clause.contentEn;
    return clause.contentRu || clause.contentUk || clause.contentEn || '';
  }, [clause, language]);

  const rawTitle = useMemo(() => {
    if (!clause) return '';
    if (language === 'uk' && clause.titleUk) return clause.titleUk;
    if (language === 'en' && clause.titleEn) return clause.titleEn;
    return clause.titleRu || clause.name || '';
  }, [clause, language]);

  // Extract bracket variables e.g. [Поставщиком], [Продукции], [Покупателю], [Товар]
  const extractedVariables = useMemo(() => {
    if (!rawText) return [];
    const matches = rawText.match(/\[([^\]]+)\]/g);
    if (!matches) return [];
    // Extract unique variable keys inside brackets
    const keys = Array.from(new Set(matches.map(m => m.slice(1, -1))));
    return keys;
  }, [rawText]);

  // Initialize adaptedVars from existing document.customVariables or default to key
  useEffect(() => {
    if (!isOpen || !clause) return;
    const initialMap: Record<string, string> = {};
    extractedVariables.forEach(key => {
      if (document.customVariables[key] !== undefined && document.customVariables[key] !== '') {
        initialMap[key] = document.customVariables[key];
      } else {
        initialMap[key] = key;
      }
    });
    setAdaptedVars(initialMap);
  }, [extractedVariables, document, isOpen, clause]);

  // Process text into lines and parts for live preview
  const previewLines = useMemo(() => {
    if (!rawText) return [];
    return rawText.split('\n');
  }, [rawText]);

  // Select chip for editing
  const handleSelectChip = (key: string) => {
    setSelectedChipKey(key);
    setEditingValue(adaptedVars[key] || key);
  };

  // Save value for current chip
  const handleSaveChipValue = () => {
    if (selectedChipKey) {
      setAdaptedVars(prev => ({
        ...prev,
        [selectedChipKey]: editingValue.trim() || selectedChipKey
      }));
      setSelectedChipKey(null);
    }
  };

  // Submit insertion
  const handleConfirmInsert = () => {
    if (!clause) return;
    onInsert(clause, adaptedVars, {
      showTitle,
      showNumbering,
      isBullet,
      language,
      relativeToClauseId: selectedClauseId || undefined,
      position: initialPosition || 'below',
      isLinkedToLibrary
    });
    onClose();
  };

  if (!isOpen || !clause) return null;

  const renderPreviewText = (text: string) => {
    const parts = text.split(/(\[[^\]]+\])/g);
    return parts.map((part, idx) => {
      if (!part) return null;
      if (part.startsWith('[') && part.endsWith(']')) {
        const varKey = part.slice(1, -1);
        const replacedVal = adaptedVars[varKey] !== undefined ? adaptedVars[varKey] : varKey;
        const isSelected = selectedChipKey === varKey;

        return (
          <span
            key={`chip-${idx}`}
            onClick={() => handleSelectChip(varKey)}
            title="Нажмите для редактирования слова/переменной"
            className={`cursor-pointer px-1 py-0.5 rounded transition-all font-bold ${
              isSelected
                ? 'bg-amber-300 text-slate-950 ring-2 ring-amber-500 shadow-xs'
                : 'bg-yellow-200 text-slate-900 hover:bg-yellow-300 border border-yellow-300'
            }`}
          >
            {replacedVal}
          </span>
        );
      }
      return <span key={`txt-${idx}`}>{part}</span>;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* MODAL TITLE BAR */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="font-extrabold text-sm tracking-wide">Вставить клаузу в шаблон договора</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Main Action Button */}
          <button
            onClick={handleConfirmInsert}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold px-4 py-1.5 rounded-lg shadow-xs border border-emerald-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Вставить текст</span>
          </button>

          {/* Controls Right */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Language Selector */}
            <div className="flex items-center space-x-1.5 bg-white px-2 py-1 rounded-md border border-slate-300">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <label className="text-slate-600 font-medium">Язык:</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'ru' | 'uk' | 'en')}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ru">Русский</option>
                <option value="uk">Українська</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* Formatting Toggles */}
            <div className="flex items-center space-x-1 bg-white p-0.5 rounded-md border border-slate-300">
              <span className="text-slate-500 px-1 font-medium">Формат:</span>
              <button
                type="button"
                onClick={() => setShowTitle(prev => !prev)}
                className={`px-2 py-0.5 rounded font-extrabold transition-colors cursor-pointer ${
                  showTitle ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Включить / Выключить заголовок пункта"
              >
                T
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNumbering(prev => !prev);
                  if (!showNumbering) setIsBullet(false);
                }}
                className={`px-2 py-0.5 rounded font-extrabold transition-colors cursor-pointer ${
                  showNumbering && !isBullet ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Включить / Выключить нумерацию"
              >
                1.
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsBullet(prev => !prev);
                  if (!isBullet) setShowNumbering(true);
                }}
                className={`px-2 py-0.5 rounded font-extrabold transition-colors cursor-pointer ${
                  isBullet ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Использовать маркеры списков"
              >
                •
              </button>
            </div>

            {/* Link to Library Toggle */}
            <button
              type="button"
              onClick={() => setIsLinkedToLibrary(prev => !prev)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border text-xs font-bold transition-all cursor-pointer ${
                isLinkedToLibrary
                  ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-2xs'
                  : 'bg-white border-slate-300 text-slate-500 hover:text-slate-700'
              }`}
              title={
                isLinkedToLibrary
                  ? 'Связь активна: клауза в шаблоне будет обновляться автоматически при изменении в библиотеке. Прямое редактирование в шаблоне блокируется.'
                  : 'Связь отключена: клауза вставляется как независимая копия (Ad-hoc) и может свободно редактироваться в шаблоне.'
              }
            >
              {isLinkedToLibrary ? (
                <>
                  <Link2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Связать с библиотекой</span>
                </>
              ) : (
                <>
                  <Unlink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Без связи (Ad-hoc)</span>
                </>
              )}
            </button>

            {/* Clause ID Indicator */}
            <div className="flex items-center space-x-1 bg-slate-200/80 px-2 py-1 rounded-md border border-slate-300 font-mono text-[11px] text-slate-700">
              <span className="font-bold text-slate-500">ID:</span>
              <span className="font-extrabold">{clause.id}</span>
            </div>

          </div>
        </div>

        {/* TWO-COLUMN CONTENT AREA */}
        <div className="flex-1 min-h-0 p-4 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-y-auto bg-slate-50">
          
          {/* LEFT COLUMN: PREVIEW */}
          <div className="md:col-span-8 flex flex-col space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Предпросмотр форматированного пункта:</span>
              <span className="text-[10px] font-normal text-slate-500">
                Желтые слова кликабельны для адаптации
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 min-h-[220px] max-h-[380px] overflow-y-auto space-y-2 text-xs leading-relaxed text-slate-800 shadow-2xs">
              
              {/* Optional Title Header */}
              {showTitle && (
                <div className="font-extrabold uppercase tracking-wide text-slate-900 border-b border-slate-100 pb-1.5 mb-2">
                  {rawTitle}
                </div>
              )}

              {/* Clause Body Lines */}
              {previewLines.map((rawLine, idx) => {
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
                }
                cleanLine = cleanLine.trimStart();

                let numberPrefix = '';
                if (showNumbering && tabCount === 0) {
                  if (isBullet) {
                    numberPrefix = '• ';
                  } else if (previewLines.length === 1) {
                    numberPrefix = '1. ';
                  } else {
                    numberPrefix = `1.${idx + 1}. `;
                  }
                }

                const hasPrefix = /^([0-9a-zA-Zа-яА-Я]+\s*[\.\)]|[\-—•])/.test(cleanLine);
                const showDash = tabCount > 0 && !hasPrefix;

                return (
                  <div
                    key={idx}
                    style={{
                      paddingLeft: tabCount > 0 ? `${tabCount * 16}px` : undefined
                    }}
                  >
                    {numberPrefix && <strong className="font-bold text-slate-900 mr-1">{numberPrefix}</strong>}
                    {showDash && <span className="font-bold text-slate-400 mr-1.5">—</span>}
                    {renderPreviewText(cleanLine)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: HIGHLIGHTED WORDS / CHIPS */}
          <div className="md:col-span-4 flex flex-col space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              <span>Выделенные слова (переменные):</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 min-h-[220px] max-h-[380px] overflow-y-auto flex flex-col justify-between space-y-3 shadow-2xs">
              
              <div className="space-y-2">
                {extractedVariables.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic p-2 text-center">
                    В тексте этой клаузы нет переменных в квадратных скобках.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {extractedVariables.map(key => {
                      const isSelected = selectedChipKey === key;
                      const hasCustomValue = adaptedVars[key] && adaptedVars[key] !== key;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleSelectChip(key)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 shadow-xs'
                              : hasCustomValue
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                              : 'bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
                          }`}
                        >
                          <span>{adaptedVars[key] || key}</span>
                          {hasCustomValue && <Edit3 className="w-3 h-3 opacity-60 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* INLINE EDIT INPUT FOR SELECTED CHIP */}
              {selectedChipKey && (
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl space-y-2 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-amber-950">
                    <span>Адаптация: [{selectedChipKey}]</span>
                    <button
                      onClick={() => setSelectedChipKey(null)}
                      className="text-amber-700 hover:text-amber-900 font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveChipValue();
                      }
                    }}
                    placeholder={`Значение для [${selectedChipKey}]`}
                    className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    autoFocus
                  />

                  <div className="flex items-center justify-end space-x-1.5 pt-1">
                    <button
                      onClick={() => {
                        setEditingValue(selectedChipKey);
                      }}
                      className="text-[10px] text-slate-500 hover:underline px-1"
                    >
                      Сбросить
                    </button>
                    <button
                      onClick={handleSaveChipValue}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3 py-1 rounded-lg text-[11px] shadow-2xs"
                    >
                      Сохранить
                    </button>
                  </div>
                </div>
              )}

              <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100">
                💡 При нажатии «Вставить текст» все выбранные значения адаптируются в текст и сохраняются в шаблоне.
              </div>

            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Категория: <strong className="text-slate-800">{clause.category || 'Общие'}</strong>
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirmInsert}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-xs transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Вставить текст</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
