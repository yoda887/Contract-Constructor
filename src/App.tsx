import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, GitFork, Minimize2 } from 'lucide-react';
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

  // Resizable Splitter & Zen Mode state
  const [isZenMode, setIsZenMode] = useState(false);
  const [splitRatio, setSplitRatio] = useState<number>(58); // Percentage width for contract paper preview
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener (Escape to exit Zen Mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
        showToast('Вышли из режима фокуса (Zen Mode)');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenMode, showToast]);

  // Mouse drag event handlers for resizable splitter
  useEffect(() => {
    if (!isDraggingSplitter) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const newPercent = Math.min(Math.max((offsetX / rect.width) * 100, 32), 75);
      setSplitRatio(newPercent);
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter]);

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
    <div className="h-screen overflow-hidden bg-slate-100 flex flex-col font-ui-sans text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
      
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
        isZenMode={isZenMode}
        onToggleZenMode={() => setIsZenMode(!isZenMode)}
      />

      {/* MAIN FLEX WORKSPACE WITH RESIZABLE SPLITTER */}
      <main
        ref={workspaceRef}
        className="flex-1 min-h-0 max-w-[1700px] w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col lg:flex-row gap-2 lg:gap-0 overflow-hidden relative"
      >
        
        {/* LEFT PAPER PREVIEW - INDEPENDENT SCROLL */}
        <div
          style={{ width: isZenMode ? '100%' : undefined }}
          className={`flex flex-col h-full min-h-0 overflow-hidden space-y-3 transition-all duration-200 ${
            isZenMode ? 'max-w-4xl mx-auto w-full' : 'lg:flex-1'
          }`}
          {...(!isZenMode ? { style: { width: `${splitRatio}%` } } : {})}
        >
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

        {/* INTERACTIVE SPLITTER HANDLE */}
        {!isZenMode && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDraggingSplitter(true);
            }}
            onDoubleClick={() => setSplitRatio(58)}
            title="Перетащите для изменения ширины панелей. Двойной клик — сброс"
            className={`hidden lg:flex flex-col items-center justify-center w-3 cursor-col-resize z-30 group select-none transition-colors ${
              isDraggingSplitter ? 'bg-blue-600/20' : 'hover:bg-blue-500/10'
            }`}
          >
            <div className={`w-1 h-16 rounded-full transition-all ${
              isDraggingSplitter ? 'bg-blue-600 shadow-md' : 'bg-slate-300 group-hover:bg-blue-500'
            }`} />
          </div>
        )}

        {/* RIGHT CONTROL PANEL - INDEPENDENT SCROLL */}
        {!isZenMode && (
          <div
            style={{ width: `${100 - splitRatio}%` }}
            className="hidden lg:block h-full min-h-0 overflow-y-auto pl-2 pr-1 transition-all duration-200"
          >
            {mainMode === 'drafting' ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-full">
                {/* TAB SWITCHER HEADER */}
                <div className="p-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center space-x-2 shrink-0 font-ui-sans">
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
        )}

      </main>

      {/* FLOATING ZEN MODE EXIT BUTTON */}
      {isZenMode && (
        <button
          type="button"
          onClick={() => setIsZenMode(false)}
          className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-slate-900/90 hover:bg-slate-900 text-white rounded-full shadow-2xl border border-slate-700/80 font-bold text-xs flex items-center space-x-2 backdrop-blur-md transition-all cursor-pointer animate-fade-in"
        >
          <Minimize2 className="w-4 h-4 text-amber-400" />
          <span>Выйти из Zen Mode (Esc)</span>
        </button>
      )}

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
