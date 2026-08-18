import React, { useState, useMemo } from 'react';
import { 
  GitFork, HelpCircle, Trash2, Edit3, ChevronUp, ChevronDown, 
  Plus, CheckCircle2, AlertCircle, Sparkles, Layers, Sliders, ChevronRight,
  ListOrdered, ArrowRight, CornerDownRight, Variable, FileText, RefreshCw, Combine, Search,
  X, Check, Share2, Users
} from 'lucide-react';
import { ContractDocument, Clause, QuestionnaireAnswer } from '../../types';
import { alignPartyVariablesWithPreamble } from '../../utils/variableResolver';
import { PartyForm } from '../common/PartyForm';

interface TemplateClauseEditorProps {
  document: ContractDocument;
  onUpdateDocument: (doc: ContractDocument) => void;
  onEditClause: (clause: Clause) => void;
  onSwitchToLibrary: () => void;
  selectedClauseId?: string | null;
  onSelectClause?: (clauseId: string | null) => void;
  onAddClauseAbove?: (clauseId: string) => void;
  onAddClauseBelow?: (clauseId: string) => void;
  showToast?: (msg: string) => void;
}

export const TemplateClauseEditor: React.FC<TemplateClauseEditorProps> = ({
  document,
  onUpdateDocument,
  onEditClause,
  onSwitchToLibrary,
  selectedClauseId,
  onSelectClause,
  onAddClauseAbove,
  onAddClauseBelow,
  showToast
}) => {
  // Sub-tab selection: 'rules' | 'questions' | 'variables' | 'document'
  const [activeSubTab, setActiveSubTab] = useState<'rules' | 'questions' | 'variables' | 'document'>('rules');

  const [expandedClauseId, setExpandedClauseId] = useState<string | null>(
    document.clauses.length > 0 ? document.clauses[0].id : null
  );

  // --- RULE BUILDER STATE ---
  const [ruleSourceType, setRuleSourceType] = useState<'clause' | 'variable'>('clause');
  const [ruleSourceClauseId, setRuleSourceClauseId] = useState<string>('');
  const [ruleVarName, setRuleVarName] = useState<string>('');
  const [ruleVarOperator, setRuleVarOperator] = useState<string>('==');
  const [ruleVarValue, setRuleVarValue] = useState<string>('');
  const [ruleTargetClauseId, setRuleTargetClauseId] = useState<string>('');

  // --- QUESTION BUILDER STATE ---
  const [newQText, setNewQText] = useState('');
  const [newQType, setNewQType] = useState<'text' | 'number' | 'date' | 'boolean' | 'select'>('text');
  const [newQVar, setNewQVar] = useState('');
  const [newQTargetClauseId, setNewQTargetClauseId] = useState('');
  const [newQOptions, setNewQOptions] = useState('');

  // --- EDIT QUESTION STATE ---
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQText, setEditQText] = useState('');
  const [editQType, setEditQType] = useState<'text' | 'number' | 'date' | 'boolean' | 'select'>('text');
  const [editQVar, setEditQVar] = useState('');
  const [editQTargetClauseId, setEditQTargetClauseId] = useState('');
  const [editQOptions, setEditQOptions] = useState('');

  // --- UNIFICATION / VARIABLE RENAME STATE ---
  const [selectedVarToUnify, setSelectedVarToUnify] = useState<string | null>(null);
  const [newUnifiedName, setNewUnifiedName] = useState<string>('');
  const [varSearchQuery, setVarSearchQuery] = useState<string>('');

  const handleSyncWithPreamble = () => {
    const nextVars = alignPartyVariablesWithPreamble(document);
    onUpdateDocument({
      ...document,
      customVariables: nextVars
    });
    if (showToast) {
      showToast('Названия сторон и реквизиты приведены в соответствие с преамбулой');
    }
  };

  // Extract all unique variables across document clauses, rules, questions, customVariables
  const extractedVariables = useMemo(() => {
    const varsMap = new Map<string, {
      name: string;
      clauseUsages: { id: string; title: string }[];
      conditionUsages: { id: string; title: string; rule: string }[];
      questionUsages: { id: string; label: string }[];
    }>();

    const getOrCreate = (rawName: string) => {
      const clean = rawName.replace(/^\[|\]$/g, '').trim().toUpperCase();
      if (!clean) return null;
      if (!varsMap.has(clean)) {
        varsMap.set(clean, {
          name: clean,
          clauseUsages: [],
          conditionUsages: [],
          questionUsages: []
        });
      }
      return varsMap.get(clean)!;
    };

    document.clauses.forEach(clause => {
      const title = clause.titleRu || clause.name;
      
      // Text variables
      const matchesRu = (clause.contentRu || '').match(/\[([A-Za-z0-9_А-Яа-яЁё]+)\]/g) || [];
      const matchesUk = (clause.contentUk || '').match(/\[([A-Za-z0-9_А-Яа-яЁё]+)\]/g) || [];
      const matchesEn = (clause.contentEn || '').match(/\[([A-Za-z0-9_А-Яа-яЁё]+)\]/g) || [];
      const allTextMatches = Array.from(new Set([...matchesRu, ...matchesUk, ...matchesEn]));

      allTextMatches.forEach(m => {
        const item = getOrCreate(m);
        if (item && !item.clauseUsages.some(c => c.id === clause.id)) {
          item.clauseUsages.push({ id: clause.id, title });
        }
      });

      // Declared variables
      if (clause.variables) {
        clause.variables.forEach(vName => {
          const item = getOrCreate(vName);
          if (item && !item.clauseUsages.some(c => c.id === clause.id)) {
            item.clauseUsages.push({ id: clause.id, title });
          }
        });
      }

      // Condition rules
      if (clause.conditionRule) {
        const condMatches = clause.conditionRule.match(/\[([A-Za-z0-9_А-Яа-яЁё]+)\]/g) || [];
        condMatches.forEach(m => {
          const item = getOrCreate(m);
          if (item && !item.conditionUsages.some(c => c.id === clause.id)) {
            item.conditionUsages.push({ id: clause.id, title, rule: clause.conditionRule! });
          }
        });
      }

      // Clause Questions
      if (clause.questions) {
        clause.questions.forEach(q => {
          if (q.affectsVariable) {
            const item = getOrCreate(q.affectsVariable);
            if (item && !item.questionUsages.some(qu => qu.id === q.id)) {
              item.questionUsages.push({ id: q.id, label: q.label });
            }
          }
        });
      }
    });

    // Document level questions
    (document.questionnaire || []).forEach(q => {
      if (q.affectsVariable) {
        const item = getOrCreate(q.affectsVariable);
        if (item && !item.questionUsages.some(qu => qu.id === q.id)) {
          item.questionUsages.push({ id: q.id, label: q.label });
        }
      }
    });

    // Custom variables
    if (document.customVariables) {
      Object.keys(document.customVariables).forEach(k => {
        getOrCreate(k);
      });
    }

    return Array.from(varsMap.values());
  }, [document]);

  // Detect potential duplicate/similar variables
  const potentialDuplicateGroups = useMemo(() => {
    const groups: { varA: string; varB: string; reason: string }[] = [];
    const names = extractedVariables.map(v => v.name);

    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = names[i];
        const b = names[j];
        
        // Substring match or common prefix
        if (a.includes(b) || b.includes(a)) {
          groups.push({
            varA: a,
            varB: b,
            reason: `Частичное совпадение наименований`
          });
        }
      }
    }
    return groups;
  }, [extractedVariables]);

  // Unify/Rename a variable across the entire document
  const handleUnifyVariable = (oldVarName: string, targetNewName: string) => {
    const cleanOld = oldVarName.replace(/^\[|\]$/g, '').trim().toUpperCase();
    const cleanNew = targetNewName.replace(/^\[|\]$/g, '').trim().toUpperCase();

    if (!cleanOld || !cleanNew || cleanOld === cleanNew) {
      if (showToast) showToast('Укажите корректное новое имя переменной');
      return;
    }

    // RegEx pattern to replace [OLD_VAR]
    const bracketOldRegex = new RegExp(`\\[${cleanOld}\\]`, 'g');

    // 1. Update clauses
    const updatedClauses = document.clauses.map(clause => {
      let contentRu = clause.contentRu ? clause.contentRu.replace(bracketOldRegex, `[${cleanNew}]`) : clause.contentRu;
      let contentUk = clause.contentUk ? clause.contentUk.replace(bracketOldRegex, `[${cleanNew}]`) : clause.contentUk;
      let contentEn = clause.contentEn ? clause.contentEn.replace(bracketOldRegex, `[${cleanNew}]`) : clause.contentEn;

      let conditionRule = clause.conditionRule ? clause.conditionRule.replace(bracketOldRegex, `[${cleanNew}]`) : clause.conditionRule;

      let variables = clause.variables ? clause.variables.map(v => v.toUpperCase() === cleanOld ? cleanNew : v) : undefined;

      let questions = clause.questions ? clause.questions.map(q => {
        if (q.affectsVariable && q.affectsVariable.toUpperCase() === cleanOld) {
          return { ...q, affectsVariable: cleanNew };
        }
        return q;
      }) : undefined;

      return {
        ...clause,
        contentRu,
        contentUk,
        contentEn,
        conditionRule,
        variables,
        questions
      };
    });

    // 2. Update document questionnaire
    const updatedDocQ = (document.questionnaire || []).map(q => {
      if (q.affectsVariable && q.affectsVariable.toUpperCase() === cleanOld) {
        return { ...q, affectsVariable: cleanNew };
      }
      return q;
    });

    // 3. Update customVariables
    const updatedCustomVars = { ...document.customVariables };
    if (cleanOld in updatedCustomVars) {
      const val = updatedCustomVars[cleanOld];
      delete updatedCustomVars[cleanOld];
      updatedCustomVars[cleanNew] = val;
    }

    onUpdateDocument({
      ...document,
      clauses: updatedClauses,
      questionnaire: updatedDocQ,
      customVariables: updatedCustomVars
    });

    setSelectedVarToUnify(null);
    setNewUnifiedName('');
    if (showToast) {
      showToast(`Переменная [${cleanOld}] унифицирована в [${cleanNew}] во всем шаблоне`);
    }
  };

  // Clause reordering
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newClauses = [...document.clauses];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newClauses.length) return;

    const temp = newClauses[index];
    newClauses[index] = newClauses[targetIdx];
    newClauses[targetIdx] = temp;

    onUpdateDocument({
      ...document,
      clauses: newClauses
    });
  };

  // Remove clause from template
  const handleRemoveClause = (clauseId: string) => {
    const updatedClauses = document.clauses.filter(c => c.id !== clauseId);
    const cleanedClauses = updatedClauses.map(c => {
      if (c.dependsOnClauseId === clauseId) {
        return { ...c, dependsOnClauseId: undefined };
      }
      return c;
    });

    onUpdateDocument({
      ...document,
      clauses: cleanedClauses
    });
    if (showToast) showToast('Клауза удалена из шаблона');
  };

  // Update clause partially
  const handleUpdateClause = (clauseId: string, updates: Partial<Clause>) => {
    const updatedClauses = document.clauses.map(c => {
      if (c.id === clauseId) {
        return { ...c, ...updates };
      }
      return c;
    });

    onUpdateDocument({
      ...document,
      clauses: updatedClauses
    });
  };

  // Add rule
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTargetClauseId) {
      if (showToast) showToast('Выберите целевую клаузу для применения правила');
      return;
    }

    if (ruleSourceType === 'clause') {
      if (!ruleSourceClauseId) {
        if (showToast) showToast('Выберите исходную клаузу-родитель');
        return;
      }
      handleUpdateClause(ruleTargetClauseId, {
        dependsOnClauseId: ruleSourceClauseId
      });
      if (showToast) showToast('Зависимость между клаузами создана');
    } else {
      if (!ruleVarName.trim()) {
        if (showToast) showToast('Укажите имя переменной');
        return;
      }
      const cleanV = ruleVarName.replace(/^\[|\]$/g, '').trim().toUpperCase();
      const formattedRule = `[${cleanV}] ${ruleVarOperator} '${ruleVarValue.trim()}'`;
      handleUpdateClause(ruleTargetClauseId, {
        conditionRule: formattedRule
      });
      if (showToast) showToast('Условие для клаузы сохранено');
    }

    // Reset inputs
    setRuleSourceClauseId('');
    setRuleVarName('');
    setRuleVarValue('');
    setRuleTargetClauseId('');
  };

  // Add Question
  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText.trim()) return;

    const questionId = `q_${Date.now()}`;
    const cleanVar = newQVar.replace(/^\[|\]$/g, '').trim().toUpperCase();
    const newQuestion: QuestionnaireAnswer = {
      id: questionId,
      label: newQText.trim(),
      type: newQType,
      value: newQType === 'boolean' ? false : '',
      affectsVariable: cleanVar || undefined,
      options: newQType === 'select' ? newQOptions.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      affectsClauseId: newQTargetClauseId || undefined
    };

    let updatedClauses = document.clauses;
    if (newQTargetClauseId) {
      updatedClauses = document.clauses.map(c => {
        if (c.id === newQTargetClauseId) {
          return {
            ...c,
            questions: [...(c.questions || []), newQuestion]
          };
        }
        return c;
      });
    }

    const currentDocQ = document.questionnaire || [];
    onUpdateDocument({
      ...document,
      clauses: updatedClauses,
      questionnaire: [...currentDocQ, newQuestion]
    });

    setNewQText('');
    setNewQVar('');
    setNewQOptions('');
    setNewQTargetClauseId('');
    if (showToast) showToast('Новый анкетный вопрос шаблона сохранен');
  };

  // Delete question (removes from template document clauses & document questionnaire only)
  const handleDeleteQuestion = (questionId: string, clauseId?: string) => {
    // Remove question from all clauses within this document template
    const updatedClauses = document.clauses.map(clause => {
      if (clause.questions && clause.questions.some(q => q.id === questionId)) {
        const remainingQs = clause.questions.filter(q => q.id !== questionId);
        return {
          ...clause,
          questions: remainingQs.length > 0 ? remainingQs : undefined
        };
      }
      return clause;
    });

    // Remove question from document-level questionnaire
    const updatedDocQ = (document.questionnaire || []).filter(q => q.id !== questionId);

    // Single atomic update to document only (library is not modified)
    onUpdateDocument({
      ...document,
      clauses: updatedClauses,
      questionnaire: updatedDocQ
    });

    if (showToast) showToast('Вопрос удален из шаблона');
  };

  // Start editing a question
  const handleStartEditQuestion = (item: { question: QuestionnaireAnswer; clauseTitle?: string; clauseId?: string }) => {
    setEditingQuestionId(item.question.id);
    setEditQText(item.question.label);
    setEditQType(item.question.type);
    setEditQVar(item.question.affectsVariable || '');
    setEditQTargetClauseId(item.clauseId || item.question.affectsClauseId || '');
    setEditQOptions((item.question.options || []).join(', '));
  };

  // Save edited question
  const handleSaveEditedQuestion = (editingId: string, originalClauseId?: string) => {
    if (!editQText.trim()) {
      if (showToast) showToast('Укажите текст вопроса');
      return;
    }

    const cleanVar = editQVar.replace(/^\[|\]$/g, '').trim().toUpperCase();
    const updatedQuestion: QuestionnaireAnswer = {
      id: editingId,
      label: editQText.trim(),
      type: editQType,
      value: editQType === 'boolean' ? false : '',
      affectsVariable: cleanVar || undefined,
      options: editQType === 'select' ? editQOptions.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      affectsClauseId: editQTargetClauseId || undefined
    };

    // 1. Update clauses
    const updatedClauses = document.clauses.map(clause => {
      let questions = clause.questions ? [...clause.questions] : [];
      const existsInThisClause = questions.some(q => q.id === editingId);

      if (clause.id === originalClauseId && originalClauseId !== editQTargetClauseId) {
        questions = questions.filter(q => q.id !== editingId);
      }

      if (clause.id === editQTargetClauseId) {
        if (existsInThisClause) {
          questions = questions.map(q => q.id === editingId ? updatedQuestion : q);
        } else {
          questions.push(updatedQuestion);
        }
      } else if (clause.id !== originalClauseId && existsInThisClause) {
        questions = questions.filter(q => q.id !== editingId);
      }

      return {
        ...clause,
        questions: questions.length > 0 ? questions : undefined
      };
    });

    // 2. Update document questionnaire
    const currentDocQ = document.questionnaire || [];
    const existsInDocQ = currentDocQ.some(q => q.id === editingId);
    let updatedDocQ: QuestionnaireAnswer[];

    if (existsInDocQ) {
      updatedDocQ = currentDocQ.map(q => q.id === editingId ? updatedQuestion : q);
    } else {
      updatedDocQ = [...currentDocQ, updatedQuestion];
    }

    onUpdateDocument({
      ...document,
      clauses: updatedClauses,
      questionnaire: updatedDocQ
    });

    setEditingQuestionId(null);
    if (showToast) showToast('Вопрос анкеты обновлен');
  };

  if (document.clauses.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mx-auto mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-800 text-sm mb-1">Шаблон пока пуст</h3>
        <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
          Добавьте клаузы из библиотеки, чтобы настроить между ними связи, условия и анкетные вопросы.
        </p>
        <button
          onClick={onSwitchToLibrary}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Перейти в библиотеку клауз</span>
        </button>
      </div>
    );
  }

  // Collect all questions across clauses & document
  const allQuestions: { question: QuestionnaireAnswer; clauseTitle?: string; clauseId?: string }[] = [];
  
  // Document-level questions
  (document.questionnaire || []).forEach(q => {
    const linkedClause = document.clauses.find(c => c.id === q.affectsClauseId || (c.questions && c.questions.some(cq => cq.id === q.id)));
    allQuestions.push({
      question: q,
      clauseTitle: linkedClause ? (linkedClause.titleRu || linkedClause.name) : undefined,
      clauseId: linkedClause?.id
    });
  });

  // Clause-level questions not in doc level
  document.clauses.forEach(clause => {
    (clause.questions || []).forEach(cq => {
      if (!allQuestions.some(item => item.question.id === cq.id)) {
        allQuestions.push({
          question: cq,
          clauseTitle: clause.titleRu || clause.name,
          clauseId: clause.id
        });
      }
    });
  });

  const filteredExtractedVars = extractedVariables.filter(v => 
    !varSearchQuery || v.name.toLowerCase().includes(varSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* FOUR SUB-TABS SELECTOR */}
      <div className="grid grid-cols-4 gap-0.5 bg-slate-100 p-1 rounded-xl text-[11px] font-bold border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSubTab('rules')}
          className={`py-1.5 px-1 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center sm:space-x-1 cursor-pointer text-center ${
            activeSubTab === 'rules' 
              ? 'bg-white text-purple-700 shadow-2xs font-extrabold' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <GitFork className="w-3 h-3 text-purple-600 shrink-0" />
          <span className="truncate">1. Связи</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('questions')}
          className={`py-1.5 px-1 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center sm:space-x-1 cursor-pointer text-center ${
            activeSubTab === 'questions' 
              ? 'bg-white text-emerald-700 shadow-2xs font-extrabold' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HelpCircle className="w-3 h-3 text-emerald-600 shrink-0" />
          <span className="truncate">2. Вопросы</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('variables')}
          className={`py-1.5 px-1 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center sm:space-x-1 cursor-pointer relative text-center ${
            activeSubTab === 'variables' 
              ? 'bg-white text-amber-700 shadow-2xs font-extrabold' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Variable className="w-3 h-3 text-amber-600 shrink-0" />
          <span className="truncate">3. Переменные</span>
          {potentialDuplicateGroups.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute top-1 right-1 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('document')}
          className={`py-1.5 px-1 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center sm:space-x-1 cursor-pointer text-center ${
            activeSubTab === 'document' 
              ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3 h-3 text-indigo-600 shrink-0" />
          <span className="truncate">4. Документ</span>
        </button>
      </div>



      {/* ========================================================================= */}
      {/* SUB-TAB 2: RULES & DEPENDENCIES (Конструктор сценариев и связей) */}
      {/* ========================================================================= */}
      {activeSubTab === 'rules' && (
        <div className="space-y-4">
          <div className="p-3 bg-purple-50/70 border border-purple-200/60 rounded-xl text-xs text-purple-900 flex items-start space-x-2.5">
            <GitFork className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Матрица связей и условий (Сценарии)</span>
              <p className="text-[11px] text-purple-700/80 mt-0.5">
                Задайте логику: «ЕСЛИ [Клауза A включена / Переменная X = Значение] ➔ ВКЛЮЧИТЬ КЛАУЗУ Б».
              </p>
            </div>
          </div>

          {/* ADD NEW SCENARIO RULE FORM */}
          <form onSubmit={handleAddRule} className="p-3.5 bg-white border border-purple-200 rounded-xl space-y-3 shadow-2xs">
            <h4 className="font-bold text-xs text-purple-950 flex items-center space-x-1.5">
              <Plus className="w-3.5 h-3.5 text-purple-600" />
              <span>Создать правило сценария</span>
            </h4>

            {/* TYPE SWITCHER */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setRuleSourceType('clause')}
                className={`p-2 rounded-lg border font-semibold text-left transition-all cursor-pointer ${
                  ruleSourceType === 'clause'
                    ? 'bg-purple-50 border-purple-300 text-purple-900 ring-2 ring-purple-500/10'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                1. От другой клаузы
              </button>
              <button
                type="button"
                onClick={() => setRuleSourceType('variable')}
                className={`p-2 rounded-lg border font-semibold text-left transition-all cursor-pointer ${
                  ruleSourceType === 'variable'
                    ? 'bg-purple-50 border-purple-300 text-purple-900 ring-2 ring-purple-500/10'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                2. По значению переменной
              </button>
            </div>

            {/* RULE FORM FIELDS */}
            {ruleSourceType === 'clause' ? (
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    ЕСЛИ активна родительская клауза:
                  </label>
                  <select
                    value={ruleSourceClauseId}
                    onChange={(e) => setRuleSourceClauseId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                  >
                    <option value="">-- Выберите исходную клаузу --</option>
                    {document.clauses.map((c, i) => (
                      <option key={c.id} value={c.id}>
                        #{i + 1}. {c.titleRu || c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      ЕСЛИ переменная шаблона:
                    </label>
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={ruleVarName}
                        onChange={(e) => setRuleVarName(e.target.value)}
                        placeholder="Например: ПРЕДОПЛАТА"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 uppercase"
                      />
                      {/* QUICK PICK EXISTING EXTRACTED VARIABLES */}
                      {extractedVariables.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          <span className="text-[10px] text-slate-400 font-medium">Выбрать из шаблона:</span>
                          {extractedVariables.slice(0, 5).map(v => (
                            <button
                              key={v.name}
                              type="button"
                              onClick={() => setRuleVarName(v.name)}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 font-mono transition-colors border border-slate-200"
                            >
                              [{v.name}]
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Оператор:
                    </label>
                    <select
                      value={ruleVarOperator}
                      onChange={(e) => setRuleVarOperator(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 font-bold"
                    >
                      <option value="==">==</option>
                      <option value="!=">!=</option>
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Равна значению:
                  </label>
                  <input
                    type="text"
                    value={ruleVarValue}
                    onChange={(e) => setRuleVarValue(e.target.value)}
                    placeholder="true, 'ДА' или 100000"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>
            )}

            {/* TARGET CLAUSE */}
            <div className="text-xs pt-1 border-t border-purple-100">
              <label className="block text-[11px] font-bold text-purple-900 mb-1">
                ➔ ТОГДА ВКЛЮЧИТЬ КЛАУЗУ:
              </label>
              <select
                value={ruleTargetClauseId}
                onChange={(e) => setRuleTargetClauseId(e.target.value)}
                className="w-full p-2 bg-purple-50/50 border border-purple-200 rounded-lg font-bold text-purple-950"
              >
                <option value="">-- Выберите подчиненную клаузу --</option>
                {document.clauses
                  .filter(c => c.id !== ruleSourceClauseId)
                  .map((c, i) => (
                    <option key={c.id} value={c.id}>
                      #{i + 1}. {c.titleRu || c.name}
                    </option>
                  ))
                }
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Сохранить правило сценария</span>
            </button>
          </form>

          {/* LIST OF CURRENT ACTIVE RULES */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>Действующие правила шаблона ({document.clauses.filter(c => c.dependsOnClauseId || c.conditionRule).length})</span>
            </h4>

            {document.clauses.filter(c => c.dependsOnClauseId || c.conditionRule).length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                В этом шаблоне пока не настроены правила автоматических сценариев. Все пункты отображаются безусловно.
              </p>
            ) : (
              document.clauses
                .filter(c => c.dependsOnClauseId || c.conditionRule)
                .map((clause) => {
                  const parentClause = document.clauses.find(p => p.id === clause.dependsOnClauseId);
                  return (
                    <div key={clause.id} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-2 shadow-2xs">
                      {/* CLAUSE DEPENDENCY RULE */}
                      {parentClause && (
                        <div className="flex items-center justify-between bg-amber-50/70 p-2 rounded-lg border border-amber-200/60">
                          <div className="flex items-center space-x-2 min-w-0 pr-2">
                            <GitFork className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <div className="text-[11px] truncate">
                              <span className="font-bold text-amber-950">ЕСЛИ «{parentClause.titleRu || parentClause.name}»</span>
                              <span className="mx-1.5 text-amber-600 font-bold">➔</span>
                              <span className="text-amber-900 font-semibold">ВКЛ «{clause.titleRu || clause.name}»</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUpdateClause(clause.id, { dependsOnClauseId: undefined })}
                            className="text-slate-400 hover:text-red-600 p-1 cursor-pointer shrink-0"
                            title="Удалить зависимость"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* VARIABLE CONDITION RULE */}
                      {clause.conditionRule && (
                        <div className="flex items-center justify-between bg-blue-50/70 p-2 rounded-lg border border-blue-200/60">
                          <div className="flex items-center space-x-2 min-w-0 pr-2">
                            <Variable className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <div className="text-[11px] truncate">
                              <span className="font-bold text-blue-950 font-mono">{clause.conditionRule}</span>
                              <span className="mx-1.5 text-blue-600 font-bold">➔</span>
                              <span className="text-blue-900 font-semibold">ВКЛ «{clause.titleRu || clause.name}»</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUpdateClause(clause.id, { conditionRule: undefined })}
                            className="text-slate-400 hover:text-red-600 p-1 cursor-pointer shrink-0"
                            title="Удалить правило"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: QUESTIONNAIRE MANAGER (Управление анкетными вопросами) */}
      {/* ========================================================================= */}
      {activeSubTab === 'questions' && (
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-xs text-emerald-900 flex items-start space-x-2.5">
            <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Анкетные вопросы шаблона ({allQuestions.length})</span>
              <p className="text-[11px] text-emerald-700/80 mt-0.5">
                Настраивайте вопросы, заполняющие переменные договора или активирующие специальные клаузы.
              </p>
            </div>
          </div>

          {/* ADD NEW QUESTION FORM */}
          <form onSubmit={handleAddQuestion} className="p-3.5 bg-white border border-emerald-200 rounded-xl space-y-3 shadow-2xs">
            <h4 className="font-bold text-xs text-emerald-950 flex items-center space-x-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Новый анкетный вопрос</span>
            </h4>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Текст вопроса пользователю:
              </label>
              <input
                type="text"
                required
                value={newQText}
                onChange={(e) => setNewQText(e.target.value)}
                placeholder="Например: Укажите сумму предварительной оплаты"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Тип ответа:
                </label>
                <select
                  value={newQType}
                  onChange={(e: any) => setNewQType(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="text">Текст</option>
                  <option value="number">Число</option>
                  <option value="boolean">Флаг (Да / Нет)</option>
                  <option value="date">Дата</option>
                  <option value="select">Выбор из списка</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Заполняет переменную:
                </label>
                <div className="space-y-1">
                  <input
                    type="text"
                    value={newQVar}
                    onChange={(e) => setNewQVar(e.target.value)}
                    placeholder="АВАНС_СУММА"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 uppercase"
                  />
                  {extractedVariables.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      <span className="text-[10px] text-slate-400">Из шаблона:</span>
                      {extractedVariables.slice(0, 4).map(v => (
                        <button
                          key={v.name}
                          type="button"
                          onClick={() => setNewQVar(v.name)}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 font-mono transition-colors border border-slate-200"
                        >
                          [{v.name}]
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {newQType === 'select' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Варианты ответа (через запятую):
                </label>
                <input
                  type="text"
                  value={newQOptions}
                  onChange={(e) => setNewQOptions(e.target.value)}
                  placeholder="10%, 30%, 50%, 100%"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Привязать к конкретной клаузе (опционально):
              </label>
              <select
                value={newQTargetClauseId}
                onChange={(e) => setNewQTargetClauseId(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="">-- Общий вопрос договора --</option>
                {document.clauses.map((c, i) => (
                  <option key={c.id} value={c.id}>
                    #{i + 1}. {c.titleRu || c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить вопрос в шаблон</span>
            </button>
          </form>

          {/* EXISTING QUESTIONS LIST */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Все вопросы этого шаблона ({allQuestions.length})
            </h4>

            {allQuestions.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                В шаблоне пока не созданы анкетные вопросы.
              </p>
            ) : (
              allQuestions.map(({ question, clauseTitle, clauseId }) => (
                editingQuestionId === question.id ? (
                  <div key={question.id} className="p-3 bg-emerald-50/60 border border-emerald-300 rounded-xl text-xs space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                      <span className="font-bold text-emerald-950 flex items-center space-x-1">
                        <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Редактирование вопроса</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingQuestionId(null)}
                        className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Отмена"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Текст вопроса:
                      </label>
                      <input
                        type="text"
                        required
                        value={editQText}
                        onChange={(e) => setEditQText(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Тип ответа:
                        </label>
                        <select
                          value={editQType}
                          onChange={(e: any) => setEditQType(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                        >
                          <option value="text">Текст</option>
                          <option value="number">Число</option>
                          <option value="boolean">Флаг (Да / Нет)</option>
                          <option value="date">Дата</option>
                          <option value="select">Выбор из списка</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Заполняет переменную:
                        </label>
                        <input
                          type="text"
                          value={editQVar}
                          onChange={(e) => setEditQVar(e.target.value)}
                          placeholder="ИМЯ_ПЕРЕМЕННОЙ"
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-800 uppercase"
                        />
                      </div>
                    </div>

                    {editQType === 'select' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Варианты ответа (через запятую):
                        </label>
                        <input
                          type="text"
                          value={editQOptions}
                          onChange={(e) => setEditQOptions(e.target.value)}
                          placeholder="Вариант 1, Вариант 2"
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Привязка к клаузе:
                      </label>
                      <select
                        value={editQTargetClauseId}
                        onChange={(e) => setEditQTargetClauseId(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                      >
                        <option value="">-- Общий вопрос договора --</option>
                        {document.clauses.map((c, i) => (
                          <option key={c.id} value={c.id}>
                            #{i + 1}. {c.titleRu || c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingQuestionId(null)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEditedQuestion(question.id, clauseId)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Сохранить</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={question.id} className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex items-center justify-between space-x-3 shadow-2xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{question.label}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px]">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 font-mono text-slate-600 border border-slate-200">
                          {question.type}
                        </span>
                        {question.affectsVariable && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-mono border border-emerald-200 font-bold">
                            ➔ [{question.affectsVariable}]
                          </span>
                        )}
                        {question.options && question.options.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-50 text-slate-500 border border-slate-200">
                            Опции: {question.options.join(', ')}
                          </span>
                        )}
                        {clauseTitle && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            {clauseTitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditQuestion({ question, clauseTitle, clauseId })}
                        className="text-slate-400 hover:text-emerald-600 p-1 cursor-pointer"
                        title="Редактировать вопрос"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(question.id, clauseId)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                        title="Удалить вопрос"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: VARIABLE UNIFICATION & DICTIONARY MANAGER */}
      {/* ========================================================================= */}
      {activeSubTab === 'variables' && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-950 flex items-start space-x-2.5">
            <Variable className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Унификация переменных шаблона ({extractedVariables.length})</span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Исключите дублирование и различие в названиях общих переменных (например, объедините <code className="bg-amber-100 px-1 py-0.2 rounded">[АВАНС]</code> и <code className="bg-amber-100 px-1 py-0.2 rounded">[ПРЕДОПЛАТА]</code> в одну единую переменную шаблона).
              </p>
            </div>
          </div>

          {/* POTENTIAL DUPLICATES ALERT CARD */}
          {potentialDuplicateGroups.length > 0 && (
            <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl text-xs space-y-2">
              <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                <Combine className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Обнаружены похожие переменные (Возможные дубликаты):</span>
              </div>
              <div className="space-y-1.5">
                {potentialDuplicateGroups.map((group, idx) => (
                  <div key={idx} className="p-2 bg-white rounded-lg border border-amber-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2 font-mono font-bold text-slate-800 text-[11px]">
                      <span className="text-amber-800">[{group.varA}]</span>
                      <ArrowRight className="w-3 h-3 text-amber-500" />
                      <span className="text-amber-800">[{group.varB}]</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnifyVariable(group.varA, group.varB)}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-md transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
                    >
                      <Combine className="w-3 h-3" />
                      <span>Объединить в [{group.varB}]</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEARCH & UNIFY TOOLBAR */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={varSearchQuery}
                onChange={(e) => setVarSearchQuery(e.target.value)}
                placeholder="Поиск переменной..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* RENAME / MERGE PANEL IF SELECTED */}
          {selectedVarToUnify && (
            <div className="p-3.5 bg-amber-500/10 border-2 border-amber-400 rounded-xl space-y-3 text-xs animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 flex items-center space-x-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Унификация переменной <code className="font-mono text-amber-800">[{selectedVarToUnify}]</code></span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedVarToUnify(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Укажите единое нормализованное имя (заменит <code className="font-mono">[{selectedVarToUnify}]</code> во всех клаузах, текстах, условиях и анкете):
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newUnifiedName}
                    onChange={(e) => setNewUnifiedName(e.target.value.toUpperCase())}
                    placeholder="ПРЕДОПЛАТА_СУММА"
                    className="flex-1 p-2 bg-white border border-amber-300 rounded-lg font-mono text-slate-900 font-bold uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => handleUnifyVariable(selectedVarToUnify, newUnifiedName)}
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    Применить ко всему шаблону
                  </button>
                </div>

                {/* QUICK SUGGESTIONS TO MERGE INTO ANOTHER EXISTING VARIABLE */}
                {extractedVariables.filter(v => v.name !== selectedVarToUnify).length > 0 && (
                  <div className="pt-2 border-t border-amber-200/60 space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold">Или выбрать из уже имеющихся переменных шаблона:</span>
                    <div className="flex flex-wrap gap-1">
                      {extractedVariables
                        .filter(v => v.name !== selectedVarToUnify)
                        .map(v => (
                          <button
                            key={v.name}
                            type="button"
                            onClick={() => setNewUnifiedName(v.name)}
                            className="px-2 py-1 bg-white hover:bg-amber-100 text-slate-800 hover:text-amber-900 font-mono text-[10px] rounded border border-amber-200 transition-colors"
                          >
                            [{v.name}]
                          </button>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LIST OF EXTRACTED VARIABLES */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>Все переменные шаблона ({filteredExtractedVars.length})</span>
              <span className="text-[10px] text-slate-400 font-normal">Авто-сканирование содержимого</span>
            </h4>

            {filteredExtractedVars.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                В текстах и условиях этого шаблона пока не обнаружено тегов переменных в формате <code className="font-mono">[ПЕРЕМЕННАЯ]</code>.
              </p>
            ) : (
              filteredExtractedVars.map((vItem) => {
                const isSelected = selectedVarToUnify === vItem.name;
                const totalUsages = vItem.clauseUsages.length + vItem.conditionUsages.length + vItem.questionUsages.length;

                return (
                  <div key={vItem.name} className={`p-3 bg-white border rounded-xl text-xs space-y-2 transition-all ${
                    isSelected ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                          [{vItem.name}]
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Использований: <span className="font-bold text-slate-700">{totalUsages}</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVarToUnify(vItem.name);
                          setNewUnifiedName(vItem.name);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 font-bold text-[10px] rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                      >
                        <RefreshCw className="w-3 h-3 text-amber-600" />
                        <span>Унифицировать / Изменить</span>
                      </button>
                    </div>

                    {/* USAGES BADGES & DETAILS */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-600 pt-1 border-t border-slate-100">
                      {vItem.clauseUsages.length > 0 && (
                        <div className="flex items-center space-x-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          <FileText className="w-3 h-3 text-blue-500" />
                          <span>Клаузы ({vItem.clauseUsages.length}):</span>
                          <span className="font-bold text-slate-800 truncate max-w-[150px]">
                            {vItem.clauseUsages.map(c => c.title).join(', ')}
                          </span>
                        </div>
                      )}

                      {vItem.conditionUsages.length > 0 && (
                        <div className="flex items-center space-x-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          <GitFork className="w-3 h-3 text-purple-500" />
                          <span>Условия ({vItem.conditionUsages.length}):</span>
                          <span className="font-bold text-slate-800 truncate max-w-[150px]">
                            {vItem.conditionUsages.map(c => c.title).join(', ')}
                          </span>
                        </div>
                      )}

                      {vItem.questionUsages.length > 0 && (
                        <div className="flex items-center space-x-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          <HelpCircle className="w-3-h-3 text-emerald-500" />
                          <span>Анкета ({vItem.questionUsages.length}):</span>
                          <span className="font-bold text-slate-800 truncate max-w-[150px]">
                            {vItem.questionUsages.map(q => q.label).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: DOCUMENT PANE (Настройки документа и повторяющиеся списки) */}
      {/* ========================================================================= */}
      {activeSubTab === 'document' && (
        <div className="space-y-4">
          <div className="p-3 bg-indigo-50 border border-indigo-200/60 rounded-xl text-xs text-indigo-900 flex items-start space-x-2.5">
            <Sliders className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Панель управления документом (Document pane)</span>
              <p className="text-[11px] text-indigo-700/80 mt-0.5">
                Настройте реквизиты, видимость заголовка и соберите повторяющиеся списки для автоматического размножения разделов сторон.
              </p>
            </div>
          </div>

          {/* BLOCK 1: BASE METADATA */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
            <h4 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5 pb-2 border-b border-slate-100">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>Основные реквизиты</span>
            </h4>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                  Название документа (Document Title)
                </label>
                <input
                  type="text"
                  value={document.title || ''}
                  onChange={(e) => onUpdateDocument({ ...document, title: e.target.value })}
                  placeholder="Например, Договор поставки товаров"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Номер
                  </label>
                  <input
                    type="text"
                    value={document.number || ''}
                    onChange={(e) => {
                      const newNumber = e.target.value;
                      let baseTitle = document.title;
                      const noSymbolIndex = document.title.indexOf('№');
                      if (noSymbolIndex !== -1) {
                        baseTitle = document.title.substring(0, noSymbolIndex).trim();
                      } else if (document.number && document.title.includes(document.number)) {
                        baseTitle = document.title.replace(document.number, '').trim();
                      }
                      if (!baseTitle) {
                        baseTitle = 'Договор';
                      }
                      const newTitle = newNumber ? `${baseTitle} № ${newNumber}` : baseTitle;
                      onUpdateDocument({ ...document, number: newNumber, title: newTitle });
                    }}
                    placeholder="123"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Город
                  </label>
                  <input
                    type="text"
                    value={document.city || ''}
                    onChange={(e) => onUpdateDocument({ ...document, city: e.target.value })}
                    placeholder="Москва"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Дата
                  </label>
                  <input
                    type="text"
                    value={document.date || ''}
                    onChange={(e) => onUpdateDocument({ ...document, date: e.target.value })}
                    placeholder="«___» _________ 2026 г."
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans"
                  />
                </div>
              </div>

              {/* TOGGLES */}
              <div className="space-y-2 pt-2 border-t border-slate-50">
                <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={document.printTitle !== false}
                    onChange={(e) => onUpdateDocument({ ...document, printTitle: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800">Выводить заголовок (Print title)</span>
                    <p className="text-[10px] text-slate-500">Автоматически выводит название документа в самом начале файла при экспорте и просмотре</p>
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={document.showSystemPreamble === true}
                    onChange={(e) => onUpdateDocument({ ...document, showSystemPreamble: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800">Выводить стандартную преамбулу</span>
                    <p className="text-[10px] text-slate-500">Показывает вводное описание сторон А и Б. Снимите флажок, чтобы полностью собрать преамбулу из библиотеки клауз</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* BLOCK 1.5: PARTIES (Party A & Party B) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
            <h4 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5 pb-2 border-b border-slate-100 justify-between">
              <span className="flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>Стороны договора</span>
              </span>
              <button
                type="button"
                onClick={handleSyncWithPreamble}
                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 font-extrabold text-[10px] rounded-lg border border-indigo-200 transition-colors cursor-pointer flex items-center space-x-1 shrink-0"
                title="Синхронизировать переменные во всех пунктах с реквизитами из преамбулы"
              >
                <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
                <span>Авто-приведение</span>
              </button>
            </h4>

            <div className="space-y-4 text-xs">
              {/* PARTY A */}
              <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-200/50 space-y-2.5">
                <div className="flex items-center justify-between border-b border-blue-100 pb-1.5 mb-1">
                  <span className="font-bold text-blue-950 text-[11px] uppercase tracking-wider">
                    Сторона А
                  </span>
                  <span className="bg-blue-100 text-blue-800 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                    {document.partyA.role || 'Поставщик'}
                  </span>
                </div>
                <PartyForm
                  party={document.partyA}
                  onChange={(updatedParty) => onUpdateDocument({
                    ...document,
                    partyA: updatedParty
                  })}
                  colorTheme="blue"
                />
              </div>

              {/* PARTY B */}
              <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-200/50 space-y-2.5">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5 mb-1">
                  <span className="font-bold text-emerald-950 text-[11px] uppercase tracking-wider">
                    Сторона Б
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                    {document.partyB.role || 'Покупатель'}
                  </span>
                </div>
                <PartyForm
                  party={document.partyB}
                  onChange={(updatedParty) => onUpdateDocument({
                    ...document,
                    partyB: updatedParty
                  })}
                  colorTheme="emerald"
                />
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
