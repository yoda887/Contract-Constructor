import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, HelpCircle } from 'lucide-react';
import { QuestionnaireAnswer } from '../../types';

interface ClauseQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuestionnaireAnswer[];
  onSave: (questions: QuestionnaireAnswer[]) => void;
  clauseName?: string;
}

export const ClauseQuestionsModal: React.FC<ClauseQuestionsModalProps> = ({
  isOpen,
  onClose,
  questions,
  onSave,
  clauseName
}) => {
  const [items, setItems] = useState<QuestionnaireAnswer[]>([]);
  const [newQuestionForm, setNewQuestionForm] = useState<Partial<QuestionnaireAnswer>>({
    label: '',
    type: 'text',
    affectsVariable: ''
  });

  useEffect(() => {
    setItems(questions || []);
  }, [questions, isOpen]);

  if (!isOpen) return null;

  const handleAddQuestion = () => {
    if (!newQuestionForm.label) return;
    const q: QuestionnaireAnswer = {
      id: `q-${Date.now()}`,
      label: newQuestionForm.label,
      type: newQuestionForm.type || 'text',
      value: newQuestionForm.type === 'boolean' ? true : '',
      affectsVariable: newQuestionForm.affectsVariable || undefined
    };

    setItems(prev => [...prev, q]);
    setNewQuestionForm({ label: '', type: 'text', affectsVariable: '' });
  };

  const handleDeleteQuestion = (qId: string) => {
    setItems(prev => prev.filter(q => q.id !== qId));
  };

  const handleApply = () => {
    onSave(items);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[85vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Вопросы анкеты Q&A
              </h3>
              {clauseName && (
                <p className="text-xs text-slate-500 truncate max-w-xs font-medium">
                  Клауза: {clauseName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Questions List */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700">
            Список вопросов ({items.length})
          </label>

          {items.length === 0 ? (
            <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-500">
                Для этой клаузы еще нет связанных вопросов.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Добавьте вопросы ниже, чтобы запрашивать данные у пользователя в анкете.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {items.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="flex items-start justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-x-2"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800">{q.label}</p>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono">
                      <span className="bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                        {q.type}
                      </span>
                      {q.affectsVariable && (
                        <span>→ Переменная: <strong className="text-blue-600 font-bold">[{q.affectsVariable}]</strong></span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors rounded-md hover:bg-white"
                    title="Удалить вопрос"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Question Section */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-3">
          <span className="font-extrabold text-xs text-slate-800 block">
            Добавить новый вопрос
          </span>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Текст вопроса в анкете
              </label>
              <input
                type="text"
                value={newQuestionForm.label || ''}
                onChange={(e) => setNewQuestionForm(prev => ({ ...prev, label: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Например: Укажите размер неустойки (%)"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Переменная в тексте
                </label>
                <input
                  type="text"
                  value={newQuestionForm.affectsVariable || ''}
                  onChange={(e) => setNewQuestionForm(prev => ({ ...prev, affectsVariable: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="например: 0,5"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Тип ответа
                </label>
                <select
                  value={newQuestionForm.type || 'text'}
                  onChange={(e) => setNewQuestionForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="text">Текст (text)</option>
                  <option value="number">Число (number)</option>
                  <option value="boolean">Да / Нет (boolean)</option>
                  <option value="choice">Выбор из списка</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddQuestion}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить вопрос в список</span>
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-xs flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Сохранить вопросы</span>
          </button>
        </div>

      </div>
    </div>
  );
};
