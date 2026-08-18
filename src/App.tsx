import React, { useState } from 'react';
import { BookOpen, GitFork } from 'lucide-react';
import { useContractManager } from './hooks/useContractManager';
import { Header } from './components/common/Header';
import { ToastContainer } from './components/common/ToastContainer';
import { AuditModal } from './components/common/AuditModal';
import { ClauseLibrary } from './components/clause/ClauseLibrary';
import { TemplateClauseEditor } from './components/constructor/TemplateClauseEditor';
import { PreviewToolbar } from './components/constructor/PreviewToolbar';
import { ContractPaper } from './components/common/ContractPaper';
import { QASurveyWizard } from './components/qa/QASurveyWizard';
import { ClauseEditModal } from './components/modals/ClauseEditModal';
import { TemplateManagerModal } from './components/modals/TemplateManagerModal';
import { InsertClauseModal } from './components/modals/InsertClauseModal';
import { DocxImportModal } from './components/modals/DocxImportModal';
import { Clause, SampleTemplate } from './types';

export default function App() {
  const {
    mainMode,
    setActiveMainMode,
    templates,
    selectedTemplateId,
    activeTemplate,
    selectedClauseId,
    setSelectedClauseId,
    document,
    setDocument,
    folders,
    clauses,
    setClauses,
    selectedFolderId,
    setSelectedFolderId,
    selectedCategory,
    setSelectedCategory,
    expandedFolderIds,
    setExpandedFolderIds,
    searchQuery,
    setSearchQuery,
    onlyFavorites,
    setOnlyFavorites,
    draftingTab,
    setDraftingTab,
    qaAnswers,
    qaStepIndex,
    setQaStepIndex,
    toastMessage,
    showToast,
    showEditModal,
    setShowEditModal,
    clauseToEdit,
    setClauseToEdit,
    showAuditModal,
    setShowAuditModal,
    auditResult,
    handleApplyTemplate,
    handleQaAnswerChange,
    handleVariableChange,
    handleAddClauseToDocument,
    handleRemoveClauseFromDocument,
    handleChangeClauseLevel,
    handleToggleClauseTitle,
    handleReorderClause,
    handleMoveClause,
    handleSaveClauseToLibrary,
    handleSaveClauseToDocument,
    handleDeleteClauseFromLibrary,
    handleToggleFavorite,
    handleRunAudit,
    handleSaveTemplate,
    handleDeleteTemplate,
    handleSaveCurrentDocToActiveTemplate,
    handleConvertClauseToAdHoc
  } = useContractManager();

  // Modals visibility state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateModalMode, setTemplateModalMode] = useState<'select' | 'create'>('select');
  const [showDocxImportModal, setShowDocxImportModal] = useState(false);
  const [showInsertClauseModal, setShowInsertClauseModal] = useState(false);
  const [clauseToInsert, setClauseToInsert] = useState<Clause | null>(null);
  const [editModalTarget, setEditModalTarget] = useState<'library' | 'document'>('document');

  const [targetPositionSettings, setTargetPositionSettings] = useState<{
    relativeToClauseId?: string;
    position: 'above' | 'below' | 'start' | 'end';
  }>({ position: 'end' });

  // Currently selected clause in document and its number
  const selectedClauseInDoc = selectedClauseId
    ? document.clauses.find(c => c.id === selectedClauseId) || null
    : null;

  const selectedClauseIndex = selectedClauseInDoc
    ? document.clauses.findIndex(c => c.id === selectedClauseInDoc.id)
    : -1;

  const selectedClauseNumber = selectedClauseIndex !== -1 ? selectedClauseIndex + 1 : null;

  // Trigger creating a new ad-hoc clause for document
  const handleStartCreateClause = (
    position: 'above' | 'below' | 'start' | 'end' = 'end',
    relativeToClauseId?: string
  ) => {
    setClauseToEdit(null);
    setTargetPositionSettings({ position, relativeToClauseId });
    setEditModalTarget('document');
    setShowEditModal(true);
  };

  // Add clause from library to document
  const handleToggleAddClause = (
    clause: Clause,
    position: 'above' | 'below' | 'start' | 'end' = 'end',
    relativeToClauseId?: string
  ) => {
    setClauseToInsert(clause);
    setTargetPositionSettings({ position, relativeToClauseId });
    setShowInsertClauseModal(true);
  };

  // Save ad-hoc clause created in ClauseEditModal
  const handleSaveAdHocClause = (savedClause: Clause) => {
    handleSaveClauseToDocument(
      savedClause,
      targetPositionSettings.relativeToClauseId,
      targetPositionSettings.position
    );
  };

  // Folder expand/collapse toggle
  const handleToggleExpandFolder = (folderId: string) => {
    setExpandedFolderIds(prev => 
      prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId]
    );
  };

  // AI AutoFill mock generator for demo
  const handleAutoFillAI = () => {
    const sampleValues: Record<string, any> = {
      'product_name': 'Трубы стальные бесшовные ГОСТ 8732-78',
      'payment_type': 'Предоплата (100%)',
      'penalty_rate': 0.8,
      'delay_days': 3,
      'annual_interest': 22,
      'include_edo': true,
      'sanctions_check': true,
      'jurisdiction': 'Украина (Хозяйственный суд)'
    };

    Object.entries(sampleValues).forEach(([qId, val]) => {
      handleQaAnswerChange(qId, val);
    });

    showToast('AI заполнил параметры смарт-значениями');
  };

  const handleConfirmInsertClause = (
    clause: Clause,
    adaptedVariables: Record<string, string>,
    settings: {
      showTitle: boolean;
      showNumbering: boolean;
      isBullet: boolean;
      language: 'ru' | 'uk' | 'en';
      relativeToClauseId?: string;
      position?: 'above' | 'below' | 'start' | 'end';
      isLinkedToLibrary?: boolean;
    }
  ) => {
    // 1. Save adapted variables to document
    setDocument(prev => ({
      ...prev,
      customVariables: {
        ...prev.customVariables,
        ...adaptedVariables
      }
    }));

    // 2. Add clause with title formatting adjustments and linking configuration
    const isLinked = settings.isLinkedToLibrary !== false;
    const modifiedClause: Clause = {
      ...clause,
      titleRu: settings.showTitle ? (clause.titleRu || clause.name) : '',
      titleUk: settings.showTitle ? (clause.titleUk || clause.name) : '',
      titleEn: settings.showTitle ? (clause.titleEn || clause.name) : '',
      isLinkedToLibrary: isLinked,
      libraryClauseId: isLinked ? clause.id : undefined,
      isAdHoc: !isLinked
    };

    handleAddClauseToDocument(
      modifiedClause,
      undefined,
      settings.relativeToClauseId || targetPositionSettings.relativeToClauseId,
      settings.position || targetPositionSettings.position
    );
  };

  // DOCX Import handlers
  const handleImportSaveAsTemplate = (template: SampleTemplate, newClauses: Clause[]) => {
    const templateWithClauses: SampleTemplate = {
      ...template,
      clauses: newClauses,
      clauseIds: newClauses.map(c => c.id)
    };
    handleSaveTemplate(templateWithClauses);
    handleApplyTemplate(templateWithClauses);
    showToast(`Шаблон "${template.name}" успешно создан`);
  };

  const handleImportApplyToDocument = (
    newClauses: Clause[],
    title: string,
    customVars: Record<string, string>,
    roles: { partyA: string; partyB: string }
  ) => {
    setDocument(prev => ({
      ...prev,
      title: title || prev.title,
      partyA: { ...prev.partyA, role: roles.partyA || prev.partyA.role },
      partyB: { ...prev.partyB, role: roles.partyB || prev.partyB.role },
      clauses: newClauses,
      customVariables: {
        ...prev.customVariables,
        ...customVars
      }
    }));
    showToast(`Импортировано ${newClauses.length} пунктов в текущий документ`);
  };

  const documentClauseIds = document.clauses.map(c => c.id);

  return (
    <div className="h-screen overflow-hidden bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
      
      {/* HEADER */}
      <Header
        mainMode={mainMode}
        onModeChange={setActiveMainMode}
        document={document}
        onRunAudit={handleRunAudit}
        onOpenNewClauseModal={handleStartCreateClause}
        onOpenTemplateModal={() => {
          setTemplateModalMode('select');
          setShowTemplateModal(true);
        }}
        showToast={showToast}
      />

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <main className="flex-1 min-h-0 max-w-[1700px] w-full mx-auto p-3 sm:p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
        
        {/* LEFT PAPER PREVIEW (7 cols) - INDEPENDENT SCROLL */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full min-h-0 overflow-hidden space-y-3">
          <PreviewToolbar
            document={document}
            onUpdateDocumentSettings={setDocument}
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={(tplId) => {
              const tpl = templates.find(t => t.id === tplId);
              if (tpl) handleApplyTemplate(tpl);
            }}
            onSaveTemplate={handleSaveCurrentDocToActiveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onOpenTemplateModal={(mode = 'select') => {
              setTemplateModalMode(mode);
              setShowTemplateModal(true);
            }}
            onOpenDocxImportModal={() => setShowDocxImportModal(true)}
            onAddClause={handleStartCreateClause}
            selectedClause={selectedClauseInDoc}
            selectedClauseNumber={selectedClauseNumber}
            showToast={showToast}
          />
          <div className="flex-1 overflow-y-auto pr-1">
            {mainMode === 'drafting' ? (
              <ContractPaper
                document={document}
                selectedClauseId={selectedClauseId}
                onSelectClause={setSelectedClauseId}
                onReorder={handleReorderClause}
                onMoveClause={handleMoveClause}
                onChangeLevel={handleChangeClauseLevel}
                onToggleTitle={handleToggleClauseTitle}
                onRemove={handleRemoveClauseFromDocument}
                onEditClause={(clause) => {
                  setClauseToEdit(clause);
                  setEditModalTarget('document');
                  setShowEditModal(true);
                }}
                onVariableChange={handleVariableChange}
                onAddClauseAbove={(clauseId) => {
                  setSelectedClauseId(clauseId);
                  setClauseToEdit(null);
                  setEditModalTarget('document');
                  setShowEditModal(true);
                }}
                onAddClauseBelow={(clauseId) => {
                  setSelectedClauseId(clauseId);
                  setClauseToEdit(null);
                  setEditModalTarget('document');
                  setShowEditModal(true);
                }}
                onOpenLibraryForClause={(clauseId) => {
                  setSelectedClauseId(clauseId);
                  setDraftingTab('library');
                  showToast('Выберите клаузу из библиотеки справа для вставки');
                }}
                onConvertClauseToAdHoc={handleConvertClauseToAdHoc}
              />
            ) : (
              <ContractPaper
                document={document}
                readOnly={true}
                onVariableChange={handleVariableChange}
              />
            )}
          </div>
        </div>

        {/* RIGHT CONTROL PANEL (5 cols) - INDEPENDENT SCROLL */}
        <div className="lg:col-span-5 xl:col-span-4 h-full min-h-0 overflow-y-auto pl-1 pr-1">
          
          {mainMode === 'drafting' ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-full">
              {/* TAB SWITCHER HEADER */}
              <div className="p-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setDraftingTab('library')}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    draftingTab === 'library'
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>Библиотека клауз</span>
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${
                    draftingTab === 'library' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {clauses.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDraftingTab('structure')}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    draftingTab === 'structure'
                      ? 'bg-white text-purple-700 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <GitFork className="w-4 h-4 text-purple-600" />
                  <span>Редактор шаблона</span>
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${
                    draftingTab === 'structure' ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {document.clauses.length}
                  </span>
                </button>
              </div>

              {/* TAB CONTENT PANEL */}
              <div className={`flex-1 min-h-0 ${draftingTab === 'library' ? 'p-3 sm:p-4 pb-2 flex flex-col overflow-hidden' : 'p-3 sm:p-4 overflow-y-auto'}`}>
                {draftingTab === 'library' ? (
                  <ClauseLibrary
                    clauses={clauses}
                    folders={folders}
                    documentClauseIds={documentClauseIds}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                    selectedFolderId={selectedFolderId}
                    onSelectFolder={setSelectedFolderId}
                    expandedFolderIds={expandedFolderIds}
                    onToggleExpandFolder={handleToggleExpandFolder}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onlyFavorites={onlyFavorites}
                    onToggleOnlyFavorites={() => setOnlyFavorites(!onlyFavorites)}
                    selectedClause={selectedClauseInDoc}
                    selectedClauseNumber={selectedClauseNumber}
                    onToggleAddClause={handleToggleAddClause}
                    onEditClause={(clause) => {
                      setClauseToEdit(clause);
                      setEditModalTarget('library');
                      setShowEditModal(true);
                    }}
                    onDeleteClause={handleDeleteClauseFromLibrary}
                    onOpenNewClauseModal={() => {
                      setClauseToEdit(null);
                      setEditModalTarget('library');
                      setShowEditModal(true);
                    }}
                  />
                ) : (
                  <TemplateClauseEditor
                    document={document}
                    onUpdateDocument={setDocument}
                    selectedClauseId={selectedClauseId}
                    onSelectClause={setSelectedClauseId}
                    onAddClauseAbove={(clauseId) => {
                      setSelectedClauseId(clauseId);
                      setClauseToEdit(null);
                      setEditModalTarget('document');
                      setShowEditModal(true);
                    }}
                    onAddClauseBelow={(clauseId) => {
                      setSelectedClauseId(clauseId);
                      setClauseToEdit(null);
                      setEditModalTarget('document');
                      setShowEditModal(true);
                    }}
                    onEditClause={(clause) => {
                      setClauseToEdit(clause);
                      setEditModalTarget('document');
                      setShowEditModal(true);
                    }}
                    onSwitchToLibrary={() => setDraftingTab('library')}
                    showToast={showToast}
                  />
                )}
              </div>
            </div>
          ) : (
            /* Q&A SURVEY WIZARD PANEL */
            <QASurveyWizard
              questionnaire={document.questionnaire}
              qaAnswers={qaAnswers}
              stepIndex={qaStepIndex}
              onStepIndexChange={setQaStepIndex}
              onAnswerChange={handleQaAnswerChange}
              onAutoFillAI={handleAutoFillAI}
              document={document}
              onUpdateDocument={setDocument}
              showToast={showToast}
            />
          )}

        </div>

      </main>

      {/* MODALS & TOAST */}
      <ClauseEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        clause={clauseToEdit}
        folders={folders}
        targetMode={editModalTarget}
        documentClauses={document.clauses}
        onSave={editModalTarget === 'document' ? handleSaveAdHocClause : handleSaveClauseToLibrary}
        onSaveToLibrary={handleSaveClauseToLibrary}
      />

      <TemplateManagerModal
        isOpen={showTemplateModal}
        mode={templateModalMode}
        onClose={() => setShowTemplateModal(false)}
        templates={templates}
        availableClauses={clauses}
        onSelectTemplate={(tplId) => {
          const tpl = templates.find(t => t.id === tplId);
          if (tpl) handleApplyTemplate(tpl);
        }}
        onSaveTemplate={handleSaveTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onOpenDocxImport={() => setShowDocxImportModal(true)}
      />

      <DocxImportModal
        isOpen={showDocxImportModal}
        onClose={() => setShowDocxImportModal(false)}
        onSaveAsTemplate={handleImportSaveAsTemplate}
        onApplyToDocument={handleImportApplyToDocument}
        folders={folders}
        showToast={showToast}
      />

      <InsertClauseModal
        isOpen={showInsertClauseModal}
        clause={clauseToInsert}
        document={document}
        selectedClauseId={targetPositionSettings.relativeToClauseId || selectedClauseId}
        initialPosition={targetPositionSettings.position}
        onClose={() => setShowInsertClauseModal(false)}
        onInsert={handleConfirmInsertClause}
      />

      <AuditModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        result={auditResult}
      />

      <ToastContainer message={toastMessage} />

    </div>
  );
}
