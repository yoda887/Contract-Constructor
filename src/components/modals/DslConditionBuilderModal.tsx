import React, { useState, useEffect } from 'react';
import { X, GitBranch, Check, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';

interface DslConditionBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableVariables?: string[];
  initialSelectedText?: string;
  onInsert: (dslText: string) => void;
}

export const DslConditionBuilderModal: React.FC<DslConditionBuilderModalProps> = ({
  isOpen,
  onClose,
  availableVariables = [],
  initialSelectedText = '',
  onInsert
}) => {
  const [selectedVar, setSelectedVar] = useState<string>('');
  const [customVar, setCustomVar] = useState<string>('');
  const [operator, setOperator] = useState<string>('==');
  const [value, setValue] = useState<string>('');
  const [trueText, setTrueText] = useState<string>('');
  const [hasElse, setHasElse] = useState<boolean>(false);
  const [falseText, setFalseText] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (availableVariables.length > 0) {
        setSelectedVar(availableVariables[0]);
      } else {
        setSelectedVar('CUSTOM');
        setCustomVar('ПЕРЕМЕННАЯ');
      }
      setTrueText(initialSelectedText || 'Текст при выполнении условия');
      setFalseText('Альтернативный текст');
      setHasElse(false);
      setOperator('==');
      setValue('значение');
    }
  }, [isOpen, initialSelectedText, availableVariables]);

  if (!isOpen) return null;

  const actualVarName = selectedVar === 'CUSTOM' ? customVar.trim() : selectedVar;
  const cleanVarName = actualVarName.replace(/^\[|\]$/g, '').trim().toUpperCase();

  // Construct condition expression
  let conditionExpr = '';
  if (operator === 'EXISTS') {
    conditionExpr = `[${cleanVarName || 'ПЕРЕМЕННАЯ'}]`;
  } else {
    // Check if value needs quotes or if it's already wrapped
    const valClean = value.trim();
    const formattedVal = (valClean.startsWith("'") && valClean.endsWith("'")) || (valClean.startsWith('"') && valClean.endsWith('"')) || !isNaN(Number(valClean))
      ? valClean
      : `'${valClean}'`;

    conditionExpr = `[${cleanVarName || 'ПЕРЕМЕННАЯ'}] ${operator} ${formattedVal}`;
  }

  // Construct full DSL block
  const generatedDsl = hasElse
    ? `{IF ${conditionExpr}} ${trueText} {ELSE} ${falseText} {ENDIF}`
    : `{IF ${conditionExpr}} ${trueText} {ENDIF}`;

  const handleInsert = () => {
    onInsert(generatedDsl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white p-4 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl border border-white/20">
              <GitBranch className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center space-x-2">
                <span>Конструктор условий DSL</span>
                <span className="text-[10px] bg-purple-500/40 text-purple-100 font-mono px-2 py-0.5 rounded-full border border-purple-300/30">
                  {`{IF ...}`}
                </span>
              </h3>
              <p className="text-xs text-purple-200/90 mt-0.5">
                Визуальное проектирование логических разветвлений в тексте пункта
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-purple-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800">

          {/* Step 1: Condition Logic */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <label className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] font-bold">1</span>
              <span>Логическое условие (IF)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Variable selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Переменная:
                </label>
                <select
                  value={selectedVar}
                  onChange={(e) => setSelectedVar(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-800"
                >
                  {availableVariables.map((v) => (
                    <option key={v} value={v}>
                      [{v}]
                    </option>
                  ))}
                  <option value="CUSTOM">+ Своя переменная...</option>
                </select>

                {selectedVar === 'CUSTOM' && (
                  <input
                    type="text"
                    value={customVar}
                    onChange={(e) => setCustomVar(e.target.value)}
                    placeholder="ПЕРЕМЕННАЯ"
                    className="w-full mt-2 p-2 bg-white border border-slate-200 rounded-lg font-mono text-xs uppercase"
                  />
                )}
              </div>

              {/* Operator selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Оператор:
                </label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                >
                  <option value="==">Равно (==)</option>
                  <option value="!=">Не равно (!=)</option>
                  <option value=">">Больше (&gt;)</option>
                  <option value="<">Меньше (&lt;)</option>
                  <option value=">=">Больше или равно (&gt;=)</option>
                  <option value="<=">Меньше или равно (&lt;=)</option>
                  <option value="EXISTS">Заполнена / Не пустая</option>
                </select>
              </div>

              {/* Compare Value */}
              {operator !== 'EXISTS' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Сравниваемое значение:
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="30% / 100000 / Да"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Main Text (True branch) */}
          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-2">
            <label className="font-bold text-emerald-950 text-xs flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">2</span>
              <span>Текст, если условие ВЫПОЛНЯЕТСЯ (True)</span>
            </label>
            <textarea
              rows={2}
              value={trueText}
              onChange={(e) => setTrueText(e.target.value)}
              placeholder="Текст, который появится в документе при истинном условии..."
              className="w-full p-2.5 bg-white border border-emerald-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Step 3: Optional Else branch */}
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-amber-950 text-xs flex items-center space-x-1.5 cursor-pointer">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[11px] font-bold">3</span>
                <span>Добавить альтернативную ветку {`{ELSE}`}</span>
              </label>
              <input
                type="checkbox"
                checked={hasElse}
                onChange={(e) => setHasElse(e.target.checked)}
                className="w-4 h-4 text-purple-600 accent-purple-600 rounded cursor-pointer"
              />
            </div>

            {hasElse && (
              <textarea
                rows={2}
                value={falseText}
                onChange={(e) => setFalseText(e.target.value)}
                placeholder="Текст, который появится в документе, если условие НЕ выполняется..."
                className="w-full p-2.5 bg-white border border-amber-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 animate-in fade-in duration-150"
              />
            )}
          </div>

          {/* Step 4: Code Preview */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 text-xs flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Сгенерированный код DSL:</span>
            </label>
            <div className="p-3 bg-slate-900 text-purple-300 rounded-xl font-mono text-[11px] break-all border border-slate-800 shadow-inner">
              {generatedDsl}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center space-x-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Код будет вставлен в текущую позицию курсора</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 text-xs transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleInsert}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs transition-colors shadow-xs hover:shadow-md cursor-pointer flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Вставить в текст</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
