import React from 'react';
import { ContractDocument } from '../../types';
import { resolveVariableValue } from '../../utils/variableResolver';

interface QALivePreviewProps {
  document: ContractDocument;
}

export const QALivePreview: React.FC<QALivePreviewProps> = ({ document }) => {

  // Helper to highlight filled variables with yellow background `.var-highlight`
  const renderLiveText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\[[^\]]+\])/g);

    return parts.map((part, idx) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const varKey = part.replace('[', '').replace(']', '');
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

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 sm:p-12 min-h-[850px] font-serif text-slate-900 text-sm leading-relaxed space-y-6">
      
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
      <div className="text-justify text-xs leading-relaxed text-slate-800">
        <p>
          <strong className="font-bold var-highlight">{document.partyA.name}</strong> (<span className="var-highlight">{document.partyA.role}</span>), в лице <span className="var-highlight">{document.partyA.director}</span>, действующего на основании Устава, с одной стороны, и <strong className="font-bold var-highlight">{document.partyB.name}</strong> (<span className="var-highlight">{document.partyB.role}</span>), в лице <span className="var-highlight">{document.partyB.director}</span>, с другой стороны, заключили настоящий Договор о нижеследующем:
        </p>
      </div>

      {/* CLAUSES LIST WITH FILLED VARIABLES HIGHLIGHTED */}
      <div className="space-y-4 pt-2">
        {document.clauses.map((clause, idx) => {
          const num = idx + 1;
          const title = document.includeTitleInClause ? clause.titleRu || clause.name : '';

          return (
            <div key={clause.id || idx} className="space-y-1">
              {title ? (
                <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide font-sans">
                  {num}. {title}
                </h3>
              ) : null}

              <div className="text-xs text-justify leading-relaxed text-slate-800">
                {!title ? <span className="font-bold">{num}. </span> : null}
                {renderLiveText(clause.contentRu)}
              </div>
            </div>
          );
        })}
      </div>

      {/* REQUISITES */}
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
        </div>
      </div>

    </div>
  );
};
