import { ContractDocument } from '../types';

export interface VariableDescriptor {
  key: string;
  currentValue: string;
  source: 'preamble' | 'questionnaire' | 'direct';
  questionLabel?: string;
  questionId?: string;
  clauseCount: number;
}

/**
 * Helper to strip Russian endings for declension / stem matching
 */
const stripRussianEnding = (str: string) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/(ами|ям|ях|ому|ему|ом|ем|ой|ей|ою|ею|а|я|у|ю|и|ы|е|х)$/i, '');
};

/**
 * Resolves variable value from customVariables dictionary and contract document context.
 * Supports exact match, preamble party matching, case-insensitive match, and Russian declension/stem matching.
 */
export function resolveVariableValue(
  varKey: string,
  customVariables: Record<string, string>,
  doc?: ContractDocument
): string | undefined {
  if (!varKey) return undefined;

  const trimmed = varKey.trim();

  // 1. Direct match in customVariables
  if (customVariables && customVariables[trimmed] !== undefined && customVariables[trimmed] !== '') {
    return customVariables[trimmed];
  }

  // 2. Document metadata & Preamble Parties Resolution
  if (doc) {
    const lowerKey = trimmed.toLowerCase();

    // Metadata checks
    if (['номер договора', 'номер', '№ договора', '№'].includes(lowerKey) && doc.number) {
      return doc.number;
    }
    if (['дата договора', 'дата'].includes(lowerKey) && doc.date) {
      return doc.date;
    }
    if (['город', 'место составления', 'город договора'].includes(lowerKey) && doc.city) {
      return doc.city;
    }
    if (['название договора', 'наименование договора'].includes(lowerKey) && doc.title) {
      return doc.title;
    }

    // Party A role & name match
    const partyAName = doc.partyA.shortName || doc.partyA.name;
    if (partyAName) {
      if (
        lowerKey === 'сторона а' ||
        lowerKey === 'сторона1' ||
        lowerKey === 'сторона 1'
      ) {
        return partyAName;
      }
    }

    // Party B role & name match
    const partyBName = doc.partyB.shortName || doc.partyB.name;
    if (partyBName) {
      if (
        lowerKey === 'сторона б' ||
        lowerKey === 'сторона2' ||
        lowerKey === 'сторона 2'
      ) {
        return partyBName;
      }
    }
  }

  // 3. Case-insensitive match in customVariables
  if (customVariables) {
    const lowerKey = trimmed.toLowerCase();
    for (const [k, v] of Object.entries(customVariables)) {
      if (k.toLowerCase() === lowerKey && v !== undefined && v !== '') {
        return v;
      }
    }
  }

  return undefined;
}

/**
 * Aligns customVariables with party roles and document settings from Preamble.
 */
export function alignPartyVariablesWithPreamble(doc: ContractDocument): Record<string, string> {
  const partyAName = doc.partyA.shortName || doc.partyA.name;
  const partyBName = doc.partyB.shortName || doc.partyB.name;

  const nextVars: Record<string, string> = { ...doc.customVariables };

  if (partyAName) nextVars['Сторона А'] = partyAName;
  if (partyBName) nextVars['Сторона Б'] = partyBName;

  if (doc.number) nextVars['Номер договора'] = doc.number;
  if (doc.date) nextVars['Дата договора'] = doc.date;
  if (doc.city) nextVars['Город'] = doc.city;

  return nextVars;
}

/**
 * Scans document clauses for all [variable] placeholders and classifies their editing source.
 */
export function extractAllVariablesFromDocument(doc: ContractDocument): VariableDescriptor[] {
  const foundMap: Record<string, { count: number }> = {};

  // Scan clauses content
  doc.clauses.forEach(clause => {
    const text = (clause.contentRu || '') + ' ' + (clause.contentEn || '');
    const matches = text.match(/\[([^\]]+)\]/g);
    if (matches) {
      matches.forEach(m => {
        const key = m.slice(1, -1).trim();
        if (key) {
          if (!foundMap[key]) {
            foundMap[key] = { count: 0 };
          }
          foundMap[key].count += 1;
        }
      });
    }
  });

  // Also include customVariables keys even if not found in text yet
  Object.keys(doc.customVariables || {}).forEach(k => {
    if (k && !foundMap[k]) {
      foundMap[k] = { count: 0 };
    }
  });

  const results: VariableDescriptor[] = Object.keys(foundMap).map(key => {
    const lower = key.toLowerCase();

    // Determine source
    let source: 'preamble' | 'questionnaire' | 'direct' = 'direct';
    let questionLabel: string | undefined = undefined;
    let questionId: string | undefined = undefined;

    // Is it from preamble / party roles?
    if (
      ['номер договора', 'номер', 'дата договора', 'дата', 'город', 'сторона а', 'сторона б', 'сторона 1', 'сторона 2'].includes(lower) ||
      (doc.partyA.role && doc.partyA.role.toLowerCase() === lower) ||
      (doc.partyB.role && doc.partyB.role.toLowerCase() === lower)
    ) {
      source = 'preamble';
    } else {
      // Is it linked to a questionnaire question?
      const qMatch = doc.questionnaire?.find(q => q.affectsVariable && q.affectsVariable.toLowerCase() === lower);
      if (qMatch) {
        source = 'questionnaire';
        questionLabel = qMatch.label;
        questionId = qMatch.id;
      }
    }

    const val = resolveVariableValue(key, doc.customVariables, doc) || '';

    return {
      key,
      currentValue: val,
      source,
      questionLabel,
      questionId,
      clauseCount: foundMap[key].count
    };
  });

  // Sort: preamble first, questionnaire second, direct third
  const orderMap = { preamble: 0, questionnaire: 1, direct: 2 };
  results.sort((a, b) => orderMap[a.source] - orderMap[b.source] || a.key.localeCompare(b.key));

  return results;
}

