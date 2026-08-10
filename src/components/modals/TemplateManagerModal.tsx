import React, { useState } from 'react';
import { X, Save, Plus, FileText, CheckCircle2, Trash2 } from 'lucide-react';
import { SampleTemplate, Clause } from '../../types';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: SampleTemplate[];
  availableClauses: Clause[];
  onSelectTemplate: (templateId: string) => void;
  onSaveTemplate: (template: SampleTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  onClose,
  templates,
  availableClauses,
  onSelectTemplate,
  onSaveTemplate,
  onDeleteTemplate
}) => {
  const [newTemplate, setNewTemplate] = useState<Partial<SampleTemplate>>({
    name: '',
    category: 'Поставка',
    description: '',
    partyARole: 'Поставщик',
    partyBRole: 'Покупатель',
    clauseIds: []
  });

  if (!isOpen) return null;

  const handleCreateNewTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplate.name) return;

    const tpl: SampleTemplate = {
      id: `tpl-${Date.now()}`,
      name: newTemplate.name,
      category: newTemplate.category || 'Поставка',
      description: newTemplate.description || '',
      partyARole: newTemplate.partyARole || 'Сторона 1',
      partyBRole: newTemplate.partyBRole || 'Сторона 2',
      clauseIds: newTemplate.clauseIds || [],
      questionnaire: []
    };

    onSaveTemplate(tpl);
    onSelectTemplate(tpl.id);

    // Reset form
    setNewTemplate({
      name: '',
      category: 'Поставка',
      description: '',
      partyARole: 'Поставщик',
      partyBRole: 'Покупатель',
      clauseIds: []
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <h2 className="font-black text-base text-slate-900">Управление образцами договоров</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* EXISTING TEMPLATES */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
            Доступные образцы ({templates.length})
          </span>

          <div className="space-y-1.5">
            {templates.map(tpl => (
              <div
                key={tpl.id}
                className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-xl hover:border-amber-300 transition-colors"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{tpl.name}</h4>
                  <p className="text-[10px] text-slate-500">{tpl.description}</p>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      onSelectTemplate(tpl.id);
                      onClose();
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold px-3 py-1 rounded-lg transition-colors shadow-2xs"
                  >
                    Выбрать
                  </button>

                  {onDeleteTemplate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteTemplate(tpl.id);
                      }}
                      title="Удалить шаблон"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FORM TO CREATE NEW TEMPLATE */}
        <form onSubmit={handleCreateNewTemplate} className="border-t border-slate-200 pt-4 space-y-3 text-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
            Создать новый шаблон
          </span>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Название шаблона</label>
            <input
              type="text"
              required
              value={newTemplate.name || ''}
              onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              placeholder="например: Договор оказания юридических услуг"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Роль Стороны 1</label>
              <input
                type="text"
                value={newTemplate.partyARole || 'Поставщик'}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, partyARole: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Роль Стороны 2</label>
              <input
                type="text"
                value={newTemplate.partyBRole || 'Покупатель'}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, partyBRole: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-900"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl transition-colors shadow-2xs flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Создать и открыть</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
