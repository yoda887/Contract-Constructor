import React from 'react';
import { X, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuditResult } from '../../types';

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AuditResult | null;
}

export const AuditModal: React.FC<AuditModalProps> = ({ isOpen, onClose, result }) => {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="font-extrabold text-base text-slate-900">Результаты юридического аудита</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCORE BANNER */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          result.score >= 80 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : result.score >= 60 
              ? 'bg-amber-50 border-amber-200 text-amber-900' 
              : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wide block opacity-75">Оценка полноты</span>
            <span className="text-2xl font-black">{result.score} / 100</span>
          </div>
          <p className="text-xs font-semibold max-w-xs text-right leading-snug">
            {result.summary}
          </p>
        </div>

        {/* RISKS LIST */}
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          <h3 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
            Замечания и риски ({result.risks.length})
          </h3>

          {result.risks.length === 0 ? (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Замечаний не обнаружено. Договор полностью укомплектован.</span>
            </div>
          ) : (
            result.risks.map((risk, idx) => (
              <div 
                key={idx}
                className="p-3.5 rounded-xl border bg-slate-50 border-slate-200 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                    <AlertCircle className={`w-4 h-4 ${
                      risk.level === 'HIGH' ? 'text-rose-600' : risk.level === 'MEDIUM' ? 'text-amber-600' : 'text-blue-600'
                    }`} />
                    <span>{risk.title}</span>
                  </span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono ${
                    risk.level === 'HIGH' ? 'bg-rose-100 text-rose-700' : risk.level === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {risk.level}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">{risk.description}</p>
                {risk.suggestion && (
                  <p className="text-[10px] font-semibold text-blue-600 bg-blue-50/60 p-1.5 rounded border border-blue-100/50 mt-1">
                    💡 {risk.suggestion}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
