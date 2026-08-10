import { useState, useMemo, useEffect } from 'react';
import { 
  Clause, FolderNode, ContractDocument, SampleTemplate, 
  QuestionnaireAnswer, AuditResult 
} from '../types';
import { INITIAL_CLAUSES, INITIAL_FOLDERS, SAMPLE_TEMPLATES, INITIAL_QUESTIONNAIRE } from '../data/initialData';
import { runDocumentAudit } from '../services/auditService';
import { 
  seedFirestoreIfEmpty, subscribeToClauses, subscribeToTemplates, subscribeToFolders,
  saveClauseToDb, deleteClauseFromDb, saveTemplateToDb, deleteTemplateFromDb, saveContractToDb
} from '../services/firebaseService';

export function useContractManager() {
  // Main Top Mode: 'drafting' (Конструктор шаблонов) vs 'qa' (Q&A Заполнение)
  const [mainMode, setActiveMainMode] = useState<'drafting' | 'qa'>('drafting');

  // Templates Management State
  const [templates, setTemplates] = useState<SampleTemplate[]>(SAMPLE_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(SAMPLE_TEMPLATES[0].id);

  // Library State
  const [folders, setFolders] = useState<FolderNode[]>(INITIAL_FOLDERS);
  const [clauses, setClauses] = useState<Clause[]>(INITIAL_CLAUSES);

  // Sync with Firestore
  useEffect(() => {
    seedFirestoreIfEmpty();

    const unsubClauses = subscribeToClauses((dbClauses) => {
      setClauses(dbClauses);
    });

    const unsubTemplates = subscribeToTemplates((dbTemplates) => {
      setTemplates(dbTemplates);
    });

    const unsubFolders = subscribeToFolders((dbFolders) => {
      setFolders(dbFolders);
    });

    return () => {
      unsubClauses();
      unsubTemplates();
      unsubFolders();
    };
  }, []);

  // Active Draft / Document State
  const [document, setDocument] = useState<ContractDocument>({
    id: 'doc-1',
    title: 'ДОГОВОР ПОСТАВКИ № 2026/08-01',
    number: '2026/08-01',
    date: new Date().toISOString().split('T')[0],
    city: 'г. Киев',
    partyA: {
      name: 'ООО "ПРОМПОСТАВКА ЛТД"',
      shortName: 'Поставщик',
      role: 'Поставщик',
      code: '38492019',
      address: '01001, г. Киев, ул. Крещатик, д. 15',
      director: 'Петров Алексей Сергеевич',
      bankAccount: 'UA863065000000026004300001234',
      bankName: 'АО "ПРИВАТБАНК"',
      mfo: '305299',
      email: 'sales@prompostavka.com',
      phone: '+380 44 123-45-67'
    },
    partyB: {
      name: 'АО "ДНЕПРОПРЕСС СТАЛЬ"',
      shortName: 'Покупатель',
      role: 'Покупатель',
      code: '24991515',
      address: '49000, г. Днепр, пр. Богдана Хмельницкого, д. 139',
      director: 'Резник Надежда Игоревна',
      bankAccount: 'UA863065000000026004300007833',
      bankName: 'АО "РАДАБАНК"',
      mfo: '306500',
      email: 'info@dnepropress.dp.ua',
      phone: '+380 56 789-01-23'
    },
    clauses: INITIAL_CLAUSES.slice(0, 8),
    customVariables: {
      'Товар': 'Металлопрокат марки Ст3сп',
      'Продукция': 'Лист стальной 10мм',
      'Счет-фактура': 'Счет-фактура № 102',
      '0,5': '0,5',
      '18': '18',
      '5': '5',
      '14': '14',
      '31.12.2026': '31.12.2026'
    },
    bilingual: false,
    includeTitleInClause: true,
    includeNumbering: true,
    bulletFormat: false,
    questionnaire: INITIAL_QUESTIONNAIRE
  });

  // Library State
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>(['1', '2', '8', '11']);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Drafting Sub-Tabs: 'structure' | 'library'
  const [draftingTab, setDraftingTab] = useState<'structure' | 'library'>('library');

  // Questionnaire Wizard Answers State in Q&A
  const [qaAnswers, setQaAnswers] = useState<Record<string, any>>({
    'product_name': 'Металлопрокат марки Ст3сп',
    'payment_type': 'Предоплата (100%)',
    'penalty_rate': 0.5,
    'delay_days': 5,
    'annual_interest': 18,
    'include_edo': true,
    'sanctions_check': true,
    'jurisdiction': 'Украина (Хозяйственный суд)'
  });

  // Q&A Wizard Step Index
  const [qaStepIndex, setQaStepIndex] = useState<number>(0);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Modals visibility
  const [showEditModal, setShowEditModal] = useState(false);
  const [clauseToEdit, setClauseToEdit] = useState<Clause | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  const activeTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  // Apply Template
  const handleApplyTemplate = (tpl: SampleTemplate) => {
    setSelectedTemplateId(tpl.id);
    const templateClauses = clauses.filter(c => tpl.clauseIds.includes(c.id));

    const clauseQuestions: QuestionnaireAnswer[] = [];
    templateClauses.forEach(c => {
      if (c.questions && c.questions.length > 0) {
        c.questions.forEach(q => {
          if (!clauseQuestions.some(existing => existing.id === q.id)) {
            clauseQuestions.push(q);
          }
        });
      }
    });

    const combinedQuestionnaire = [...(tpl.questionnaire || [])];
    clauseQuestions.forEach(cq => {
      if (!combinedQuestionnaire.some(fq => fq.id === cq.id)) {
        combinedQuestionnaire.push(cq);
      }
    });

    setDocument(prev => ({
      ...prev,
      title: `ДОГОВОР (${tpl.name.toUpperCase()}) № 2026/01`,
      partyA: { ...prev.partyA, role: tpl.partyARole },
      partyB: { ...prev.partyB, role: tpl.partyBRole },
      clauses: templateClauses,
      questionnaire: combinedQuestionnaire,
      customVariables: tpl.customVariables || {}
    }));

    const initialAns: Record<string, any> = {};
    combinedQuestionnaire.forEach(q => {
      if (q.value !== undefined) initialAns[q.id] = q.value;
    });
    setQaAnswers(initialAns);
    setQaStepIndex(0);

    showToast(`Загружен шаблон "${tpl.name}"`);
  };

  // Q&A Answer Change
  const handleQaAnswerChange = (questionId: string, val: any) => {
    setQaAnswers(prev => ({ ...prev, [questionId]: val }));

    const qItem = document.questionnaire.find(q => q.id === questionId);
    if (!qItem) return;

    if (qItem.affectsVariable) {
      setDocument(prev => ({
        ...prev,
        customVariables: {
          ...prev.customVariables,
          [qItem.affectsVariable!]: String(val)
        }
      }));
    }

    if (qItem.affectsClauseId) {
      const clauseInLibrary = clauses.find(c => c.id === qItem.affectsClauseId);
      if (clauseInLibrary) {
        if (val === true) {
          if (!document.clauses.some(c => c.id === clauseInLibrary.id)) {
            setDocument(prev => ({
              ...prev,
              clauses: [...prev.clauses, clauseInLibrary]
            }));
            showToast(`В договор автоматически добавлен пункт: ${clauseInLibrary.name}`);
          }
        } else if (val === false) {
          setDocument(prev => ({
            ...prev,
            clauses: prev.clauses.filter(c => c.id !== clauseInLibrary.id)
          }));
          showToast(`Из договора исключен пункт: ${clauseInLibrary.name}`);
        }
      }
    }
  };

  // Add Clause to Document
  const handleAddClauseToDocument = (clause: Clause) => {
    if (document.clauses.some(c => c.id === clause.id)) {
      showToast('Пункт уже добавлен в документ');
      return;
    }

    setDocument(prev => {
      const nextClauses = [...prev.clauses, clause];
      // Gather any questionnaire questions
      const nextQuestions = [...prev.questionnaire];
      if (clause.questions && clause.questions.length > 0) {
        clause.questions.forEach(q => {
          if (!nextQuestions.some(existing => existing.id === q.id)) {
            nextQuestions.push(q);
          }
        });
      }
      return {
        ...prev,
        clauses: nextClauses,
        questionnaire: nextQuestions
      };
    });

    showToast(`Добавлено в шаблон: ${clause.name}`);
  };

  // Remove Clause from Document
  const handleRemoveClauseFromDocument = (clauseId: string) => {
    setDocument(prev => ({
      ...prev,
      clauses: prev.clauses.filter(c => c.id !== clauseId)
    }));
    showToast('Пункт удален из конструктора');
  };

  // Change Clause Indentation Level in Document
  const handleChangeClauseLevel = (clauseId: string, delta: number) => {
    setDocument(prev => ({
      ...prev,
      clauses: prev.clauses.map(c => {
        if (c.id === clauseId) {
          const currentLevel = c.level || 0;
          const newLevel = Math.max(0, Math.min(3, currentLevel + delta));
          return { ...c, level: newLevel };
        }
        return c;
      })
    }));
  };

  // Reorder Clause in Document
  const handleReorderClause = (index: number, direction: 'up' | 'down') => {
    const newClauses = [...document.clauses];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newClauses.length) return;

    const temp = newClauses[index];
    newClauses[index] = newClauses[targetIdx];
    newClauses[targetIdx] = temp;

    setDocument(prev => ({ ...prev, clauses: newClauses }));
  };

  // Clause Library Operations
  const handleSaveClauseToLibrary = (savedClause: Clause) => {
    saveClauseToDb(savedClause);

    setClauses(prev => {
      const exists = prev.some(c => c.id === savedClause.id);
      if (exists) {
        return prev.map(c => c.id === savedClause.id ? savedClause : c);
      }
      return [savedClause, ...prev];
    });

    // Also update document clauses if active and sync questions into document.questionnaire
    setDocument(prev => {
      const updatedClauses = prev.clauses.map(c => c.id === savedClause.id ? savedClause : c);
      const nextQuestions = [...prev.questionnaire];

      const newClauseQuestions = savedClause.questions || [];
      newClauseQuestions.forEach(q => {
        const existingIdx = nextQuestions.findIndex(existing => existing.id === q.id);
        if (existingIdx >= 0) {
          nextQuestions[existingIdx] = q;
        } else {
          nextQuestions.push(q);
        }
      });

      return {
        ...prev,
        clauses: updatedClauses,
        questionnaire: nextQuestions
      };
    });

    showToast(`Сохранен пункт "${savedClause.name}"`);
  };

  const handleDeleteClauseFromLibrary = (clauseId: string) => {
    deleteClauseFromDb(clauseId);
    setClauses(prev => prev.filter(c => c.id !== clauseId));
    setDocument(prev => ({
      ...prev,
      clauses: prev.clauses.filter(c => c.id !== clauseId)
    }));
    showToast('Пункт удален из библиотеки');
  };

  const handleToggleFavorite = (clauseId: string) => {
    const target = clauses.find(c => c.id === clauseId);
    if (target) {
      const updated = { ...target, isFavorite: !target.isFavorite };
      saveClauseToDb(updated);
    }
    setClauses(prev => prev.map(c => c.id === clauseId ? { ...c, isFavorite: !c.isFavorite } : c));
  };

  // Run Audit
  const handleRunAudit = () => {
    const result = runDocumentAudit(document);
    setAuditResult(result);
    setShowAuditModal(true);
  };

  // Save template
  const handleSaveTemplate = (tpl: SampleTemplate) => {
    saveTemplateToDb(tpl);
    setTemplates(prev => {
      const exists = prev.some(t => t.id === tpl.id);
      if (exists) {
        return prev.map(t => t.id === tpl.id ? tpl : t);
      }
      return [tpl, ...prev];
    });
    showToast(`Шаблон "${tpl.name}" сохранен`);
  };

  // Delete template
  const handleDeleteTemplate = (templateId: string) => {
    deleteTemplateFromDb(templateId);
    setTemplates(prev => {
      const updated = prev.filter(t => t.id !== templateId);
      if (selectedTemplateId === templateId && updated.length > 0) {
        setSelectedTemplateId(updated[0].id);
      }
      return updated;
    });
    showToast('Шаблон удален');
  };

  return {
    mainMode,
    setActiveMainMode,
    templates,
    setTemplates,
    selectedTemplateId,
    setSelectedTemplateId,
    activeTemplate,
    document,
    setDocument,
    folders,
    setFolders,
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
    setQaAnswers,
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
  };
}
