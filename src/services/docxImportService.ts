import mammoth from 'mammoth';
import { Clause, SampleTemplate } from '../types';
import { generateUniqueClauseId } from '../utils/idGenerator';

export interface ParsedClauseDraft {
  id: string;
  name: string;
  title: string;
  content: string;
  category: string;
  level: number;
  showTitle: boolean;
  hideNumber?: boolean;
  noAutoSubnumbers?: boolean;
}

export interface DocxImportResult {
  documentTitle: string;
  category: string;
  partyARole: string;
  partyBRole: string;
  clauses: ParsedClauseDraft[];
  detectedVariables: Record<string, string>;
  preambleText?: string;
  rawText: string;
}

/**
 * Detects contract category based on keywords in title & text
 */
function detectContractCategory(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('поставк') || lower.includes('товар')) return 'Поставка';
  if (lower.includes('аренд')) return 'Аренда';
  if (lower.includes('подряд') || lower.includes('строител')) return 'Подряд';
  if (lower.includes('услуг') || lower.includes('оказани')) return 'Оказание услуг';
  if (lower.includes('вэд') || lower.includes('инкотермс') || lower.includes('incoterms')) return 'ВЭД';
  if (lower.includes('купли-продажи') || lower.includes('продаж')) return 'Купля-продажа';
  if (lower.includes('лицензи') || lower.includes('авторск')) return 'Лицензионный';
  if (lower.includes('конфиденциальн') || lower.includes('nda')) return 'NDA';
  return 'Общие условия';
}

/**
 * Detects typical contract party roles (e.g. Поставщик / Покупатель, Заказчик / Исполнитель)
 */
function detectPartyRoles(text: string): { partyARole: string; partyBRole: string } {
  const lower = text.toLowerCase();
  if (lower.includes('поставщик') && lower.includes('покупател')) {
    return { partyARole: 'Поставщик', partyBRole: 'Покупатель' };
  }
  if (lower.includes('заказчик') && lower.includes('исполнител')) {
    return { partyARole: 'Заказчик', partyBRole: 'Исполнитель' };
  }
  if (lower.includes('арендодател') && lower.includes('арендатор')) {
    return { partyARole: 'Арендодатель', partyBRole: 'Арендатор' };
  }
  if (lower.includes('заказчик') && lower.includes('подрядчик')) {
    return { partyARole: 'Заказчик', partyBRole: 'Подрядчик' };
  }
  if (lower.includes('продавец') && lower.includes('покупател')) {
    return { partyARole: 'Продавец', partyBRole: 'Покупатель' };
  }
  if (lower.includes('лицензиар') && lower.includes('лицензиат')) {
    return { partyARole: 'Лицензиар', partyBRole: 'Лицензиат' };
  }
  return { partyARole: 'Сторона 1', partyBRole: 'Сторона 2' };
}

/**
 * Extract bracket variables e.g. [Поставщик], [Сумма]
 */
function extractDetectedVariables(text: string): Record<string, string> {
  const matches = text.match(/\[([^\]]+)\]/g);
  const varsMap: Record<string, string> = {};
  if (matches) {
    matches.forEach(m => {
      const varName = m.slice(1, -1).trim();
      if (varName && !varsMap[varName]) {
        varsMap[varName] = varName;
      }
    });
  }
  return varsMap;
}

/**
 * Cleans section title by stripping leading numbers and prefixes (e.g. "1. ", "Статья 1. ", "РАЗДЕЛ I. ")
 */
export function cleanSectionTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  let cleaned = rawTitle.trim();

  // Pattern 1: "Статья 1. ...", "Раздел I: ...", "Глава 2. ..."
  cleaned = cleaned.replace(
    /^\b(статья|раздел|глава|article|section|chapter)\s+([0-9ivxlcdm]+|[0-9]+([.\-_][0-9]+)*)[.:\)]?\s*/i,
    ''
  );

  // Pattern 2: "1. ", "1.1. ", "I. ", "II. "
  cleaned = cleaned.replace(
    /^([0-9]+([.\-_][0-9]+)*|[ivxlcdm]+)[.:\)]\s*/i,
    ''
  );

  cleaned = cleaned.trim();
  return cleaned || rawTitle.trim();
}

