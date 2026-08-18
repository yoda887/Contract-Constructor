import { ContractDocument, Clause } from '../types';
import { getHierarchicalNumber, extractClauseSubItems, isClauseTitleVisible } from './numbering';

export interface ClauseReferenceResult {
  found: boolean;
  clause?: Clause;
  number?: string;
  title?: string;
  displayText: string;
  plainText: string;
  tooltip: string;
}

/**
 * Fast helper to get rendered clauses hierarchy for numbering calculations
 * without triggering document text resolution (prevents recursion loops).
 */
export function getRenderedClausesForNumbering(doc: ContractDocument): Clause[] {
  const result: Clause[] = [];
  if (!doc || !doc.clauses) return result;

  doc.clauses.forEach(clause => {
    if (!isClauseRendered(clause, doc)) {
      return;
    }

    const repeatField = clause.repeatClauseField;
    if (repeatField) {
      const cleanField = repeatField.replace(/^#/, '').replace(/^\[/, '').replace(/\]$/, '');
      const valuesList = doc.repeatingLists?.[repeatField] || doc.repeatingLists?.[cleanField] || doc.repeatingLists?.[`#${cleanField}`];
      const count = valuesList && valuesList.length > 0 ? valuesList.length : 1;
      for (let i = 0; i < count; i++) {
        const cl = { ...clause };
        if (count > 1) {
          cl.id = `${clause.id}-repeat-${i}`;
          cl.titleRu = `${clause.titleRu} (${i + 1})`;
          if (cl.titleEn) cl.titleEn = `${clause.titleEn} (${i + 1})`;
        }
        result.push(cl);
      }
    } else {
      result.push(clause);
    }
  });

  return result;
}

/**
 * Resolves a dynamic cross-clause reference (e.g. [ref:Ответственность] or [ref:clause-id])
 * against the document's active hierarchy and calculates its actual hierarchical numbering.
 */
export function resolveClauseReference(
  targetRef: string,
  doc?: ContractDocument
): ClauseReferenceResult {
  if (!targetRef || !doc || !doc.clauses || doc.clauses.length === 0) {
    const raw = targetRef || '';
    return {
      found: false,
      displayText: `[п. ? (${raw})]`,
      plainText: `[п. ? (${raw})]`,
      tooltip: `Ссылка на пункт «${raw}» не найдена в договоре`
    };
  }

  const cleanTarget = targetRef.trim();
  const lowerTarget = cleanTarget.toLowerCase();

  const clauses = doc.clauses;
  let targetIdx = -1;
  let matchedClause: Clause | undefined = undefined;
  let subAnchor: string | undefined = undefined;

  let baseTarget = cleanTarget;
  if (cleanTarget.includes('#')) {
    const hashIndex = cleanTarget.indexOf('#');
    baseTarget = cleanTarget.substring(0, hashIndex).trim();
    subAnchor = cleanTarget.substring(hashIndex + 1).trim();
  }

  const lowerBaseTarget = baseTarget.toLowerCase();

  if (baseTarget) {
    // 1. Direct ID match (exact or case-insensitive)
    targetIdx = clauses.findIndex(c => c.id === baseTarget || c.id.toLowerCase() === lowerBaseTarget);
    if (targetIdx !== -1) {
      matchedClause = clauses[targetIdx];
    }

    // 1b. Match by libraryClauseId (if referenced clause was from library)
    if (!matchedClause) {
      targetIdx = clauses.findIndex(c => c.libraryClauseId === baseTarget || c.libraryClauseId?.toLowerCase() === lowerBaseTarget);
      if (targetIdx !== -1) {
        matchedClause = clauses[targetIdx];
      }
    }

    // 2. Exact or clean title match (titleRu, name, or titleEn) for backward compatibility
    if (!matchedClause) {
      targetIdx = clauses.findIndex(c => {
        const tRu = (c.titleRu || '').trim().toLowerCase();
        const tEn = (c.titleEn || '').trim().toLowerCase();
        const tName = (c.name || '').trim().toLowerCase();
        return tRu === lowerBaseTarget || tEn === lowerBaseTarget || tName === lowerBaseTarget;
      });
      if (targetIdx !== -1) {
        matchedClause = clauses[targetIdx];
      }
    }

    // 3. Stem or substring match against clause title or name (fallback)
    if (!matchedClause) {
      targetIdx = clauses.findIndex(c => {
        const tRu = (c.titleRu || '').trim();
        const tName = (c.name || '').trim();
        if (tRu && (stemsMatch(tRu, baseTarget) || tRu.toLowerCase().includes(lowerBaseTarget))) {
          return true;
        }
        if (tName && (stemsMatch(tName, baseTarget) || tName.toLowerCase().includes(lowerBaseTarget))) {
          return true;
        }
        return false;
      });
      if (targetIdx !== -1) {
        matchedClause = clauses[targetIdx];
      }
    }
  }

  // 4. If not found by baseTarget, check if cleanTarget is an inline bookmark across any clause (e.g. {#bookmark_name})
  if (!matchedClause && !subAnchor) {
    const bookmarkMarker = `{#${cleanTarget}}`;
    const bookmarkLowerMarker = `{#${lowerTarget}}`;
    targetIdx = clauses.findIndex(c => {
      const content = ((c.contentRu || '') + ' ' + (c.contentEn || '')).toLowerCase();
      return content.includes(bookmarkLowerMarker) || content.includes(bookmarkMarker.toLowerCase());
    });
    if (targetIdx !== -1) {
      matchedClause = clauses[targetIdx];
      subAnchor = cleanTarget;
    }
  }

  if (!matchedClause || targetIdx === -1) {
    return {
      found: false,
      displayText: `[п. ? (ссылка не найдена)]`,
      plainText: `[п. ?]`,
      tooltip: `Пункт с идентификатором «${cleanTarget}» удален или не найден в структуре договора`
    };
  }

  // Compute hierarchical number using fast structural list (avoids recursive text resolution)
  const clausesForNumbering = getRenderedClausesForNumbering(doc);
  const expandedIdx = clausesForNumbering.findIndex(c => c.id === matchedClause!.id || c.id.startsWith(`${matchedClause!.id}-repeat`));
  const isRendered = expandedIdx !== -1;

  if (!isRendered) {
    const clauseTitle = matchedClause.titleRu || matchedClause.name || cleanTarget;
    return {
      found: false,
      clause: matchedClause,
      title: clauseTitle,
      displayText: `[п. ? (${clauseTitle} - отключен)]`,
      plainText: `[п. ? (${clauseTitle})]`,
      tooltip: `Пункт «${clauseTitle}» отключен условиями договора`
    };
  }

  const rawNum = getHierarchicalNumber(clausesForNumbering, expandedIdx, doc.includeTitleInClause);
  const clauseTitle = matchedClause.titleRu || matchedClause.name || '';
  const isTitle = isClauseTitleVisible(matchedClause, doc.includeTitleInClause);

  // If subAnchor is specified (referencing a sub-item / paragraph / bookmark)
  if (subAnchor) {
    const subItems = extractClauseSubItems(matchedClause, rawNum, isTitle);
    const matchedSub = subItems.find(s => 
      s.anchor === subAnchor || 
      s.anchor.toLowerCase() === subAnchor.toLowerCase() ||
      s.id === `${matchedClause!.id}#${subAnchor}`
    );

    if (matchedSub) {
      return {
        found: true,
        clause: matchedClause,
        number: matchedSub.number,
        title: matchedSub.previewText,
        displayText: `п. ${matchedSub.number}`,
        plainText: `п. ${matchedSub.number}`,
        tooltip: `Ссылка на п. ${matchedSub.number} (${matchedSub.previewText})`
      };
    } else {
      // Fallback calculation for simple numeric sub-anchors (e.g. #2 -> 4.2)
      let subNum = rawNum;
      if (isTitle) {
        subNum = rawNum ? `${rawNum}.${subAnchor}` : subAnchor;
      } else {
        if (subAnchor === '1') {
          subNum = rawNum;
        } else {
          subNum = rawNum ? `${rawNum}.${subAnchor}` : subAnchor;
        }
      }
      return {
        found: true,
        clause: matchedClause,
        number: subNum,
        title: clauseTitle,
        displayText: `п. ${subNum}`,
        plainText: `п. ${subNum}`,
        tooltip: `Ссылка на подпункт ${subNum} пункта «${clauseTitle}»`
      };
    }
  }

  if (rawNum) {
    return {
      found: true,
      clause: matchedClause,
      number: rawNum,
      title: clauseTitle,
      displayText: `п. ${rawNum}`,
      plainText: `п. ${rawNum}`,
      tooltip: `Ссылка на ${rawNum}. ${clauseTitle || matchedClause.name || ''}`.trim()
    };
  } else if (clauseTitle) {
    return {
      found: true,
      clause: matchedClause,
      title: clauseTitle,
      displayText: `«${clauseTitle}»`,
      plainText: `«${clauseTitle}»`,
      tooltip: `Ссылка на раздел «${clauseTitle}»`
    };
  } else {
    return {
      found: true,
      clause: matchedClause,
      displayText: `п. ${expandedIdx + 1}`,
      plainText: `п. ${expandedIdx + 1}`,
      tooltip: `Ссылка на пункт #${expandedIdx + 1}`
    };
  }
}

export interface VariableDescriptor {
  key: string;
  currentValue: string;
  source: 'preamble' | 'questionnaire' | 'direct';
  questionLabel?: string;
  questionId?: string;
  clauseCount: number;
}

/**
 * List of common Russian party role terms/keywords used in contract drafting.
 */
const KNOWN_PARTY_ROLE_KEYWORDS = [
  'сторона а', 'сторона б', 'сторона 1', 'сторона 2', 'сторонаa', 'сторонаb', 'стороны', 'сторона',
  'поставщик', 'покупатель', 'заказчик', 'подрядчик', 'исполнитель',
  'арендатор', 'арендодатель', 'продавец', 'клиент', 'лицензиар', 'лицензиат',
  'комиссионер', 'комитент', 'агент', 'принципал', 'залогодатель', 'залогодержатель',
  'заемщик', 'займодавец', 'страхователь', 'страховщик', 'участник', 'партнер',
  'субподрядчик', 'поверенный', 'доверитель', 'гарант', 'бенефициар', 'цессионарий',
  'цедент', 'хранитель', 'поклажедатель', 'перевозчик', 'грузоотправитель',
  'грузополучатель', 'туроператор', 'турагент', 'субарендатор', 'субарендодатель',
  'работодатель', 'работник', 'сотрудник'
];

/**
 * Checks if a variable key corresponds to a structural party role or preamble party designation
 * (e.g. "Поставщик", "Поставщика", "Поставщику", "Покупатель", "Сторона А") or a clause adaptation variable
 * set during clause insertion in template constructor.
 * Such variables do not receive yellow parameter highlighting in the template text.
 */
export function isPartyRoleVariable(varKey: string, doc?: ContractDocument): boolean {
  if (!varKey) return false;

  const trimmed = varKey.trim();
  const lower = trimmed.toLowerCase();

  // 1. Direct or stem match against known party role terms
  if (KNOWN_PARTY_ROLE_KEYWORDS.some(kw => lower === kw || stemsMatch(trimmed, kw))) {
    return true;
  }

  // 2. Direct or stem match against document party roles
  if (doc) {
    if (doc.partyA?.role && (lower === doc.partyA.role.toLowerCase() || stemsMatch(trimmed, doc.partyA.role))) {
      return true;
    }
    if (doc.partyB?.role && (lower === doc.partyB.role.toLowerCase() || stemsMatch(trimmed, doc.partyB.role))) {
      return true;
    }

    // 3. Variables set/adapted in customVariables during clause insertion in constructor
    // (unless explicitly defined as a questionnaire question variable)
    if (doc.customVariables && (doc.customVariables[trimmed] !== undefined || Object.keys(doc.customVariables).some(k => stemsMatch(k, trimmed)))) {
      const isQuestionnaireVar = doc.questionnaire?.some(q => 
        q.affectsVariable === trimmed || 
        q.id === trimmed || 
        (q.affectsVariable && stemsMatch(q.affectsVariable, trimmed))
      );
      if (!isQuestionnaireVar) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Helper to strip Russian/Ukrainian case endings for declension / stem matching.
 * Reduces a word to an approximate stem so that e.g. "Поставщика", "Поставщику",
 * "Поставщиком" and "Поставщик" all collapse to the same comparable form.
 *
 * This is intentionally conservative: it only strips single/double-letter case
 * endings and requires the remaining stem to be at least 3 characters long,
 * to avoid false-positive matches on short, unrelated words.
 */
const stripRussianEnding = (str: string): string => {
  const cleaned = str.toLowerCase().trim();
  const stemmed = cleaned.replace(/(ами|ями|ях|ах|ому|ему|ой|ей|ою|ею|ов|ев|ым|им|а|я|у|ю|и|ы|е|о|й|ь)$/i, '');
  // Guard against over-stemming very short words (e.g. "США", "НДС")
  return stemmed.length >= 3 ? stemmed : cleaned;
};

/**
 * Compares two words ignoring Russian/Ukrainian case declension.
 */
export const stemsMatch = (a: string, b: string): boolean => {
  if (!a || !b) return false;
  const stemA = stripRussianEnding(a);
  const stemB = stripRussianEnding(b);
  return stemA === stemB;
};

/**
 * Resolves variable value from customVariables dictionary and contract document context.
 * Resolution is attempted in strict order of specificity:
 *  1. Exact key match in customVariables (strictly respects user manual bindings/adaptation)
 *  2. Case-insensitive match in customVariables
 *  3. Declension/stem match against customVariables keys (e.g. "[Подрядчика]" -> key "Подрядчик")
 *  4. Explicit document metadata & Preamble Parties Resolution (number, date, city, title, "Сторона А/Б")
 *  5. Fallback for structural party role variables (returns the variable key as-is so e.g. "Поставщика" renders clearly)
 */
export function resolveVariableValue(
  varKey: string,
  customVariables: Record<string, string>,
  doc?: ContractDocument
): string | undefined {
  if (!varKey) return undefined;

  const trimmed = varKey.trim().replace(/^\[/, '').replace(/\]$/, '');
  const vars = customVariables || {};
  const lowerKey = trimmed.toLowerCase();

  // Cross-clause references: [ref:TARGET] or [#TARGET]
  if (lowerKey.startsWith('ref:') || trimmed.startsWith('#')) {
    const targetRef = trimmed.replace(/^ref:\s*/i, '').replace(/^#\s*/, '').trim();
    const refRes = resolveClauseReference(targetRef, doc);
    return refRes.plainText;
  }

  // 1. Direct exact key match in customVariables (strictly respects manual user binding/adaptation)
  if (vars[trimmed] !== undefined && vars[trimmed] !== '') {
    return vars[trimmed];
  }

  // 2. Case-insensitive match in customVariables
  for (const [k, v] of Object.entries(vars)) {
    const cleanK = k.trim().replace(/^\[/, '').replace(/\]$/, '');
    if (cleanK.toLowerCase() === lowerKey && v !== undefined && v !== '') {
      return v;
    }
  }

  // 3. Declension/stem match against customVariables keys
  //    e.g. "[Подрядчика]" -> key "Подрядчик" -> value "Поставщика"
  for (const [k, v] of Object.entries(vars)) {
    const cleanK = k.trim().replace(/^\[/, '').replace(/\]$/, '');
    if (v !== undefined && v !== '' && stemsMatch(trimmed, cleanK)) {
      // If v has the same stem as trimmed (e.g. trimmed = 'Поставщика', v = 'Поставщик' or 'Поставщика'),
      // then no actual word/role replacement was configured by the user. Don't alter the word!
      if (stemsMatch(trimmed, v)) {
        continue;
      }
      return v;
    }
  }

  // 4. Explicit document metadata & Preamble Parties Resolution
  if (doc) {
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

    if (['директор стороны а (род. падеж)', 'руководитель стороны а (род. падеж)'].includes(lowerKey) && doc.partyA?.directorGenitive) {
      return doc.partyA.directorGenitive;
    }
    if (['директор стороны б (род. падеж)', 'руководитель стороны б (род. падеж)'].includes(lowerKey) && doc.partyB?.directorGenitive) {
      return doc.partyB.directorGenitive;
    }
    if (['директор стороны а', 'руководитель стороны а', 'директор_стороны_а'].includes(lowerKey) && doc.partyA?.director) {
      return doc.partyA.director;
    }
    if (['директор стороны б', 'руководитель стороны б', 'директор_стороны_б'].includes(lowerKey) && doc.partyB?.director) {
      return doc.partyB.director;
    }

    // Party A Requisites
    if (['адрес стороны а', 'адрес_стороны_а', 'местонахождение стороны а'].includes(lowerKey) && doc.partyA?.address) {
      return doc.partyA.address;
    }
    if (['код стороны а', 'код_стороны_а', 'код егрпоу стороны а', 'инн стороны а'].includes(lowerKey) && doc.partyA?.code) {
      return doc.partyA.code;
    }
    if (['банк стороны а', 'банк_стороны_а', 'наименование банка стороны а'].includes(lowerKey) && doc.partyA?.bankName) {
      return doc.partyA.bankName;
    }
    if (['счет стороны а', 'счет_стороны_а', 'расчетный счет стороны а', 'iban стороны а'].includes(lowerKey) && doc.partyA?.bankAccount) {
      return doc.partyA.bankAccount;
    }
    if (['роль стороны а', 'роль_стороны_а'].includes(lowerKey) && doc.partyA?.role) {
      return doc.partyA.role;
    }

    // Party B Requisites
    if (['адрес стороны б', 'адрес_стороны_б', 'местонахождение стороны б'].includes(lowerKey) && doc.partyB?.address) {
      return doc.partyB.address;
    }
    if (['код стороны б', 'код_стороны_б', 'код егрпоу стороны б', 'инн стороны б'].includes(lowerKey) && doc.partyB?.code) {
      return doc.partyB.code;
    }
    if (['банк стороны б', 'банк_стороны_б', 'наименование банка стороны б'].includes(lowerKey) && doc.partyB?.bankName) {
      return doc.partyB.bankName;
    }
    if (['счет стороны б', 'счет_стороны_б', 'расчетный счет стороны б', 'iban стороны б'].includes(lowerKey) && doc.partyB?.bankAccount) {
      return doc.partyB.bankAccount;
    }
    if (['роль стороны б', 'роль_стороны_б'].includes(lowerKey) && doc.partyB?.role) {
      return doc.partyB.role;
    }

    const partyAName = doc.partyA?.shortName || doc.partyA?.name;
    const partyBName = doc.partyB?.shortName || doc.partyB?.name;

    // Generic "Сторона А/Б/В" aliases explicitly set in preamble
    if (partyAName && ['сторона а', 'сторона1', 'сторона 1', 'сторона_а', 'сторона_1'].includes(lowerKey)) {
      return partyAName;
    }
    if (partyBName && ['сторона б', 'сторона2', 'сторона 2', 'сторона_б', 'сторона_2'].includes(lowerKey)) {
      return partyBName;
    }
  }

  // 5. Fallback for structural party role variables if no explicit customVariable was set.
  // Returns the exact variable key so that "Поставщика" renders as "Поставщика" without brackets or alterations.
  if (isPartyRoleVariable(trimmed, doc)) {
    return trimmed;
  }

  return undefined;
}

/**
 * Helper to evaluate a condition expression string, e.g. "[АВАНС] == '30%'", "[СУММА] > 100000", or "[АВАНС]"
 */
export function evaluateConditionExpression(
  exprStr: string,
  customVariables: Record<string, string>,
  doc?: ContractDocument
): boolean {
  if (!exprStr) return false;
  const trimmed = exprStr.trim();
  
  // Support Clause9 @assigned(...) function
  const isAssignedMatch = trimmed.match(/^@assigned\(([^)]+)\)$/i);
  if (isAssignedMatch) {
    let varName = isAssignedMatch[1].trim();
    if (varName.startsWith('[') && varName.endsWith(']')) {
      varName = varName.slice(1, -1);
    }
    if (varName.startsWith('#')) {
      varName = varName.slice(1);
    }

    // Resolve value from variables
    const resolved = resolveVariableValue(varName, customVariables, doc);
    if (resolved !== undefined && resolved !== '') {
      return true;
    }

    // Check if it's a concept property (e.g. seller^company-name or buyer^first-name)
    if (doc) {
      const lowerVar = varName.toLowerCase();
      if (lowerVar.includes('seller') || lowerVar.includes('partya') || lowerVar.includes('сторона а') || lowerVar.includes('сторонаа')) {
        const field = varName.split('^')[1] || varName.split('.')[1] || 'name';
        const val = (doc.partyA as any)?.[field] || (field === 'name' ? doc.partyA?.name : '');
        if (val && val.trim() !== '') return true;
      }
      if (lowerVar.includes('buyer') || lowerVar.includes('partyb') || lowerVar.includes('сторона б') || lowerVar.includes('сторонаб')) {
        const field = varName.split('^')[1] || varName.split('.')[1] || 'name';
        const val = (doc.partyB as any)?.[field] || (field === 'name' ? doc.partyB?.name : '');
        if (val && val.trim() !== '') return true;
      }
      // Also check repeating list variables if they exist in doc
      if (doc.repeatingLists?.[varName] && doc.repeatingLists[varName].length > 0) {
        return true;
      }
      if (doc.repeatingLists?.[`#${varName}`] && doc.repeatingLists[`#${varName}`].length > 0) {
        return true;
      }
    }
    return false;
  }
  
  // Match binary expression: [VAR] (==|!=|>=|<=|>|<) 'VALUE' or "VALUE" or NUMBER or [OTHER_VAR]
  const binaryMatch = trimmed.match(/^\[([^\]]+)\]\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  
  if (binaryMatch) {
    const varName = binaryMatch[1];
    const op = binaryMatch[2];
    let rightValStr = binaryMatch[3].trim();

    // Strip quotes if present
    if ((rightValStr.startsWith("'") && rightValStr.endsWith("'")) || (rightValStr.startsWith('"') && rightValStr.endsWith('"'))) {
      rightValStr = rightValStr.slice(1, -1);
    } else if (rightValStr.startsWith('[') && rightValStr.endsWith(']')) {
      const otherVar = rightValStr.slice(1, -1);
      rightValStr = resolveVariableValue(otherVar, customVariables, doc) || '';
    }

    const leftVal = resolveVariableValue(varName, customVariables, doc) || '';

    // Numeric comparison if both look like numbers
    const numLeft = parseFloat(leftVal.toString().replace(/\s/g, '').replace(',', '.'));
    const numRight = parseFloat(rightValStr.replace(/\s/g, '').replace(',', '.'));

    if (!isNaN(numLeft) && !isNaN(numRight)) {
      switch (op) {
        case '==': return numLeft === numRight;
        case '!=': return numLeft !== numRight;
        case '>': return numLeft > numRight;
        case '<': return numLeft < numRight;
        case '>=': return numLeft >= numRight;
        case '<=': return numLeft <= numRight;
      }
    }

    // String comparison (case insensitive)
    const strLeft = leftVal.toString().trim().toLowerCase();
    const strRight = rightValStr.toString().trim().toLowerCase();

    // Special boolean mapping ("true" / "да" / "1")
    const isBoolTrue = (s: string) => ['true', 'да', '1', 'yes'].includes(s);
    const isBoolFalse = (s: string) => ['false', 'нет', '0', 'no', ''].includes(s);

    if ((isBoolTrue(strLeft) || isBoolFalse(strLeft)) && (isBoolTrue(strRight) || isBoolFalse(strRight))) {
      const boolLeft = isBoolTrue(strLeft);
      const boolRight = isBoolTrue(strRight);
      return op === '==' ? boolLeft === boolRight : boolLeft !== boolRight;
    }

    switch (op) {
      case '==': return strLeft === strRight;
      case '!=': return strLeft !== strRight;
      case '>': return strLeft > strRight;
      case '<': return strLeft < strRight;
      case '>=': return strLeft >= strRight;
      case '<=': return strLeft <= strRight;
      default: return false;
    }
  }

  // Single variable presence check: [VAR]
  const singleVarMatch = trimmed.match(/^\[([^\]]+)\]$/);
  if (singleVarMatch) {
    const val = resolveVariableValue(singleVarMatch[1], customVariables, doc) || '';
    const lower = val.toString().trim().toLowerCase();
    return lower !== '' && lower !== 'false' && lower !== 'нет' && lower !== '0';
  }

  // Fallback direct key check
  const val = resolveVariableValue(trimmed, customVariables, doc) || '';
  const lower = val.toString().trim().toLowerCase();
  return lower !== '' && lower !== 'false' && lower !== 'нет' && lower !== '0';
}

/**
 * Evaluates inline pseudo-DSL conditions inside clause text:
 * {IF [VAR] == 'VAL'} true_branch {ELSE} false_branch {ENDIF}
 * {IF [VAR] > 100} text {ENDIF}
 * {IF [VAR]} text_if_not_empty {ENDIF}
 */
export function evaluateInlineConditions(
  text: string,
  customVariables: Record<string, string>,
  doc?: ContractDocument
): string {
  if (!text || !text.includes('{IF')) return text;

  const ifRegex = /\{IF\s+([^}]+)\}([\s\S]*?)(?:\{ELSE\}([\s\S]*?))?\{ENDIF\}/gi;

  let previousText = '';
  let resultText = text;
  let iterations = 0;

  while (resultText !== previousText && iterations < 5) {
    previousText = resultText;
    iterations++;

    resultText = resultText.replace(ifRegex, (match, conditionStr: string, trueBranch: string, falseBranch: string = '') => {
      const conditionMet = evaluateConditionExpression(conditionStr, customVariables, doc);
      return conditionMet ? trueBranch : falseBranch;
    });
  }

  return resultText;
}

/**
 * Formats lists marked with * and supports Clause9 * AND / * OR conjunction triggers
 */
export function formatListsWithAndOr(text: string): string {
  if (!text) return '';
  const lines = text.split('\n');
  const outputLines: string[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    if (trimmedLine === '* AND' || trimmedLine === '* OR' || trimmedLine === '* И' || trimmedLine === '* ИЛИ') {
      const isAnd = trimmedLine === '* AND' || trimmedLine === '* И';
      const conjunction = isAnd ? 'и ' : 'или ';
      
      const items: string[] = [];
      i++; // skip marker
      
      while (i < lines.length) {
        const nextLine = lines[i];
        const trimmedNext = nextLine.trim();
        if (trimmedNext.startsWith('*')) {
          const itemText = nextLine.replace(/^\s*\*\s*/, '');
          items.push(itemText);
          i++;
        } else {
          break;
        }
      }
      
      if (items.length > 0) {
        for (let j = 0; j < items.length; j++) {
          let formattedText = items[j];
          
          if (j === items.length - 1 && items.length > 1) {
            if (!formattedText.toLowerCase().startsWith('и ') && !formattedText.toLowerCase().startsWith('или ')) {
              formattedText = conjunction + formattedText;
            }
            if (!formattedText.endsWith('.')) {
              formattedText = formattedText + '.';
            }
          } else if (j === items.length - 2 && items.length > 1) {
            if (!formattedText.endsWith(';') && !formattedText.endsWith(',')) {
              formattedText = formattedText + ',';
            }
          } else {
            if (j < items.length - 1) {
              if (!formattedText.endsWith(';') && !formattedText.endsWith(',')) {
                formattedText = formattedText + ',';
              }
            }
          }
          outputLines.push(`• ${formattedText}`);
        }
      }
    } else if (trimmedLine.startsWith('*') && !trimmedLine.startsWith('* ')) {
      // Direct bullet point with non-space star
      outputLines.push(`• ${trimmedLine.substring(1).trim()}`);
      i++;
    } else if (trimmedLine.startsWith('* ')) {
      outputLines.push(`• ${trimmedLine.substring(2).trim()}`);
      i++;
    } else {
      outputLines.push(line);
      i++;
    }
  }
  return outputLines.join('\n');
}

/**
 * Resolves all [Variable] placeholders and {IF...} inline conditions in a plain text string against the document
 * context, returning a fully-substituted string. Unresolved placeholders are left
 * as-is (still wrapped in brackets) so they remain visible/greppable downstream.
 *
 * This is the single source of truth for text substitution and should be used by
 * every surface that needs the final resolved text: preview highlighting, plain-text
 * export/print/copy, and document audit. Do not re-implement the replace loop elsewhere.
 */
export function resolveDocumentText(text: string, doc: ContractDocument): string {
  if (!text) return '';
  // 1. First evaluate inline pseudo-DSL conditions: {IF [VAR] == 'VAL'}...{ELSE}...{ENDIF}
  const textWithConditionsEvaluated = evaluateInlineConditions(text, doc.customVariables, doc);

  // 2. Then resolve standard [Variable] placeholders
  const resolvedText = textWithConditionsEvaluated.replace(/\[([^\]]+)\]/g, (match, varName: string) => {
    const val = resolveVariableValue(varName, doc.customVariables, doc);
    return val !== undefined && val !== '' ? val : match;
  });

  // 3. Format lists with AND/OR
  return formatListsWithAndOr(resolvedText);
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

    // Is it from preamble / party roles / structural terms?
    if (
      ['номер договора', 'номер', 'дата договора', 'дата', 'город', 'сторона а', 'сторона б', 'сторона 1', 'сторона 2'].includes(lower) ||
      isPartyRoleVariable(key, doc) ||
      (doc.partyA.role && (doc.partyA.role.toLowerCase() === lower || stemsMatch(key, doc.partyA.role))) ||
      (doc.partyB.role && (doc.partyB.role.toLowerCase() === lower || stemsMatch(key, doc.partyB.role)))
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

/**
 * Checks if a clause is enabled/rendered under the current document context conditions
 */
export function isClauseRendered(clause: Clause, doc: ContractDocument): boolean {
  // Check Clause9 specific enabled condition (such as @assigned)
  if (clause.enabledCondition) {
    const met = evaluateConditionExpression(clause.enabledCondition, doc.customVariables || {}, doc);
    if (!met) return false;
  }
  
  // Check standard rule condition
  if (clause.conditionRule) {
    const met = evaluateConditionExpression(clause.conditionRule, doc.customVariables || {}, doc);
    if (!met) return false;
  }
  
  // Check parent Master clause dependency
  if (clause.dependsOnClauseId) {
    const parentClause = doc.clauses.find(c => c.id === clause.dependsOnClauseId);
    if (!parentClause || !isClauseRendered(parentClause, doc)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Returns the fully expanded list of clause instances including repeated clauses
 */
export function getExpandedRenderedClauses(doc: ContractDocument) {
  const result: {
    clause: Clause;
    instanceIndex: number;
    totalInstances: number;
    resolvedTextRu: string;
    resolvedTextEn?: string;
  }[] = [];
  
  doc.clauses.forEach(clause => {
    // First check if clause is enabled
    if (!isClauseRendered(clause, doc)) {
      return;
    }
    
    const repeatField = clause.repeatClauseField;
    if (repeatField) {
      // Find list of values for this repeat field
      const cleanField = repeatField.replace(/^#/, '').replace(/^\[/, '').replace(/\]$/, '');
      let valuesList = doc.repeatingLists?.[repeatField] || doc.repeatingLists?.[cleanField] || doc.repeatingLists?.[`#${cleanField}`];
      
      if (!valuesList || valuesList.length === 0) {
        // Fallback to the current single variable value or party name if list is not defined yet
        const singleVal = resolveVariableValue(cleanField, doc.customVariables, doc) || '';
        valuesList = singleVal ? [singleVal] : [];
      }
      
      // If list is still empty, output at least one placeholder so the clause is editable
      if (valuesList.length === 0) {
        valuesList = ['[Укажите участника]'];
      }
      
      valuesList.forEach((val, idx) => {
        const localVars = { ...doc.customVariables };
        localVars[cleanField] = val;
        localVars[`#${cleanField}`] = val;
        localVars[repeatField] = val;
        
        const tempDoc: ContractDocument = {
          ...doc,
          customVariables: localVars
        };
        
        const textRu = resolveDocumentText(clause.contentRu, tempDoc);
        const textEn = clause.contentEn ? resolveDocumentText(clause.contentEn, tempDoc) : undefined;
        
        result.push({
          clause,
          instanceIndex: idx,
          totalInstances: valuesList!.length,
          resolvedTextRu: textRu,
          resolvedTextEn: textEn
        });
      });
    } else {
      const textRu = resolveDocumentText(clause.contentRu, doc);
      const textEn = clause.contentEn ? resolveDocumentText(clause.contentEn, doc) : undefined;
      
      result.push({
        clause,
        instanceIndex: 0,
        totalInstances: 1,
        resolvedTextRu: textRu,
        resolvedTextEn: textEn
      });
    }
  });
  
  return result;
}
