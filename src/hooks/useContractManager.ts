import { useState, useMemo, useEffect } from 'react';
import { 
  Clause, FolderNode, ContractDocument, SampleTemplate, 
  QuestionnaireAnswer, AuditResult 
} from '../types';
import { INITIAL_CLAUSES, INITIAL_FOLDERS, SAMPLE_TEMPLATES, INITIAL_QUESTIONNAIRE } from '../data/initialData';
import { runDocumentAudit } from '../services/auditService';
import { stemsMatch } from '../utils/variableResolver';
import { generateUniqueClauseId } from '../utils/idGenerator';
import { 
  seedFirestoreIfEmpty, subscribeToClauses, subscribeToTemplates, subscribeToFolders,
  saveClauseToDb, deleteClauseFromDb, saveTemplateToDb, deleteTemplateFromDb, saveContractToDb
} from '../services/firebaseService';

export function useContractManager() {
  // Main Top Mode: 'drafting' (Конструктор шаблонов) vs 'qa' (Q&A Заполнение)
  const [mainMode, setActiveMainMode] = useState<'drafting' | 'qa'>('drafting');

  // Templates Management State
  const [templates, setTemplates] = useState<SampleTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Library State
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [clauses, setClauses] = useState<Clause[]>([]);

  // Sync with Firestore
  const [isDbLoaded, setIsDbLoaded] = useState<boolean>(false);

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

  // On initial DB load ONLY, select default template from Firestore
  useEffect(() => {
    if (templates.length === 0 || clauses.length === 0 || isDbLoaded) return;

    // Determine default template from DB on startup
    const targetTemplateId = selectedTemplateId && templates.some(t => t.id === selectedTemplateId)
      ? selectedTemplateId
      : templates[0].id;

    setSelectedTemplateId(targetTemplateId);

    const activeTpl = templates.find(t => t.id === targetTemplateId) || templates[0];
    if (activeTpl) {
      // Build clauses strictly in order of activeTpl.clauses or activeTpl.clauseIds
      const templateClauses: Clause[] = [];
      if (activeTpl.clauses && activeTpl.clauses.length > 0) {
        templateClauses.push(...activeTpl.clauses);
      } else {
        (activeTpl.clauseIds || []).forEach(cid => {
          const found = clauses.find(c => c.id === cid);
          if (found) templateClauses.push(found);
        });
      }

      // Collect clause-level questions
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

      // Combine template questionnaire questions + clause-level questions
      const combinedQuestionnaire = [...(activeTpl.questionnaire || [])];
      clauseQuestions.forEach(cq => {
        if (!combinedQuestionnaire.some(fq => fq.id === cq.id)) {
          combinedQuestionnaire.push(cq);
        }
      });

      setDocument(prev => ({
        ...prev,
        title: `ДОГОВОР (${activeTpl.name.toUpperCase()}) № 2026/01`,
        partyA: { ...prev.partyA, role: activeTpl.partyARole },
        partyB: { ...prev.partyB, role: activeTpl.partyBRole },
        clauses: templateClauses,
        questionnaire: combinedQuestionnaire,
        customVariables: activeTpl.customVariables || {}
      }));

      const initialAns: Record<string, any> = {};
      combinedQuestionnaire.forEach(q => {
        if (q.value !== undefined) initialAns[q.id] = q.value;
      });
      setQaAnswers(initialAns);
      setIsDbLoaded(true);
    }
  }, [templates, clauses, isDbLoaded, selectedTemplateId]);

  // Active Draft / Document State
  const [document, setDocument] = useState<ContractDocument>({
    id: 'doc-1',
    title: 'НОВЫЙ ДОГОВОР',
    number: 'Б/Н',
    date: new Date().toISOString().split('T')[0],
    city: 'г. Москва',
    partyA: {
      name: '',
      shortName: 'Сторона А',
      role: 'Поставщик',
      code: '',
      address: '',
      director: '',
      directorGenitive: '',
      bankAccount: '',
      bankName: '',
      mfo: '',
      email: '',
      phone: ''
    },
    partyB: {
      name: '',
      shortName: 'Сторона Б',
      role: 'Покупатель',
      code: '',
      address: '',
      director: '',
      directorGenitive: '',
      bankAccount: '',
      bankName: '',
      mfo: '',
      email: '',
      phone: ''
    },
    clauses: [],
    customVariables: {},
    bilingual: false,
    includeTitleInClause: true,
    includeNumbering: true,
    bulletFormat: false,
    questionnaire: [],
    printTitle: true,
    showSystemPreamble: false,
    repeatingLists: {}
  });

  // Selection state for active clause in template
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);

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
    
    // Order clauses strictly according to tpl.clauses or tpl.clauseIds
    const templateClauses: Clause[] = [];
    if (tpl.clauses && tpl.clauses.length > 0) {
      templateClauses.push(...tpl.clauses);
    } else {
      (tpl.clauseIds || []).forEach(cid => {
        const found = clauses.find(c => c.id === cid);
        if (found) templateClauses.push(found);
      });
    }

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

    showToast(`Загружен шаблон "${tpl.name}" из базы данных`);
  };

  // Save current document state (clauses & questionnaire) to active template in Firestore DB
  const handleSaveCurrentDocToActiveTemplate = () => {
    if (!activeTemplate) return;
    const updatedTpl: SampleTemplate = {
      ...activeTemplate,
      clauseIds: document.clauses.map(c => c.id),
      clauses: document.clauses,
      questionnaire: document.questionnaire,
      customVariables: document.customVariables
    };
    saveTemplateToDb(updatedTpl);
    setTemplates(prev => prev.map(t => t.id === updatedTpl.id ? updatedTpl : t));
    showToast(`Шаблон "${activeTemplate.name}" сохранен в базе данных`);
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

  // Direct Variable Change in Document Text or Preview
  const handleVariableChange = (varKey: string, newValue: string) => {
    const cleanKey = varKey.trim().replace(/^\[/, '').replace(/\]$/, '');
    if (!cleanKey) return;

    setDocument(prev => {
      const nextCustom = { ...prev.customVariables, [cleanKey]: newValue };

      const lowerKey = cleanKey.toLowerCase();
      let nextCity = prev.city;
      let nextDate = prev.date;
      let nextNumber = prev.number;
      let nextTitle = prev.title;
      let nextPartyA = { ...prev.partyA };
      let nextPartyB = { ...prev.partyB };

      if (['город', 'место составления', 'город договора'].includes(lowerKey)) {
        nextCity = newValue;
      } else if (['дата договора', 'дата'].includes(lowerKey)) {
        nextDate = newValue;
      } else if (['номер договора', 'номер', '№ договора', '№'].includes(lowerKey)) {
        nextNumber = newValue;
        if (prev.number && prev.title.includes(prev.number)) {
          nextTitle = prev.title.replace(prev.number, newValue);
        }
      } else if (['директор стороны а (род. падеж)', 'руководитель стороны а (род. падеж)'].includes(lowerKey)) {
        nextPartyA.directorGenitive = newValue;
      } else if (['директор стороны б (род. падеж)', 'руководитель стороны б (род. падеж)'].includes(lowerKey)) {
        nextPartyB.directorGenitive = newValue;
      } else if (['директор стороны а', 'руководитель стороны а'].includes(lowerKey)) {
        nextPartyA.director = newValue;
      } else if (['директор стороны б', 'руководитель стороны б'].includes(lowerKey)) {
        nextPartyB.director = newValue;
      } else if (['наименование стороны а', 'сторона а'].includes(lowerKey)) {
        nextPartyA.name = newValue;
        if (!nextPartyA.shortName) nextPartyA.shortName = newValue;
      } else if (['наименование стороны б', 'сторона б'].includes(lowerKey)) {
        nextPartyB.name = newValue;
        if (!nextPartyB.shortName) nextPartyB.shortName = newValue;
      }

      return {
        ...prev,
        city: nextCity,
        date: nextDate,
        number: nextNumber,
        title: nextTitle,
        partyA: nextPartyA,
        partyB: nextPartyB,
        customVariables: nextCustom
      };
    });

    // Sync matching questionnaire answers
    setDocument(currentDoc => {
      const qMatches = currentDoc.questionnaire.filter(q => {
        if (!q.affectsVariable) return q.id.toLowerCase() === cleanKey.toLowerCase();
        return (
          q.affectsVariable === cleanKey ||
          q.affectsVariable.toLowerCase() === cleanKey.toLowerCase() ||
          stemsMatch(q.affectsVariable, cleanKey)
        );
      });

      if (qMatches.length > 0) {
        setQaAnswers(prev => {
          const nextAnswers = { ...prev };
          qMatches.forEach(q => {
            if (q.type === 'number') {
              nextAnswers[q.id] = parseFloat(newValue) || 0;
            } else if (q.type === 'boolean') {
              nextAnswers[q.id] = newValue === 'true' || newValue === 'Да';
            } else {
              nextAnswers[q.id] = newValue;
            }
          });
          return nextAnswers;
        });
      }

      return currentDoc;
    });

    showToast(`Переменная [${cleanKey}] обновлена: "${newValue}"`);
  };

  // Add Clause to Document (supports relative positioning above/below target clause, or start/end)
  const handleAddClauseToDocument = (
    clause: Clause,
    targetIndex?: number,
    relativeToClauseId?: string,
    position: 'above' | 'below' | 'start' | 'end' = 'below'
  ) => {
    // Generate guaranteed unique ID across all document clauses
    const isLinked = clause.isLinkedToLibrary !== false && !clause.isAdHoc && !clause.id?.startsWith('adhoc-');
    const origLibId = clause.libraryClauseId || clause.id;
    const existingDocIds = new Set<string>(document.clauses.map(c => c.id || ''));

    const needsNewId = !clause.id || document.clauses.some(c => c.id === clause.id);
    const clauseToAdd: Clause = {
      ...clause,
      id: needsNewId ? generateUniqueClauseId(clause.isAdHoc ? 'adhoc' : 'c', existingDocIds) : clause.id,
      isLinkedToLibrary: isLinked,
      libraryClauseId: isLinked ? origLibId : undefined
    };

    setDocument(prev => {
      let insertIdx = prev.clauses.length;

      if (position === 'start') {
        insertIdx = 0;
      } else if (position === 'end') {
        insertIdx = prev.clauses.length;
      } else if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= prev.clauses.length) {
        insertIdx = targetIndex;
      } else {
        const relId = relativeToClauseId || selectedClauseId;
        if (relId) {
          const foundIdx = prev.clauses.findIndex(c => c.id === relId);
          if (foundIdx !== -1) {
            insertIdx = position === 'above' ? foundIdx : foundIdx + 1;
          }
        }
      }

      const nextClauses = [...prev.clauses];
      nextClauses.splice(insertIdx, 0, clauseToAdd);

      // Gather any questionnaire questions
      const nextQuestions = [...prev.questionnaire];
      if (clauseToAdd.questions && clauseToAdd.questions.length > 0) {
        clauseToAdd.questions.forEach(q => {
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

    setSelectedClauseId(clauseToAdd.id);
    showToast(`Добавлено в шаблон: ${clauseToAdd.name}`);
  };

  // Remove Clause from Document (with reference dependency detection)
  const handleRemoveClauseFromDocument = (clauseId: string) => {
    const targetClause = document.clauses.find(c => c.id === clauseId);
    const remainingClauses = document.clauses.filter(c => c.id !== clauseId);

    // Check if other clauses reference this clause ID or Title
    const targetId = targetClause?.id;
    const targetTitle = (targetClause?.titleRu || targetClause?.name || '').trim();
    const referencingClauses = remainingClauses.filter(cl => {
      const text = (cl.contentRu || '') + ' ' + (cl.contentEn || '');
      if (!text.includes('[ref:') && !text.includes('[#')) return false;
      if (targetId && (text.includes(`[ref:${targetId}]`) || text.includes(`[#${targetId}]`))) return true;
      if (targetTitle && (text.includes(`[ref:${targetTitle}]`) || text.includes(`[#${targetTitle}]`))) return true;
      return false;
    });

    if (selectedClauseId === clauseId) {
      setSelectedClauseId(null);
    }
    setDocument(prev => ({
      ...prev,
      clauses: remainingClauses
    }));

    if (referencingClauses.length > 0) {
      const refNames = referencingClauses.map(c => `«${c.name || c.titleRu}»`).join(', ');
      showToast(`Внимание: на удаленный пункт ссылаются: ${refNames}. Проверьте кросс-ссылки.`);
    } else {
      showToast('Пункт удален из конструктора');
    }
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

  // Toggle Clause Title Visibility in Document
  const handleToggleClauseTitle = (clauseId: string) => {
    setDocument(prev => {
      const currentDefault = prev.includeTitleInClause;
      return {
        ...prev,
        clauses: prev.clauses.map(c => {
          if (c.id === clauseId) {
            const currentShow = c.showTitle !== undefined ? c.showTitle : currentDefault;
            return { ...c, showTitle: !currentShow };
          }
          return c;
        })
      };
    });
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

  // Move clause to arbitrary position (for drag-and-drop)
  const handleMoveClause = (fromIndex: number, toIndex: number) => {
    const newClauses = [...document.clauses];
    if (fromIndex < 0 || fromIndex >= newClauses.length || toIndex < 0 || toIndex >= newClauses.length) return;
    const [moved] = newClauses.splice(fromIndex, 1);
    newClauses.splice(toIndex, 0, moved);
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

    const updateLinkedClauseData = (c: Clause, saved: Clause): Clause => {
      return {
        ...saved,
        // Preserve template/document-specific layout, level and rule configuration
        id: c.id,
        isLinkedToLibrary: true,
        libraryClauseId: saved.id,
        isAdHoc: false,
        level: c.level,
        showTitle: c.showTitle !== undefined ? c.showTitle : saved.showTitle,
        titleRu: c.showTitle === false ? '' : (saved.titleRu || saved.name),
        titleUk: c.showTitle === false ? '' : (saved.titleUk || saved.name),
        titleEn: c.showTitle === false ? '' : (saved.titleEn || saved.name),
        dependsOnClauseId: c.dependsOnClauseId,
        conditionRule: c.conditionRule,
        formatAsTitle: c.formatAsTitle,
        hideNumber: c.hideNumber,
        noAutoSubnumbers: c.noAutoSubnumbers,
        position: c.position,
        repeatClauseField: c.repeatClauseField,
        enabledCondition: c.enabledCondition,
        columnsCount: c.columnsCount,
        isMultiColumn: c.isMultiColumn
      };
    };

    const syncQuestions = (currentQuestions: QuestionnaireAnswer[], newQuestions?: QuestionnaireAnswer[]) => {
      const nextQuestions = [...currentQuestions];
      (newQuestions || []).forEach(q => {
        const existingIdx = nextQuestions.findIndex(existing => existing.id === q.id);
        if (existingIdx >= 0) {
          nextQuestions[existingIdx] = q;
        } else {
          nextQuestions.push(q);
        }
      });
      return nextQuestions;
    };

    // 1. Update active document clauses and sync questions
    let syncedDocLinkedCount = 0;
    setDocument(prev => {
      const updatedClauses = prev.clauses.map(c => {
        const isExactId = c.id === savedClause.id;
        const isLinkedToThis = (c.isLinkedToLibrary !== false && !c.isAdHoc && (c.libraryClauseId === savedClause.id || c.id === savedClause.id));

        if (isExactId || isLinkedToThis) {
          syncedDocLinkedCount++;
          return updateLinkedClauseData(c, savedClause);
        }
        return c;
      });

      return {
        ...prev,
        clauses: updatedClauses,
        questionnaire: syncQuestions(prev.questionnaire, savedClause.questions)
      };
    });

    // 2. Update ALL existing templates in state and in Firestore DB
    let syncedTemplatesCount = 0;
    setTemplates(prevTemplates => {
      return prevTemplates.map(tpl => {
        let tplChanged = false;
        let nextTplClauses = tpl.clauses;

        if (tpl.clauses && tpl.clauses.length > 0) {
          nextTplClauses = tpl.clauses.map(c => {
            const isExactId = c.id === savedClause.id;
            const isLinkedToThis = (c.isLinkedToLibrary !== false && !c.isAdHoc && (c.libraryClauseId === savedClause.id || c.id === savedClause.id));

            if (isExactId || isLinkedToThis) {
              tplChanged = true;
              return updateLinkedClauseData(c, savedClause);
            }
            return c;
          });
        }

        if (tplChanged) {
          syncedTemplatesCount++;
          const updatedTpl: SampleTemplate = {
            ...tpl,
            clauses: nextTplClauses,
            questionnaire: syncQuestions(tpl.questionnaire || [], savedClause.questions)
          };
          saveTemplateToDb(updatedTpl);
          return updatedTpl;
        }

        return tpl;
      });
    });

    if (syncedDocLinkedCount > 0 || syncedTemplatesCount > 0) {
      showToast(`Сохранен пункт "${savedClause.name}" (обновлено в ${syncedTemplatesCount} шаблон${syncedTemplatesCount === 1 ? 'е' : 'ах'}, в активном документе: ${syncedDocLinkedCount})`);
    } else {
      showToast(`Сохранен пункт "${savedClause.name}" в библиотеке`);
    }
  };

  // Add or update Ad-hoc Clause directly in Document without saving to Library
  const handleConvertClauseToAdHoc = (clauseId: string) => {
    setDocument(prev => {
      const existingDocIds = new Set<string>(prev.clauses.map(c => c.id || ''));
      const updatedClauses = prev.clauses.map(c => {
        if (c.id === clauseId) {
          return {
            ...c,
            id: c.id.startsWith('adhoc-') ? c.id : generateUniqueClauseId('adhoc', existingDocIds),
            isLinkedToLibrary: false,
            libraryClauseId: undefined,
            isAdHoc: true
          };
        }
        return c;
      });
      return {
        ...prev,
        clauses: updatedClauses
      };
    });
    showToast('Пункт отвязан от библиотеки и преобразован в свободный Ad-hoc пункт');
  };

  const handleSaveClauseToDocument = (
    savedClause: Clause,
    relativeToClauseId?: string,
    position: 'above' | 'below' | 'start' | 'end' = 'below'
  ) => {
    setDocument(prev => {
      const exists = prev.clauses.some(c => c.id === savedClause.id);
      let nextClauses: Clause[];
      if (exists) {
        nextClauses = prev.clauses.map(c => c.id === savedClause.id ? savedClause : c);
      } else {
        let insertIdx = prev.clauses.length;

        if (position === 'start') {
          insertIdx = 0;
        } else if (position === 'end') {
          insertIdx = prev.clauses.length;
        } else {
          const relId = relativeToClauseId || selectedClauseId;
          if (relId) {
            const idx = prev.clauses.findIndex(c => c.id === relId);
            if (idx !== -1) {
              insertIdx = position === 'above' ? idx : idx + 1;
            }
          }
        }

        nextClauses = [...prev.clauses];
        nextClauses.splice(insertIdx, 0, savedClause);
      }

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
        clauses: nextClauses,
        questionnaire: nextQuestions
      };
    });

    setSelectedClauseId(savedClause.id);
    showToast(`Пункт "${savedClause.name}" сохранен в договоре`);
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

    const remaining = templates.filter(t => t.id !== templateId);
    setTemplates(remaining);

    // When deleting the active template, completely clear document & questionnaire
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId('');
      setDocument(prev => ({
        ...prev,
        title: 'ДОГОВОР (БЕЗ ШАБЛОНА) № 2026/01',
        partyA: { ...prev.partyA, name: '', director: '', directorGenitive: '', role: 'Сторона 1' },
        partyB: { ...prev.partyB, name: '', director: '', directorGenitive: '', role: 'Сторона 2' },
        clauses: [],
        questionnaire: [],
        customVariables: {}
      }));
      setQaAnswers({});
      setQaStepIndex(0);
    }

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
    selectedClauseId,
    setSelectedClauseId,
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
    handleVariableChange,
    handleAddClauseToDocument,
    handleRemoveClauseFromDocument,
    handleChangeClauseLevel,
    handleToggleClauseTitle,
    handleReorderClause,
    handleMoveClause,
    handleSaveClauseToLibrary,
    handleSaveClauseToDocument,
    handleConvertClauseToAdHoc,
    handleDeleteClauseFromLibrary,
    handleToggleFavorite,
    handleRunAudit,
    handleSaveTemplate,
    handleDeleteTemplate,
    handleSaveCurrentDocToActiveTemplate
  };
}
