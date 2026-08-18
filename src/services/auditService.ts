import { ContractDocument, AuditResult, AuditRisk } from '../types';
import { extractAllVariablesFromDocument, resolveClauseReference } from '../utils/variableResolver';

export function runDocumentAudit(document: ContractDocument): AuditResult {
  const risks: AuditRisk[] = [];
  const unfilledVariables: string[] = [];
  const missingSections: string[] = [];
  const brokenReferences: string[] = [];

  // 1. Scan for unfilled variables [Variable].
  const allVariables = extractAllVariablesFromDocument(document);
  allVariables.forEach(v => {
    if (!v.currentValue || v.currentValue.trim() === '') {
      if (!unfilledVariables.includes(v.key)) {
        unfilledVariables.push(v.key);
      }
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

  // 2. Scan for broken/dangling cross-references [ref:ID] or [ref:Title]
  document.clauses.forEach(cl => {
    const text = (cl.contentRu || '') + ' ' + (cl.contentEn || '');
    const refMatches = text.match(/\[(?:ref:\s*|#)([^\]]+)\]/gi);
    if (refMatches) {
      refMatches.forEach(m => {
        const target = m.replace(/^\[(?:ref:\s*|#)/i, '').replace(/\]$/, '').trim();
        const res = resolveClauseReference(target, document);
        if (!res.found) {
          const clauseLabel = cl.titleRu || cl.name || cl.id;
          const descriptor = `[ref:${target}] в пункте «${clauseLabel}»`;
          if (!brokenReferences.includes(descriptor)) {
            brokenReferences.push(descriptor);
          }
        }
      });
    }
  });

  if (brokenReferences.length > 0) {
    risks.push({
      level: 'HIGH',
      title: 'Битые кросс-ссылки на отсутствующие или удаленные пункты',
      description: `В тексте обнаружены недействительные ссылки: ${brokenReferences.join('; ')}. В готовом документе эти ссылки отобразятся как [п. ?].`,
      suggestion: 'Отредактируйте указанные пункты и привяжите ссылки к существующим пунктам через меню ref, либо удалите неактуальные ссылки.'
    });
  }

  // 3. Check for critical clauses (e.g., Liability, Dispute Resolution, Term)
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
  score -= brokenReferences.length * 15;
  score -= risks.filter(r => r.level === 'HIGH').length * 20;
  score -= risks.filter(r => r.level === 'MEDIUM').length * 10;
  score -= risks.filter(r => r.level === 'LOW').length * 5;
  if (score < 0) score = 0;

  let summary = 'Договор соответствует юридическим стандартам.';
  if (score < 60) {
    summary = 'Договор содержит критические риски и требует доработки перед подписанием.';
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
