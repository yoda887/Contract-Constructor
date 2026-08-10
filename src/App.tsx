import React, { useState } from 'react';
import { useContractManager } from './hooks/useContractManager';
import { Header } from './components/common/Header';
import { ToastContainer } from './components/common/ToastContainer';
import { AuditModal } from './components/common/AuditModal';
import { ClauseLibrary } from './components/clause/ClauseLibrary';
import { PreviewToolbar } from './components/constructor/PreviewToolbar';
import { TemplatePaperPreview } from './components/constructor/TemplatePaperPreview';
import { QASurveyWizard } from './components/qa/QASurveyWizard';
import { QALivePreview } from './components/qa/QALivePreview';
import { ClauseEditModal } from './components/modals/ClauseEditModal';
import { TemplateManagerModal } from './components/modals/TemplateManagerModal';
import { PreambleVariableModal } from './components/modals/PreambleVariableModal';
import { Clause } from './types';

export default function App() {
  const {
    mainMode,
    setActiveMainMode,
    templates,
    selectedTemplateId,
    activeTemplate,
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
    handleAddClauseToDocument,
    handleRemoveClauseFromDocument,
    handleChangeClauseLevel,
    handleReorderClause,
    handleSaveClauseToLibrary,
    handleDeleteClauseFromLibrary,
    handleToggleFavorite,
    handleRunAudit,
    handleSaveTemplate,
    handleDeleteTemplate
  } = useContractManager();

  // Modals visibility state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPreambleModal, setShowPreambleModal] = useState(false);

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

  // Toggle clause added/removed in document
  const handleToggleAddClause = (clause: Clause) => {
    if (document.clauses.some(c => c.id === clause.id)) {
      handleRemoveClauseFromDocument(clause.id);
    } else {
      handleAddClauseToDocument(clause);
    }
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
        onOpenNewClauseModal={() => {
          setClauseToEdit(null);
          setShowEditModal(true);
        }}
        onOpenTemplateModal={() => setShowTemplateModal(true)}
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
            onDeleteTemplate={handleDeleteTemplate}
            onOpenPreambleModal={() => setShowPreambleModal(true)}
          />
          <div className="flex-1 overflow-y-auto pr-1">
            {mainMode === 'drafting' ? (
              <TemplatePaperPreview
                document={document}
                onReorder={handleReorderClause}
                onChangeLevel={handleChangeClauseLevel}
                onRemove={handleRemoveClauseFromDocument}
                onEditClause={(clause) => {
                  setClauseToEdit(clause);
                  setShowEditModal(true);
                }}
              />
            ) : (
              <QALivePreview document={document} />
            )}
          </div>
        </div>

        {/* RIGHT CONTROL PANEL (5 cols) - INDEPENDENT SCROLL */}
        <div className="lg:col-span-5 xl:col-span-4 h-full min-h-0 overflow-y-auto pl-1 pr-1">
          
          {mainMode === 'drafting' ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-4">
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
                onToggleAddClause={handleToggleAddClause}
                onEditClause={(clause) => {
                  setClauseToEdit(clause);
                  setShowEditModal(true);
                }}
                onDeleteClause={handleDeleteClauseFromLibrary}
                onOpenNewClauseModal={() => {
                  setClauseToEdit(null);
                  setShowEditModal(true);
                }}
              />
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
              onOpenVariableModal={() => setShowPreambleModal(true)}
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
        onSave={handleSaveClauseToLibrary}
      />

      <TemplateManagerModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        templates={templates}
        availableClauses={clauses}
        onSelectTemplate={(tplId) => {
          const tpl = templates.find(t => t.id === tplId);
          if (tpl) handleApplyTemplate(tpl);
        }}
        onSaveTemplate={handleSaveTemplate}
        onDeleteTemplate={handleDeleteTemplate}
      />

      <PreambleVariableModal
        isOpen={showPreambleModal}
        onClose={() => setShowPreambleModal(false)}
        document={document}
        onUpdateDocument={setDocument}
        showToast={showToast}
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
