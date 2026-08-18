import React, { useState, useRef } from 'react';
import { 
  X, UploadCloud, FileText, CheckCircle2, AlertCircle, Sparkles, 
  Layers, Tag, Users, ArrowRight, Loader2, Edit2, Check, FileUp, ListChecks
} from 'lucide-react';
import { Clause, SampleTemplate } from '../../types';
import { 
  parseDocxFile, 
  convertImportResultToTemplate, 
  DocxImportResult, 
  ParsedClauseDraft 
} from '../../services/docxImportService';

interface DocxImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAsTemplate: (template: SampleTemplate, clauses: Clause[]) => void;
  onApplyToDocument: (clauses: Clause[], title: string, customVars: Record<string, string>, roles: { partyA: string; partyB: string }) => void;
  showToast?: (msg: string) => void;
}

export const DocxImportModal: React.FC<DocxImportModalProps> = ({
  isOpen,
  onClose,
  onSaveAsTemplate,
  onApplyToDocument,
  showToast
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<DocxImportResult | null>(null);

  // Editable settings in preview
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState('Поставка');
  const [partyARole, setPartyARole] = useState('Поставщик');
  const [partyBRole, setPartyBRole] = useState('Покупатель');
  const [selectedClauses, setSelectedClauses] = useState<ParsedClauseDraft[]>([]);
  const [editingClauseId, setEditingClauseId] = useState<string | null>(null);
  const [editClauseContent, setEditClauseContent] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setError('Пожалуйста, выберите файл в формате .docx (Microsoft Word)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await parseDocxFile(file);
      if (result.clauses.length === 0) {
        setError('Не удалось распознать разделы договора в файле. Проверьте содержимое документа.');
        setIsLoading(false);
        return;
      }

      setImportResult(result);
      setTemplateName(result.documentTitle);
      setCategory(result.category);
      setPartyARole(result.partyARole);
      setPartyBRole(result.partyBRole);
      setSelectedClauses(result.clauses);
      setIsLoading(false);
    } catch (err: any) {
      console.error('DOCX Import Error:', err);
      setError(err?.message || 'Ошибка при разборе файла .docx. Убедитесь, что файл не поврежден.');
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setImportResult(null);
    setError(null);
    setEditingClauseId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save changes to single clause
  const handleSaveClauseEdit = (clauseId: string) => {
    setSelectedClauses(prev => prev.map(c => 
      c.id === clauseId ? { ...c, content: editClauseContent } : c
    ));
    setEditingClauseId(null);
  };

  const handleRemoveClause = (clauseId: string) => {
    setSelectedClauses(prev => prev.filter(c => c.id !== clauseId));
  };

  // Action 1: Save as Template
  const handleSaveTemplateAction = () => {
    if (!importResult) return;

    const modifiedResult: DocxImportResult = {
      ...importResult,
      documentTitle: templateName,
      category,
      partyARole,
      partyBRole,
      clauses: selectedClauses
    };

    const { template, clauses } = convertImportResultToTemplate(modifiedResult, templateName, category);
    onSaveAsTemplate(template, clauses);
    if (showToast) {
      showToast(`Шаблон «${template.name}» успешно создан (${clauses.length} клауз)`);
    }
    handleReset();
    onClose();
  };

  // Action 2: Apply to current working document
  const handleApplyToDocumentAction = () => {
    if (!importResult) return;

    const modifiedResult: DocxImportResult = {
      ...importResult,
      documentTitle: templateName,
      category,
      partyARole,
      partyBRole,
      clauses: selectedClauses
    };

    const { clauses } = convertImportResultToTemplate(modifiedResult, templateName, category);
    onApplyToDocument(clauses, templateName, importResult.detectedVariables, {
      partyA: partyARole,
      partyB: partyBRole
    });

    if (showToast) {
      showToast(`Договор «${templateName}» загружен в редактор (${clauses.length} пунктов)`);
    }
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* HEADER */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <FileUp className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">
                Импорт договора из Word (.docx)
              </h3>
              <p className="text-[11px] text-slate-400">
                Автоматическая конвертация файла в шаблон и структурированные клаузы
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5 bg-slate-50">
          
          {/* STEP 1: UPLOAD ZONE (WHEN NO RESULT YET) */}
          {!importResult && (
            <div className="space-y-4 max-w-xl mx-auto py-8">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/80 shadow-md scale-[1.01]'
                    : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/80 shadow-2xs'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                />

                {isLoading ? (
                  <div className="flex flex-col items-center space-y-3 py-6">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <span className="text-xs font-bold text-slate-700">
                      Анализ структуры документа Word...
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Выделение заголовков, разделов, сторон и переменных
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                      <UploadCloud className="w-7 h-7" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-slate-900">
                        Перетащите сюда файл .docx или нажмите для выбора
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Поддерживаются любые договоры Microsoft Word с нумерацией разделов
                      </p>
                    </div>

                    <button
                      type="button"
                      className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-2xs transition-colors pointer-events-none"
                    >
                      Выбрать файл на компьютере
                    </button>
                  </>
                )}
              </div>

              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-600 shadow-2xs">
                <div className="font-extrabold text-slate-800 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Что делает конвертер:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500">
                  <li>Автоматически разделяет документ на статьи и пункты (1.1, 1.2 и т.д.)</li>
                  <li>Определяет роли сторон договора (Поставщик/Покупатель, Заказчик/Исполнитель)</li>
                  <li>Находит переменные в квадратных скобках вида <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">[Сумма]</code></li>
                  <li>Позволяет отредактировать распознанный текст перед сохранением</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & CUSTOMIZATION (WHEN RESULT READY) */}
          {importResult && (
            <div className="space-y-4">
              
              {/* TOP SUMMARY & CONTROLS */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Название шаблона / документа
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Категория
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Роль Стороны 1
                  </label>
                  <input
                    type="text"
                    value={partyARole}
                    onChange={(e) => setPartyARole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Роль Стороны 2
                  </label>
                  <input
                    type="text"
                    value={partyBRole}
                    onChange={(e) => setPartyBRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Загрузить другой файл
                  </button>
                </div>
              </div>

              {/* DETECTED VARIABLES PILLS */}
              {Object.keys(importResult.detectedVariables).length > 0 && (
                <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-[11px] font-extrabold text-amber-900">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    <span>Распознанные переменные ({Object.keys(importResult.detectedVariables).length}):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(importResult.detectedVariables).map(vKey => (
                      <span
                        key={vKey}
                        className="px-2 py-0.5 bg-white border border-amber-300 rounded text-[11px] font-bold text-amber-950"
                      >
                        [{vKey}]
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* RECOGNIZED CLAUSES LIST */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 px-1">
                  <div className="flex items-center space-x-1.5">
                    <ListChecks className="w-4 h-4 text-blue-600" />
                    <span>Распознанные разделы и клаузы ({selectedClauses.length}):</span>
                  </div>
                  <span className="text-[11px] font-normal text-slate-500">
                    Вы можете отредактировать текст перед сохранением
                  </span>
                </div>

                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {selectedClauses.map((clause, idx) => {
                    const numberedIdx = selectedClauses.slice(0, idx + 1).filter(c => !c.hideNumber).length;
                    return (
                      <div
                        key={clause.id}
                        className={`bg-white border rounded-xl p-3.5 space-y-2 shadow-2xs transition-colors ${
                          clause.hideNumber ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200 hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {clause.hideNumber ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-extrabold text-[10px] rounded">
                                Преамбула (без номера)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-extrabold text-[10px] rounded">
                                № {numberedIdx}
                              </span>
                            )}
                            <h5 className="text-xs font-bold text-slate-900">
                              {clause.title || clause.name}
                            </h5>
                          </div>

                          <div className="flex items-center space-x-1">
                            {editingClauseId === clause.id ? (
                              <button
                                type="button"
                                onClick={() => handleSaveClauseEdit(clause.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold flex items-center space-x-1 shadow-2xs cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>Готово</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingClauseId(clause.id);
                                  setEditClauseContent(clause.content);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Редактировать текст пункта"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveClause(clause.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                              title="Исключить пункт"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {editingClauseId === clause.id ? (
                          <textarea
                            value={editClauseContent}
                            onChange={(e) => setEditClauseContent(e.target.value)}
                            rows={4}
                            className="w-full bg-slate-50 border border-blue-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed font-sans"
                          />
                        ) : (
                          <p className="text-xs text-slate-600 line-clamp-3 whitespace-pre-line leading-relaxed">
                            {clause.content}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Отмена
          </button>

          {importResult && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleSaveTemplateAction}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Сохранить в шаблоны</span>
              </button>

              <button
                type="button"
                onClick={handleApplyToDocumentAction}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold rounded-xl text-xs shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Открыть в редакторе</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