/**
 * Cleans lines of a clause body by removing hardcoded leading paragraph numbers
 * and converting deep hierarchy levels into tab indents (\t).
 */
export function cleanClauseBodyLines(lines: string[]): string {
  if (!lines || lines.length === 0) return '';

  const processedLines: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      processedLines.push('');
      continue;
    }

    // Check for hierarchical numbers like 1.1., 1.2.1., 2.3.4.1)
    // Numbers segments must be 1-2 digits to avoid false positives with dates (e.g. 15.05.2026)
    const hierMatch = trimmed.match(/^(\d{1,2}(?:\.\d{1,2})+)[.:\)]?\s+(.*)$/);
    if (hierMatch) {
      const numPrefix = hierMatch[1]; // e.g. "1.2.1"
      const restOfLine = hierMatch[2]; // text
      const depth = numPrefix.split('.').length; // "1.1" -> 2, "1.2.1" -> 3

      // depth 2 (e.g. 1.1) -> 0 tabs (base sub-level)
      // depth 3 (e.g. 1.2.1) -> 1 tab (\t)
      // depth 4 (e.g. 1.2.1.1) -> 2 tabs (\t\t)
      const tabCount = Math.max(0, depth - 2);
      processedLines.push(`${'\t'.repeat(tabCount)}${restOfLine.trim()}`);
      continue;
    }

    // Check for simple numbers: "1. Текст", "1) Текст"
    const simpleNumMatch = trimmed.match(/^\d{1,2}[.:\)]\s+(.*)$/);
    if (simpleNumMatch) {
      processedLines.push(simpleNumMatch[1].trim());
      continue;
    }

    // If already starts with tabs or plain text, keep
    processedLines.push(rawLine);
  }

  return processedLines.join('\n');
}

/**
 * Parses raw text into sections and clauses
 */
function parseTextIntoClauses(fullText: string, category: string): {
  documentTitle: string;
  preamble: string;
  clauses: ParsedClauseDraft[];
} {
  const lines = fullText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) {
    return {
      documentTitle: 'Новый договор',
      preamble: '',
      clauses: []
    };
  }

  // 1. Find title
  let documentTitle = 'ДОГОВОР';
  let titleIndex = 0;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    if (/^(договор|соглашение|контракт|contract|agreement|договір)/i.test(line) || (line.toUpperCase() === line && line.length > 5)) {
      documentTitle = line;
      titleIndex = i;
      break;
    }
  }

  // 2. Identify clause headers (e.g. "1. ПРЕДМЕТ ДОГОВОРА", "1. Предмет договора", "Статья 1. ...", "РАЗДЕЛ 1. ...", "РАЗДЕЛ I. ...")
  const sectionRegex = /^(\d{1,2}\.|\b(статья|раздел|глава|article|section)\s+([0-9ivxlcdm]+|[0-9]+([.\-_][0-9]+)*)[.:\)]?)\s+(.+)$/i;
  
  const rawSections: { title: string; lines: string[] }[] = [];
  let preambleLines: string[] = [];
  let currentSection: { title: string; lines: string[] } | null = null;

  for (let i = titleIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(sectionRegex);

    if (match) {
      if (currentSection) {
        rawSections.push(currentSection);
      }
      currentSection = {
        title: line,
        lines: []
      };
    } else if (currentSection) {
      currentSection.lines.push(line);
    } else {
      preambleLines.push(line);
    }
  }

  if (currentSection) {
    rawSections.push(currentSection);
  }

  // Fallback if no numbered sections found: split by major paragraph blocks
  if (rawSections.length === 0) {
    let currentBlock: string[] = [];
    let blockCount = 1;

    for (let i = titleIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.length < 60 && (line.toUpperCase() === line || /^[А-ЯA-Z0-9]/.test(line))) {
        if (currentBlock.length > 0) {
          rawSections.push({
            title: `Раздел ${blockCount}`,
            lines: currentBlock
          });
          blockCount++;
          currentBlock = [];
        }
        rawSections.push({
          title: line,
          lines: []
        });
      } else {
        if (rawSections.length > 0) {
          rawSections[rawSections.length - 1].lines.push(line);
        } else {
          currentBlock.push(line);
        }
      }
    }

    if (currentBlock.length > 0) {
      rawSections.push({
        title: `Раздел ${blockCount}`,
        lines: currentBlock
      });
    }
  }

  // Map to ParsedClauseDraft with cleaned titles and content
  const clauses: ParsedClauseDraft[] = rawSections.map((sec, idx) => {
    const cleanTitle = cleanSectionTitle(sec.title);
    const cleanedContent = cleanClauseBodyLines(sec.lines);

    return {
      id: `imported-clause-${Date.now()}-${idx + 1}`,
      name: cleanTitle.length > 40 ? cleanTitle.slice(0, 37) + '...' : cleanTitle,
      title: cleanTitle,
      content: cleanedContent || cleanTitle,
      category: category,
      level: 1,
      showTitle: true,
      hideNumber: false,
      noAutoSubnumbers: false
    };
  });

  const preambleText = preambleLines.join('\n\n').trim();

  // If preamble was found, add it as the very first clause with hideNumber: true
  if (preambleText.length > 0) {
    clauses.unshift({
      id: `imported-preamble-${Date.now()}`,
      name: 'Преамбула',
      title: '',
      content: preambleText,
      category: category,
      level: 0,
      showTitle: false,
      hideNumber: true,
      noAutoSubnumbers: true
    });
  }

  return {
    documentTitle,
    preamble: preambleText,
    clauses
  };
}

