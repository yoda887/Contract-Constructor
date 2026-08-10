import React, { useState } from 'react';
import { 
  X, RefreshCw, Users, FileEdit, Sparkles, Plus, Trash2, CheckCircle2, HelpCircle, Layers
} from 'lucide-react';
import { ContractDocument } from '../../types';
import { 
  extractAllVariablesFromDocument, 
  alignPartyVariablesWithPreamble, 
  VariableDescriptor 
} from '../../utils/variableResolver';

interface PreambleVariableModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ContractDocument;
  onUpdateDocument: React.Dispatch<React.SetStateAction<ContractDocument>>;
  showToast: (msg: string) => void;
  onJumpToQuestion?: (questionId: string) => void;
}

export const PreambleVariableModal: React.FC<PreambleVariableModalProps> = ({
  isOpen,
  onClose,
  document,
  onUpdateDocument,
  showToast,
  onJumpToQuestion
}) => {
  const [activeTab, setActiveTab] = useState<'variables' | 'preamble'>('variables');
  const [filterSource, setFilterSource] = useState<'all' | 'preamble' | 'questionnaire' | 'direct'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarVal, setNewVarVal] = useState('');

  if (!isOpen) return null;

  const variables = extractAllVariablesFromDocument(document);

  const filteredVariables = variables.filter(v => {
    const matchesSearch = v.key.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.currentValue.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = filterSource === 'all' || v.source === filterSource;
    return matchesSearch && matchesSource;
  });

  // Action: Bring party names and roles in sync with preamble
  const handleSyncWithPreamble = () => {
    const nextVars = alignPartyVariablesWithPreamble(document);
    onUpdateDocument(prev => ({
      ...prev,
      customVariables: nextVars
    }));
    showToast('Названия сторон и реквизиты приведены в соответствие с преамбулой');
  };

  // Change single custom variable directly ("просто так")
  const handleVariableChange = (key: string, value: string) => {
    onUpdateDocument(prev => ({
      ...prev,
      customVariables: {
        ...prev.customVariables,
        [key]: value
      }
    }));
  };

  // Add new direct variable
  const handleAddDirectVariable = () => {
    if (!newVarKey.trim()) return;
    const cleanKey = newVarKey.trim().replace(/^\[/, '').replace(/\]$/, '');
    handleVariableChange(cleanKey, newVarVal.trim());
    setNewVarKey('');
    setNewVarVal('');
    showToast(`Добавлена переменная [${cleanKey}]`);
  };

  // Delete variable
  const handleDeleteVariable = (key: string) => {
    onUpdateDocument(prev => {
      const copy = { ...prev.customVariables };
      delete copy[key];
      return { ...prev, customVariables: copy };
    });
    showToast(`Удалена переменная [${key}]`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <FileEdit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold font-sans">
                Переменные и Преамбула Договора
              </h2>
              <p className="text-xs text-slate-300">
                Прямое редактирование переменных, ролей сторон и авто-приведение к преамбуле
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP QUICK SYNC BANNER */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 text-blue-900">
            <RefreshCw className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-xs font-semibold">
              Авто-приведение: синхронизировать Сторона А/Б, номер, дату и город договора в соответствии с преамбулой
            </span>
          </div>
          <button
            onClick={handleSyncWithPreamble}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors shadow-xs flex items-center space-x-1.5 shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Привести в соответствие с преамбулой</span>
          </button>
        </div>

        {/* MODAL TABS */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50 gap-2">
          <button
            onClick={() => setActiveTab('variables')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 cursor-pointer ${
              activeTab === 'variables'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Все переменные ("просто так" и из анкеты)</span>
            <span className="bg-slate-200 text-slate-700 font-mono text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {variables.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('preamble')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 cursor-pointer ${
              activeTab === 'preamble'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2. Настройки сторон и преамбулы</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: ALL VARIABLES EDITOR */}
          {activeTab === 'variables' && (
            <div className="space-y-4">
              
              {/* FILTERS & SEARCH */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-1.5 text-xs font-semibold">
                  <span className="text-slate-500 text-[11px] mr-1">Фильтр:</span>
                  <button
                    onClick={() => setFilterSource('all')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      filterSource === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-200 border'
                    }`}
                  >
                    Все ({variables.length})
                  </button>
                  <button
                    onClick={() => setFilterSource('preamble')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      filterSource === 'preamble' ? 'bg-sky-600 text-white' : 'bg-white text-sky-800 hover:bg-sky-50 border border-sky-200'
                    }`}
                  >
                    🏛️ Преамбула
                  </button>
                  <button
                    onClick={() => setFilterSource('questionnaire')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      filterSource === 'questionnaire' ? 'bg-blue-600 text-white' : 'bg-white text-blue-800 hover:bg-blue-50 border border-blue-200'
                    }`}
                  >
                    📋 Из анкеты
                  </button>
                  <button
                    onClick={() => setFilterSource('direct')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      filterSource === 'direct' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
                    }`}
                  >
                    ✏️ Прямые ("просто так")
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Поиск переменной..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* ADD DIRECT VARIABLE FORM */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-emerald-600" /> Добавить новую переменную:
                </span>
                <input
                  type="text"
                  placeholder="Имя, напр: [Гарантия]"
                  value={newVarKey}
                  onChange={e => setNewVarKey(e.target.value)}
                  className="bg-white border border-slate-300 text-xs rounded-lg px-2.5 py-1 font-mono font-bold w-36 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Значение, напр: 12 месяцев"
                  value={newVarVal}
                  onChange={e => setNewVarVal(e.target.value)}
                  className="bg-white border border-slate-300 text-xs rounded-lg px-2.5 py-1 font-medium flex-1 min-w-[150px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  onClick={handleAddDirectVariable}
                  disabled={!newVarKey.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs px-3 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Добавить
                </button>
              </div>

              {/* VARIABLES LIST TABLE */}
              <div className="space-y-2.5">
                {filteredVariables.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed text-xs">
                    Переменные не найдены.
                  </div>
                ) : (
                  filteredVariables.map((v) => (
                    <div 
                      key={v.key}
                      className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* VAR KEY & BADGES */}
                      <div className="space-y-1 min-w-[200px]">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-extrabold text-xs bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                            [{v.key}]
                          </span>
                          {v.clauseCount > 0 && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({v.clauseCount} {v.clauseCount === 1 ? 'клауза' : 'клауз'})
                            </span>
                          )}
                        </div>

                        {/* SOURCE BADGE */}
                        <div className="flex items-center space-x-1.5 text-[10px]">
                          {v.source === 'preamble' && (
                            <span className="bg-sky-50 text-sky-800 font-bold px-1.5 py-0.5 rounded border border-sky-200/80">
                              🏛️ Из преамбулы (авто-роль)
                            </span>
                          )}
                          {v.source === 'questionnaire' && (
                            <span className="bg-blue-50 text-blue-800 font-bold px-1.5 py-0.5 rounded border border-blue-200/80">
                              📋 Из анкеты: {v.questionLabel}
                            </span>
                          )}
                          {v.source === 'direct' && (
                            <span className="bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200/80">
                              ✏️ Прямая ("просто так")
                            </span>
                          )}
                        </div>
                      </div>

                      {/* VALUE INPUT CONTROL */}
                      <div className="flex items-center space-x-2 flex-1 max-w-lg">
                        <input
                          type="text"
                          value={v.currentValue}
                          onChange={(e) => handleVariableChange(v.key, e.target.value)}
                          placeholder="Введите значение переменной..."
                          className="w-full bg-slate-50 border border-slate-300 hover:bg-white focus:bg-white text-slate-900 text-xs rounded-lg px-3 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />

                        {/* DELETE BUTTON IF CUSTOM */}
                        {v.source === 'direct' && (
                          <button
                            onClick={() => handleDeleteVariable(v.key)}
                            title="Удалить переменную"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 2: PREAMBLE & PARTIES EDIT FORM */}
          {activeTab === 'preamble' && (
            <div className="space-y-6 text-xs">
              
              {/* DOCUMENT GENERAL INFO */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                  1. Реквизиты документа
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Номер договора
                    </label>
                    <input
                      type="text"
                      value={document.number}
                      onChange={e => onUpdateDocument(prev => {
                        const newNumber = e.target.value;
                        let newTitle = prev.title;
                        if (prev.number && prev.title.includes(prev.number)) {
                          newTitle = prev.title.replace(prev.number, newNumber);
                        } else if (prev.title.includes('№')) {
                          const idx = prev.title.indexOf('№');
                          newTitle = prev.title.substring(0, idx + 1) + ' ' + newNumber;
                        }
                        return { ...prev, number: newNumber, title: newTitle };
                      })}
                      className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Дата заключения
                    </label>
                    <input
                      type="text"
                      value={document.date}
                      onChange={e => onUpdateDocument(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Город / Место составления
                    </label>
                    <input
                      type="text"
                      value={document.city}
                      onChange={e => onUpdateDocument(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* PARTY A & PARTY B GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* PARTY A */}
                <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-200/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                    <h3 className="font-extrabold text-blue-950 text-xs uppercase tracking-wide">
                      Сторона А
                    </h3>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                      [{document.partyA.role || 'Поставщик'}]
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Роль в договоре (например: Поставщик / Заказчик)
                      </label>
                      <input
                        type="text"
                        value={document.partyA.role}
                        onChange={e => onUpdateDocument(prev => ({
                          ...prev,
                          partyA: { ...prev.partyA, role: e.target.value }
                        }))}
                        className="w-full bg-white border border-slate-300 text-slate-900 font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Полное наименование
                      </label>
                      <input
                        type="text"
                        value={document.partyA.name}
                        onChange={e => onUpdateDocument(prev => ({
                          ...prev,
                          partyA: { ...prev.partyA, name: e.target.value }
                        }))}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Сокращенное наименование (для подстановки)
                      </label>
                      <input
                        type="text"
                        value={document.partyA.shortName}
                        onChange={e => onUpdateDocument(prev => ({
                          ...prev,
                          partyA: { ...prev.partyA, shortName: e.target.value }
                        }))}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Руководитель / ФИО директора
                      </label>
                      <input
                        type="text"
                        value={document.partyA.director}
                        onChange={e => onUpdateDocument(prev => ({
                          ...prev,
                          partyA: { ...prev.partyA, director: e.target.value }
                        }))}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Код ЕГРПОУ / ИНН
                      </label>
                      <input
                        type="text"
                        value={document.partyA.code}
                        onChange={e => onUpdateDocument(prev => ({
                          ...prev,
                          partyA: { ...prev.partyA, code: e.target.value }
                        }))}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* PARTY B */}
                <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                    <h3 className="font-extrabold text-emerald-950 text-xs uppercase tracking-wide">
                      Сторона Б
                    </h3>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                      [{document.partyB.role || 'Покупатель'}]
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Роль в договоре (например: Покупатель / Исполнитель)
                      </label>
                      <input
                        type="text"
                        value={document.partyB.role}
                        onChange={e => onUpdateDocument(prev => ({
                          ...prev,
                          partyB: { ...prev.partyB, role: e.target.value }
                        }))}
                        className="w-full bg-white border border-slate-300 text-slate-900 font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Полное наименование
                      </label>
                      <input
                        type="text"
                        value={document.partyB.name}
                        onChange={e => onUpdateDocument(prev => ({
                          ...prev,
                          partyB: { ...prev.partyB, name: e.target.value }
                        }))}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Сокращенное наименование (для подстановки)
                      </label>
                      <input
                        type="text"
                        value={document.partyB.shortName}
                        onChange={e => onUpdateDocument(prev => ({
                          ...prev,
                          partyB: { ...prev.partyB, shortName: e.target.value }
                        }))}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Руководитель / ФИО директора
                      </label>
                      <input
                        type="text"
                        value={document.partyB.director}
                        onChange={e => onUpdateDocument(prev => ({
                          ...prev,
                          partyB: { ...prev.partyB, director: e.target.value }
                        }))}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Код ЕГРПОУ / ИНН
                      </label>
                      <input
                        type="text"
                        value={document.partyB.code}
                        onChange={e => onUpdateDocument(prev => ({
                          ...prev,
                          partyB: { ...prev.partyB, code: e.target.value }
                        }))}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Все изменения мгновенно применяются к преамбуле и клаузам договора.
          </div>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            Готово
          </button>
        </div>

      </div>
    </div>
  );
};
