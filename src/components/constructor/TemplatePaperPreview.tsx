import React from 'react';
import { ChevronUp, ChevronDown, Trash2, Edit3, Indent, Outdent } from 'lucide-react';
import { ContractDocument, Clause } from '../../types';
import { resolveVariableValue } from '../../utils/variableResolver';

interface TemplatePaperPreviewProps {
  document: ContractDocument;
  onReorder?: (index: number, direction: 'up' | 'down') => void;
  onChangeLevel?: (clauseId: string, delta: number) => void;
  onRemove?: (clauseId: string) => void;
  onEditClause?: (clause: Clause) => void;
}

export const TemplatePaperPreview: React.FC<TemplatePaperPreviewProps> = ({
  document,
  onReorder,
  onChangeLevel,
  onRemove,
  onEditClause
}) => {
  
  const substituteAndHighlightVariables = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\[[^\]]+\])/g);

    return parts.map((part, idx) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const varKey = part.slice(1, -1);
        const val = resolveVariableValue(varKey, document.customVariables, document);
        if (val) {
          return (
            <span key={idx} className="var-highlight">
              {val}
            </span>
          );
        }
        return (
          <span key={idx} className="bg-rose-100 text-rose-800 font-mono font-bold px-1 rounded border border-rose-200">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Compute hierarchical numbers (e.g. 1., 1.1., 1.1.1.) based on clause levels
  const getHierarchicalNumber = (clauses: Clause[], index: number) => {
    const counters: number[] = [];
    for (let i = 0; i <= index; i++) {
      const lvl = Math.max(0, clauses[i].level || 0);
      while (counters.length <= lvl) {
        counters.push(0);
      }
      counters.length = lvl + 1;
      counters[lvl] += 1;
    }
    return counters.join('.');
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-10 min-h-[850px] font-serif text-slate-900 text-sm leading-relaxed space-y-6">
      
      {/* HEADER */}
      <div className="text-center space-y-2 border-b border-slate-200 pb-6 font-sans">
        <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">
          {document.title}
        </h2>
        <div className="flex justify-between items-center text-xs text-slate-500 font-semibold pt-2">
          <span>
            <span className="var-highlight">{document.city || 'Город'}</span>
          </span>
          <span>
            <span className="var-highlight">{document.date || 'Дата'}</span>
          </span>
        </div>
      </div>

      {/* PREAMBLE */}
      <div className="text-justify text-xs leading-relaxed text-slate-800 font-sans">
        <p>
          <strong className="font-bold var-highlight">{document.partyA.name}</strong> (<span className="var-highlight">{document.partyA.role}</span>), в лице <span className="var-highlight">{document.partyA.director}</span>, действующего на основании Устава, с одной стороны, и <strong className="font-bold var-highlight">{document.partyB.name}</strong> (<span className="var-highlight">{document.partyB.role}</span>), в лице <span className="var-highlight">{document.partyB.director}</span>, с другой стороны, заключили настоящий Договор о нижеследующем:
        </p>
      </div>

      {/* CLAUSES LIST WITH UNIFORM MARGINS & HORIZONTAL DIVIDERS */}
      <div className="pt-2 font-sans divide-y divide-slate-200/70">
        {document.clauses.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
            В договоре нет пунктов. Выберите пункты из библиотеки слева.
          </div>
        ) : (
          document.clauses.map((clause, idx) => {
            const num = getHierarchicalNumber(document.clauses, idx);
            const title = document.includeTitleInClause ? clause.titleRu || clause.name : '';
            const clauseLevel = clause.level || 0;

            return (
              <div
                key={`${clause.id}-${idx}`}
                style={{ paddingLeft: clauseLevel > 0 ? `${clauseLevel * 16}px` : undefined }}
                className="group relative pt-7 pb-4 hover:bg-slate-50/40 transition-colors"
              >
                {/* CLAUSE CONTENT AREA (UNIFORM MARGINS WITH PREAMBLE AND DOCUMENT) */}
                <div className="space-y-1">
                  {title ? (
                    <h3 className="clause-title font-extrabold text-xs text-slate-900 uppercase tracking-wide">
                      {num}. {title}
                    </h3>
                  ) : null}

                  {document.bilingual ? (
                    <div className="grid grid-cols-2 gap-4 text-xs font-serif pt-0.5">
                      <div className="text-justify border-r border-slate-100 pr-3 leading-relaxed text-slate-800">
                        {!title ? <span className="font-bold">{num}. </span> : null}
                        {substituteAndHighlightVariables(clause.contentRu)}
                      </div>
                      <div className="text-justify text-slate-600 italic leading-relaxed">
                        {!title ? <span className="font-bold">{num}. </span> : null}
                        {clause.contentEn || 'English translation pending...'}
                      </div>
                    </div>
                  ) : (
                    <div className="clause-content text-xs text-justify leading-relaxed text-slate-800 font-serif">
                      {!title ? <span className="font-bold">{num}. </span> : null}
                      {substituteAndHighlightVariables(clause.contentRu)}
                    </div>
                  )}
                </div>

                {/* HORIZONTAL ACTION CONTROLS FLOATING AT TOP RIGHT */}
                <div className="absolute top-2 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-0.5 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-md p-0.5 shadow-2xs">
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
                      className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                      title="Редактировать пункт"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
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
              </div>
            );
          })
        )}
      </div>

      {/* SIGNATURES & REQUISITES */}
      <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-6 text-[11px] font-sans">
        <div className="space-y-1.5">
          <h4 className="font-bold uppercase text-slate-900 border-b pb-1 border-slate-200">
            {document.partyA.role.toUpperCase()}
          </h4>
          <p className="font-bold">{document.partyA.name}</p>
          <p>Код ЕГРПОУ: {document.partyA.code}</p>
          <p>Адрес: {document.partyA.address}</p>
          <p>Банк: {document.partyA.bankName}, IBAN: {document.partyA.bankAccount}</p>
          <p>Директор: {document.partyA.director}</p>
          <div className="pt-6 font-semibold text-slate-400">
            М.П. ___________________
          </div>
        </div>

        <div className="space-y-1.5">
          <h4 className="font-bold uppercase text-slate-900 border-b pb-1 border-slate-200">
            {document.partyB.role.toUpperCase()}
          </h4>
          <p className="font-bold">{document.partyB.name}</p>
          <p>Код ЕГРПОУ: {document.partyB.code}</p>
          <p>Адрес: {document.partyB.address}</p>
          <p>Банк: {document.partyB.bankName}, IBAN: {document.partyB.bankAccount}</p>
          <p>Директор: {document.partyB.director}</p>
          <div className="pt-6 font-semibold text-slate-400">
            М.П. ___________________
          </div>
        </div>
      </div>

    </div>
  );
};