/**
 * Parses a .docx File object into a structured template result
 */
export async function parseDocxFile(file: File): Promise<DocxImportResult> {
  const arrayBuffer = await file.arrayBuffer();

  // Use mammoth to extract plain text
  const textResult = await mammoth.extractRawText({ arrayBuffer });
  const rawText = textResult.value || '';

  const category = detectContractCategory(rawText);
  const roles = detectPartyRoles(rawText);
  const detectedVariables = extractDetectedVariables(rawText);
  const { documentTitle, preamble, clauses } = parseTextIntoClauses(rawText, category);

  // If filename has good name and document title is generic, refine
  let cleanDocTitle = documentTitle;
  if (cleanDocTitle === 'ДОГОВОР' || cleanDocTitle === 'Новый договор') {
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    if (nameWithoutExt) cleanDocTitle = nameWithoutExt;
  }

  return {
    documentTitle: cleanDocTitle,
    category,
    partyARole: roles.partyARole,
    partyBRole: roles.partyBRole,
    clauses,
    detectedVariables,
    preambleText: preamble,
    rawText
  };
}

/**
 * Converts DocxImportResult into a SampleTemplate and Clause array
 */
export function convertImportResultToTemplate(
  result: DocxImportResult,
  customName?: string,
  customCategory?: string
): { template: SampleTemplate; clauses: Clause[] } {
  const tplId = `tpl-imported-${Date.now()}`;
  const templateName = customName?.trim() || result.documentTitle || 'Импортированный договор';
  const category = customCategory?.trim() || result.category || 'Поставка';

  const clauses: Clause[] = result.clauses.map((cDraft, idx) => ({
    id: generateUniqueClauseId('c'),
    name: cDraft.name || (cDraft.hideNumber ? 'Преамбула' : `Пункт ${idx + 1}`),
    category: category,
    titleRu: cDraft.title || '',
    contentRu: cDraft.content || '',
    level: cDraft.level || 0,
    showTitle: cDraft.showTitle ?? (!cDraft.hideNumber),
    hideNumber: Boolean(cDraft.hideNumber),
    noAutoSubnumbers: Boolean(cDraft.noAutoSubnumbers),
    isFavorite: false,
    isAdHoc: false
  }));

  const template: SampleTemplate = {
    id: tplId,
    name: templateName,
    description: `Импортировано из файла Word (${clauses.length} разделов/пунктов)`,
    category: category,
    partyARole: result.partyARole || 'Сторона 1',
    partyBRole: result.partyBRole || 'Сторона 2',
    clauseIds: clauses.map(c => c.id),
    clauses: clauses,
    questionnaire: [],
    customVariables: result.detectedVariables || {}
  };

  return { template, clauses };
}

