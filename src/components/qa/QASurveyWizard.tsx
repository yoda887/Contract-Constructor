import React, { useState } from 'react';
import { 
  CheckCircle2, Sparkles, HelpCircle, Layers, RefreshCw, FileEdit, Plus, Trash2, Users 
} from 'lucide-react';
import { QuestionnaireAnswer, ContractDocument } from '../../types';
import { 
  extractAllVariablesFromDocument, 
  alignPartyVariablesWithPreamble 
} from '../../utils/variableResolver';
import { PartyForm } from '../common/PartyForm';

interface QASurveyWizardProps {
  questionnaire: QuestionnaireAnswer[];
  qaAnswers: Record<string, any>;
  stepIndex?: number;
  onStepIndexChange?: (idx: number) => void;
  onAnswerChange: (questionId: string, val: any) => void;
  onAutoFillAI: () => void;
  document?: ContractDocument;
  onUpdateDocument?: React.Dispatch<React.SetStateAction<ContractDocument>>;
  showToast?: (msg: string) => void;
}

export const QASurveyWizard: React.FC<QASurveyWizardProps> = ({
  questionnaire,
  qaAnswers,
  onAnswerChange,
  onAutoFillAI,
  document,
  onUpdateDocument,
  showToast
}) => {
  const [panelTab, setPanelTab] = useState<'qa' | 'preamble' | 'direct'>(
    questionnaire.length > 0 ? 'qa' : 'preamble'
  );
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarVal, setNewVarVal] = useState('');
  const [hoveredVarKey, setHoveredVarKey] = useState<string | null>(null);

  React.useEffect(() => {
    const handleGlobalHover = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setHoveredVarKey(customEvent.detail.hovered ? customEvent.detail.key : null);
      }
    };
    window.addEventListener('variable-hover', handleGlobalHover);
    return () => {
      window.removeEventListener('variable-hover', handleGlobalHover);
    };
  }, []);

  const cleanKey = (key: string) => key.toLowerCase().trim().replace(/^\[/, '').replace(/\]$/, '').trim();

  const triggerHover = (varKey: string, hovered: boolean) => {
    window.dispatchEvent(
      new CustomEvent('variable-hover', {
        detail: { key: cleanKey(varKey), hovered }
      })
    );
  };

  const total = questionnaire.length;
  const filledCount = questionnaire.filter(q => {
    const val = qaAnswers[q.id];
    return val !== undefined && val !== '' && val !== null;
  }).length;
  const progressPercent = total > 0 ? Math.round((filledCount / total) * 100) : 0;

  const handleSyncPreamble = () => {
    if (!document || !onUpdateDocument) return;
    const nextVars = alignPartyVariablesWithPreamble(document);
    onUpdateDocument(prev => ({
      ...prev,
      customVariables: nextVars
    }));
    if (showToast) {
      showToast('Названия сторон приведены в соответствие с преамбулой');
    }
  };

  const handleDirectVarChange = (key: string, value: string) => {
    if (!onUpdateDocument) return;
    onUpdateDocument(prev => ({
      ...prev,
      customVariables: {
        ...prev.customVariables,
        [key]: value
      }
    }));
  };

  const handleAddDirectVar = () => {
    if (!newVarKey.trim()) return;
    const cleanKey = newVarKey.trim().replace(/^\[/, '').replace(/\]$/, '');
    handleDirectVarChange(cleanKey, newVarVal.trim());
    setNewVarKey('');
    setNewVarVal('');
    if (showToast) showToast(`Добавлена переменная [${cleanKey}]`);
  };

  const variables = document ? extractAllVariablesFromDocument(document) : [];
  const directVariables = variables.filter(v => v.source !== 'questionnaire');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
      
      {/* PANEL TABS SWITCHER */}
      <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
        <button
          onClick={() => setPanelTab('qa')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            panelTab === 'qa'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
          <span>Анкета ({total})</span>
        </button>

        <button
          onClick={() => setPanelTab('preamble')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            panelTab === 'preamble'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-sky-600" />
          <span>Преамбула и стороны</span>
        </button>

        <button
          onClick={() => setPanelTab('direct')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            panelTab === 'direct'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileEdit className="w-3.5 h-3.5 text-emerald-600" />
          <span>Переменные ("просто так")</span>
          {directVariables.length > 0 && (
            <span className="bg-slate-200 text-slate-700 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
              {directVariables.length}
            </span>
          )}
        </button>
      </div>

      {/* QUICK PREAMBLE SYNC BANNER */}
      {document && (
        <div className="bg-sky-50 border border-sky-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-sky-900 text-[11px] font-semibold">
            <RefreshCw className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>Привести названия сторон в соответствие с преамбулой</span>
          </div>
          <button
            onClick={handleSyncPreamble}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            Синхронизировать
          </button>
        </div>
      )}

      {/* TAB 1: QUESTIONNAIRE */}
      {panelTab === 'qa' && (
        <div className="space-y-4">
          
          {/* PROGRESS BAR */}
          <div className="space-y-1.5 pb-1 border-b border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-800">Прогресс анкеты</span>
              <span className="font-bold text-blue-600 font-mono">
                Заполнено {filledCount} из {total} ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* AI AUTOFILL BANNER */}
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl border border-blue-100 text-xs">
            <div className="flex items-center space-x-2 text-blue-900 font-medium">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Заполнить все параметры авто-значениями</span>
            </div>
            <button
              onClick={onAutoFillAI}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              Заполнить AI
            </button>
          </div>

          {/* QUESTIONS LIST */}
          {questionnaire.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
              Анкета не содержит вопросов. Выберите другой шаблон договора.
            </div>
          ) : (
            <div className="space-y-3.5">
              {questionnaire.map((q, idx) => {
                const isAnswered = qaAnswers[q.id] !== undefined && qaAnswers[q.id] !== '' && qaAnswers[q.id] !== null;
                const affectsKey = q.affectsVariable ? cleanKey(q.affectsVariable) : '';
                const isHovered = affectsKey && hoveredVarKey === affectsKey;

                return (
                  <div 
                    key={q.id} 
                    onMouseEnter={() => q.affectsVariable && triggerHover(q.affectsVariable, true)}
                    onMouseLeave={() => q.affectsVariable && triggerHover(q.affectsVariable, false)}
                    className={`rounded-xl p-3.5 border transition-all duration-200 ${
                      isHovered
                        ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400 shadow-md scale-[1.015]'
                        : isAnswered 
                          ? 'bg-slate-50/70 border-slate-200' 
                          : 'bg-amber-50/40 border-amber-200/80'
                    }`}
                  >
                    {/* QUESTION TITLE & STATUS */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <label className="text-xs font-bold text-slate-900 leading-snug flex items-start gap-1.5">
                        <span className="inline-flex items-center justify-center bg-slate-200 text-slate-700 font-mono font-bold rounded-md px-1.5 py-0.5 text-[10px] shrink-0">
                          #{idx + 1}
                        </span>
                        <span>{q.label}</span>
                      </label>

                      {isAnswered ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Заполнено
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 shrink-0">
                          Ожидает
                        </span>
                      )}
                    </div>

                    {/* INPUT CONTROL */}
                    {q.type === 'text' && (
                      <input
                        type="text"
                        value={qaAnswers[q.id] ?? ''}
                        onChange={(e) => onAnswerChange(q.id, e.target.value)}
                        className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="Введите значение..."
                      />
                    )}

                    {q.type === 'number' && (
                      <input
                        type="number"
                        step="any"
                        value={qaAnswers[q.id] ?? ''}
                        onChange={(e) => onAnswerChange(q.id, parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-3 py-2 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    )}

                    {q.type === 'select' && (
                      <select
                        value={qaAnswers[q.id] ?? ''}
                        onChange={(e) => onAnswerChange(q.id, e.target.value)}
                        className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        {q.options?.map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {q.type === 'boolean' && (
                      <div className="flex items-center space-x-4 pt-1">
                        <label className="flex items-center space-x-2 cursor-pointer font-bold text-xs text-slate-800">
                          <input
                            type="radio"
                            name={q.id}
                            checked={qaAnswers[q.id] === true}
                            onChange={() => onAnswerChange(q.id, true)}
                            className="text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                          <span>Да (Включить пункт)</span>
                        </label>

                        <label className="flex items-center space-x-2 cursor-pointer font-bold text-xs text-slate-800">
                          <input
                            type="radio"
                            name={q.id}
                            checked={qaAnswers[q.id] === false}
                            onChange={() => onAnswerChange(q.id, false)}
                            className="text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                          <span>Нет (Исключить)</span>
                        </label>
                      </div>
                    )}

                    {/* METADATA VARIABLE TAG */}
                    {q.affectsVariable && (
                      <p className="text-[10px] text-slate-400 font-mono mt-1.5">
                        Переменная: <span className="bg-amber-100/80 text-amber-900 px-1 rounded font-bold">[{q.affectsVariable}]</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* TAB: PREAMBLE & PARTIES */}
      {panelTab === 'preamble' && document && onUpdateDocument && (
        <div className="space-y-4 text-xs">
          {/* DOCUMENT GENERAL INFO */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-extrabold text-slate-950 text-xs uppercase tracking-wide">
              Реквизиты документа
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Номер договора
                </label>
                <input
                  type="text"
                  value={document.number || ''}
                  onChange={e => onUpdateDocument(prev => {
                    const newNumber = e.target.value;
                    let baseTitle = prev.title;
                    const noSymbolIndex = prev.title.indexOf('№');
                    if (noSymbolIndex !== -1) {
                      baseTitle = prev.title.substring(0, noSymbolIndex).trim();
                    } else if (prev.number && prev.title.includes(prev.number)) {
                      baseTitle = prev.title.replace(prev.number, '').trim();
                    }
                    if (!baseTitle) {
                      baseTitle = 'Договор';
                    }
                    const newTitle = newNumber ? `${baseTitle} № ${newNumber}` : baseTitle;
                    return { ...prev, number: newNumber, title: newTitle };
                  })}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Например: № 12/2026"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Дата заключения
                </label>
                <input
                  type="text"
                  value={document.date || ''}
                  onChange={e => onUpdateDocument(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Например: 15 мая 2026 г."
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Город / Место составления
                </label>
                <input
                  type="text"
                  value={document.city || ''}
                  onChange={e => onUpdateDocument(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Например: г. Москва"
                />
              </div>
            </div>
          </div>

          {/* PARTY A & B DETAILS */}
          <div className="space-y-4">
            
            {/* PARTY A */}
            <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-blue-200/60 pb-1.5 mb-1">
                <h4 className="font-extrabold text-blue-950 text-xs uppercase tracking-wide">
                  Сторона А
                </h4>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                  [{document.partyA.role || 'Поставщик'}]
                </span>
              </div>
              <PartyForm
                party={document.partyA}
                onChange={(updatedParty) => onUpdateDocument(prev => ({
                  ...prev,
                  partyA: updatedParty
                }))}
                colorTheme="blue"
              />
            </div>

            {/* PARTY B */}
            <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5 mb-1">
                <h4 className="font-extrabold text-emerald-950 text-xs uppercase tracking-wide">
                  Сторона Б
                </h4>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                  [{document.partyB.role || 'Покупатель'}]
                </span>
              </div>
              <PartyForm
                party={document.partyB}
                onChange={(updatedParty) => onUpdateDocument(prev => ({
                  ...prev,
                  partyB: updatedParty
                }))}
                colorTheme="emerald"
              />
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: DIRECT VARIABLES ("ПРОСТО ТАК") */}
      {panelTab === 'direct' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-900">Редактирование переменных</span>
          </div>

          {/* ADD DIRECT VARIABLE INPUT */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 p-2.5 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5 text-emerald-600" /> Изменить или добавить переменную "просто так":
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="[Переменная]"
                value={newVarKey}
                onChange={e => setNewVarKey(e.target.value)}
                className="bg-white border border-slate-300 text-xs rounded-lg px-2 py-1 font-mono font-bold w-28 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Значение..."
                value={newVarVal}
                onChange={e => setNewVarVal(e.target.value)}
                className="bg-white border border-slate-300 text-xs rounded-lg px-2 py-1 flex-1 focus:outline-none"
              />
              <button
                onClick={handleAddDirectVar}
                disabled={!newVarKey.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs px-2.5 py-1 rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                ОК
              </button>
            </div>
          </div>

          {/* LIST OF DETECTED VARIABLES */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {directVariables.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed text-xs">
                В клаузах пока не обнаружены квадратные скобки [переменных] или прямые переменные "просто так".
              </div>
            ) : (
              directVariables.map(v => {
                const vKeyClean = cleanKey(v.key);
                const isHovered = hoveredVarKey === vKeyClean;

                return (
                  <div 
                    key={v.key}
                    onMouseEnter={() => triggerHover(v.key, true)}
                    onMouseLeave={() => triggerHover(v.key, false)}
                    className={`rounded-xl border p-2.5 space-y-1.5 transition-all duration-200 ${
                      isHovered
                        ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400 shadow-md scale-[1.015]'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-extrabold text-xs text-amber-900 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200/80">
                        [{v.key}]
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {v.source === 'preamble' ? '🏛️ Из преамбулы' : '✏️ Прямая'}
                      </span>
                    </div>

                    <input
                      type="text"
                      value={v.currentValue}
                      onChange={e => handleDirectVarChange(v.key, e.target.value)}
                      placeholder="Введите значение..."
                      className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

    </div>
  );
};


