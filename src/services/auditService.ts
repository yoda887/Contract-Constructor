import { ContractDocument, AuditResult, AuditRisk } from '../types';
import { resolveVariableValue } from '../utils/variableResolver';

export function runDocumentAudit(document: ContractDocument): AuditResult {
  const risks: AuditRisk[] = [];
  const unfilledVariables: string[] = [];
  const missingSections: string[] = [];

  // 1. Scan for unfilled variables [Variable]
  document.clauses.forEach(clause => {
    const matches = clause.contentRu.match(/\[([^\]]+)\]/g);
    if (matches) {
      matches.forEach(m => {
        const varKey = m.replace('[', '').replace(']', '');
        const filledVal = resolveVariableValue(varKey, document.customVariables);
        if (!filledVal || filledVal.trim() === '' || filledVal === varKey) {
          if (!unfilledVariables.includes(varKey)) {
            unfilledVariables.push(varKey);
          }
        }
      });
    }
  });

  if (unfilledVariables.length > 0) {
    risks.push({
      level: 'HIGH',
      title: 'Незаполненные переменные в договоре',
      description: `Найдены незаполненные поля: ${unfilledVariables.map(v => `[${v}]`).join(', ')}. Данные условия могут быть признаны несогласованными.`,
      suggestion: 'Заполните значение переменных через анкету Q&A или добавьте значения по умолчанию.'
    });
  }

  // 2. Check for critical clauses (e.g., Liability, Dispute Resolution, Term)
  const categories = document.clauses.map(c => c.category);
  if (!categories.some(c => c.toLowerCase().includes('ответственность'))) {
    missingSections.push('Ответственность сторон');
    risks.push({
      level: 'MEDIUM',
      title: 'Отсутствует раздел ответственности сторон',
      description: 'Договор не содержит условий о неустойке, штрафах и ответственности за нарушение сроков.',
      suggestion: 'Добавьте из библиотеки пункт "Неустойка за несвоевременную поставку".'
    });
  }

  if (!categories.some(c => c.toLowerCase().includes('форс-мажор'))) {
    missingSections.push('Форс-мажор');
    risks.push({
      level: 'LOW',
      title: 'Отсутствует оговорка про Форс-Мажор',
      description: 'Нет условий об освобождении от ответственности при форс-мажоре или военных действиях.',
      suggestion: 'Добавьте пункт "Форс-мажорные обстоятельства".'
    });
  }

  // Calculate quality score
  let score = 100;
  score -= unfilledVariables.length * 10;
  score -= risks.filter(r => r.level === 'HIGH').length * 20;
  score -= risks.filter(r => r.level === 'MEDIUM').length * 10;
  score -= risks.filter(r => r.level === 'LOW').length * 5;
  if (score < 0) score = 0;

  let summary = 'Договор соответствует юридическим стандартам.';
  if (score < 60) {
    summary = 'Договор содержит критические риски и требует доработки перед подписание.';
  } else if (score < 85) {
    summary = 'Договор составлен корректно, но есть замечания по полноте условий.';
  }

  return {
    score,
    unfilledVariables,
    risks,
    missingSections,
    summary
  };
}
