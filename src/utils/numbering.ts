import { Clause } from '../types';

/**
 * Computes hierarchical numbering (e.g., "1", "1.1", "1.1.1", "2", "2.1")
 * for a clause at targetIndex in an array of Clauses based on their indentation levels
 * and title presence (untitled clauses after a titled parent clause become sub-clauses).
 */
export function getHierarchicalNumber(
  clauses: Clause[],
  targetIndex: number,
  defaultIncludeTitle: boolean = true
): string {
  if (targetIndex < 0 || targetIndex >= clauses.length) return '';

  let counters: number[] = [];
  let activeTitleAtLevel: boolean[] = [];

  for (let i = 0; i <= targetIndex; i++) {
    const clause = clauses[i];
    if (clause.hideNumber || clause.formatAsTitle) {
      if (i === targetIndex) {
        return '';
      }
      continue;
    }

    const declLevel = Math.max(0, clause.level || 0);
    const hasTitle = isClauseTitleVisible(clause, defaultIncludeTitle);

    if (hasTitle) {
      activeTitleAtLevel = activeTitleAtLevel.slice(0, declLevel + 1);
      activeTitleAtLevel[declLevel] = true;

      while (counters.length <= declLevel) {
        counters.push(0);
      }
      counters = counters.slice(0, declLevel + 1);
      counters[declLevel] += 1;

      if (i === targetIndex) {
        return counters.join('.');
      }

      // Count all sub-lines in this titled clause so subsequent untitled clauses can continue numbering
      const content = clause.contentRu || '';
      const lines = content.split('\n');
      const bodyBaseLevel = declLevel + 1;

      if (!clause.noAutoSubnumbers) {
        for (const rawLine of lines) {
          if (!rawLine.trim()) continue;

          let tabCount = 0;
          let cleanLine = rawLine;
          while (cleanLine.startsWith('\t')) {
            tabCount++;
            cleanLine = cleanLine.substring(1);
          }
          if (tabCount === 0 && cleanLine.startsWith('    ')) {
            tabCount = 1;
            cleanLine = cleanLine.substring(4);
          } else if (tabCount === 0 && cleanLine.startsWith('  ')) {
            tabCount = 1;
            cleanLine = cleanLine.substring(2);
          }
          cleanLine = cleanLine.trimStart();

          // Skip lines marked with ~ (no numbering) or lines with existing custom prefix
          if (cleanLine.startsWith('~')) continue;
          const hasPrefix = /^(\d+(\.\d+)*[\.\)]|\b[a-zA-Zа-яА-Я][\.\)]|[\-—•])\s/.test(cleanLine);
          if (hasPrefix) continue;

          const lineLevel = bodyBaseLevel + tabCount;
          while (counters.length <= lineLevel) {
            counters.push(0);
          }
          counters = counters.slice(0, lineLevel + 1);
          counters[lineLevel] += 1;
        }
      }
    } else {
      let parentHasTitle = false;
      let deepestTitleLevel = 0;
      for (let l = activeTitleAtLevel.length - 1; l >= 0; l--) {
        if (activeTitleAtLevel[l]) {
          parentHasTitle = true;
          deepestTitleLevel = l;
          break;
        }
      }

      let effBaseLevel = declLevel;
      if (parentHasTitle) {
        effBaseLevel = (deepestTitleLevel + 1) + declLevel;
      }

      while (counters.length <= effBaseLevel) {
        counters.push(0);
      }
      counters = counters.slice(0, effBaseLevel + 1);
      counters[effBaseLevel] += 1;

      if (i === targetIndex) {
        return counters.join('.');
      }

      // Count subsequent sub-lines in this untitled clause
      const content = clause.contentRu || '';
      const lines = content.split('\n');

      if (!clause.noAutoSubnumbers) {
        let isFirstLine = true;
        for (const rawLine of lines) {
          if (!rawLine.trim()) continue;

          let tabCount = 0;
          let cleanLine = rawLine;
          while (cleanLine.startsWith('\t')) {
            tabCount++;
            cleanLine = cleanLine.substring(1);
          }
          if (tabCount === 0 && cleanLine.startsWith('    ')) {
            tabCount = 1;
            cleanLine = cleanLine.substring(4);
          } else if (tabCount === 0 && cleanLine.startsWith('  ')) {
            tabCount = 1;
            cleanLine = cleanLine.substring(2);
          }
          cleanLine = cleanLine.trimStart();

          if (cleanLine.startsWith('~')) continue;
          const hasPrefix = /^(\d+(\.\d+)*[\.\)]|\b[a-zA-Zа-яА-Я][\.\)]|[\-—•])\s/.test(cleanLine);
          if (hasPrefix) continue;

          if (isFirstLine) {
            isFirstLine = false;
            // The first line was already counted at effBaseLevel
            continue;
          }

          const lineLevel = effBaseLevel + (tabCount > 0 ? tabCount : 1);
          while (counters.length <= lineLevel) {
            counters.push(0);
          }
          counters = counters.slice(0, lineLevel + 1);
          counters[lineLevel] += 1;
        }
      }
    }
  }

  return counters.join('.');
}

/**
 * Helper to determine if a clause title should be displayed.
 * Takes into account individual clause setting (showTitle) and document-wide default.
 * If clause has no title text in both RU and EN, it is treated as untitled (false).
 */
export function isClauseTitleVisible(clause: Clause, defaultIncludeTitle: boolean = true): boolean {
  if (clause.showTitle === false) {
    return false;
  }
  const hasTitleText = Boolean((clause.titleRu || '').trim() || (clause.titleEn || '').trim());
  if (!hasTitleText) {
    return false;
  }
  if (clause.showTitle === true) {
    return true;
  }
  return defaultIncludeTitle;
}

/**
 * Gets the title text for a clause if visible, otherwise empty string.
 */
export function getClauseTitle(clause: Clause, defaultIncludeTitle: boolean = true): string {
  if (!isClauseTitleVisible(clause, defaultIncludeTitle)) {
    return '';
  }
  return clause.titleRu || clause.name || '';
}

/**
 * Formats multi-line clause content so that paragraphs and tabbed sub-items
 * receive hierarchical sub-numbering (e.g. 1.1., 1.2., 1.2.1.) under clauseNum.
 * Supports ~ prefix to explicitly mark a line/paragraph as unnumbered.
 * If disableAutoSubnumbers is true or clauseNum is empty without title, outputs plain lines.
 */
export function formatContentWithSubnumbers(
  text: string,
  clauseNum: string,
  hasTitle: boolean,
  disableAutoSubnumbers: boolean = false
): string {
  if (!text) return '';
  const lines = text.split('\n');
  const subCounters: number[] = [];

  return lines
    .map((rawLine, idx) => {
      if (!rawLine.trim()) return rawLine;

      let tabCount = 0;
      let cleanLine = rawLine;
      while (cleanLine.startsWith('\t')) {
        tabCount++;
        cleanLine = cleanLine.substring(1);
      }
      if (tabCount === 0 && cleanLine.startsWith('    ')) {
        tabCount = 1;
        cleanLine = cleanLine.substring(4);
      } else if (tabCount === 0 && cleanLine.startsWith('  ')) {
        tabCount = 1;
        cleanLine = cleanLine.substring(2);
      }
      cleanLine = cleanLine.trimStart();

      // Check for explicit unnumbered paragraph marker: ~ or ~\s
      if (cleanLine.startsWith('~')) {
        const withoutMarker = cleanLine.replace(/^~\s*/, '');
        return `${'\t'.repeat(tabCount)}${withoutMarker}`;
      }

      if (disableAutoSubnumbers) {
        return `${'\t'.repeat(tabCount)}${cleanLine}`;
      }

      const hasPrefix = /^(\d+(\.\d+)*[\.\)]|\b[a-zA-Zа-яА-Я][\.\)]|[\-—•])\s/.test(cleanLine);

      if (hasPrefix) {
        return `${'\t'.repeat(tabCount)}${cleanLine}`;
      }

      // If there is no clause number (e.g., custom preamble or hidden numbering) and no title, don't generate artificial sub-numbers
      if (!clauseNum && !hasTitle) {
        return `${'\t'.repeat(tabCount)}${cleanLine}`;
      }

      let prefixStr = '';
      if (hasTitle) {
        const targetDepth = tabCount;
        while (subCounters.length < targetDepth) {
          subCounters.push(1);
        }
        if (subCounters.length <= targetDepth) {
          subCounters.push(0);
        }
        subCounters.length = targetDepth + 1;
        subCounters[targetDepth] += 1;

        const subNumStr = subCounters.join('.');
        prefixStr = clauseNum ? `${clauseNum}.${subNumStr}. ` : `${subNumStr}. `;
      } else {
        if (idx === 0) {
          prefixStr = clauseNum ? `${clauseNum}. ` : '';
        } else {
          const targetDepth = tabCount > 0 ? tabCount - 1 : 0;
          while (subCounters.length < targetDepth) {
            subCounters.push(1);
          }
          if (subCounters.length <= targetDepth) {
            subCounters.push(0);
          }
          subCounters.length = targetDepth + 1;
          subCounters[targetDepth] += 1;

          const subNumStr = subCounters.join('.');
          prefixStr = clauseNum ? `${clauseNum}.${subNumStr}. ` : `${subNumStr}. `;
        }
      }

      return `${'\t'.repeat(tabCount)}${prefixStr}${cleanLine}`;
    })
    .join('\n');
}

export interface ClauseSubItem {
  id: string; // e.g. `${clause.id}#${anchor}`
  anchor: string; // e.g. "1", "2", "2.1", or bookmark name
  number: string; // e.g. "4.1" or "4.2.1"
  previewText: string;
  isBookmark?: boolean;
}

/**
 * Extracts and calculates all sub-items / sub-points from a clause's content.
 */
export function extractClauseSubItems(
  clause: Clause,
  baseClauseNum: string,
  hasTitle: boolean = true
): ClauseSubItem[] {
  const content = clause.contentRu || clause.contentEn || '';
  if (!content) return [];

  const isTitle = isClauseTitleVisible(clause, hasTitle);

  const lines = content.split('\n');
  const subCounters: number[] = [];
  const items: ClauseSubItem[] = [];

  let lineCounter = 0;

  lines.forEach((rawLine) => {
    if (!rawLine.trim()) return;

    let tabCount = 0;
    let cleanLine = rawLine;
    while (cleanLine.startsWith('\t')) {
      tabCount++;
      cleanLine = cleanLine.substring(1);
    }
    if (tabCount === 0 && cleanLine.startsWith('    ')) {
      tabCount = 1;
      cleanLine = cleanLine.substring(4);
    } else if (tabCount === 0 && cleanLine.startsWith('  ')) {
      tabCount = 1;
      cleanLine = cleanLine.substring(2);
    }
    cleanLine = cleanLine.trimStart();

    // Check for inline bookmark: {#bookmark_name}
    const bookmarkMatch = cleanLine.match(/\{#([a-zA-Z0-9_\-]+)\}/);
    const bookmarkName = bookmarkMatch ? bookmarkMatch[1] : undefined;
    const cleanWithoutBookmark = cleanLine.replace(/\{#[a-zA-Z0-9_\-]+\}/g, '').trim();

    if (cleanWithoutBookmark.startsWith('~')) {
      return;
    }

    lineCounter++;

    let subNumStr = '';
    if (isTitle) {
      const targetDepth = tabCount;
      while (subCounters.length < targetDepth) {
        subCounters.push(1);
      }
      if (subCounters.length <= targetDepth) {
        subCounters.push(0);
      }
      subCounters.length = targetDepth + 1;
      subCounters[targetDepth] += 1;

      subNumStr = subCounters.join('.');
    } else {
      if (lineCounter === 1 && tabCount === 0) {
        subNumStr = '';
      } else {
        const targetDepth = tabCount > 0 ? tabCount - 1 : 0;
        while (subCounters.length < targetDepth) {
          subCounters.push(1);
        }
        if (subCounters.length <= targetDepth) {
          subCounters.push(0);
        }
        subCounters.length = targetDepth + 1;
        subCounters[targetDepth] += 1;

        subNumStr = subCounters.join('.');
      }
    }

    const fullNum = subNumStr
      ? (baseClauseNum ? `${baseClauseNum}.${subNumStr}` : subNumStr)
      : (baseClauseNum || `${lineCounter}`);

    const anchor = isTitle ? (subNumStr || `${lineCounter}`) : (subNumStr || `${lineCounter}`);
    const truncatedText = cleanWithoutBookmark.replace(/<[^>]+>/g, '').replace(/\[[^\]]+\]/g, '...').trim();
    const preview = truncatedText.length > 50 ? truncatedText.substring(0, 48) + '...' : truncatedText;

    if (clause.id) {
      // Add standard anchor (e.g. c-123#1 or c-123#2.1)
      items.push({
        id: `${clause.id}#${anchor}`,
        anchor: anchor,
        number: fullNum,
        previewText: preview || `Подпункт ${fullNum}`
      });

      // Also register plain line counter anchor if different
      if (`${lineCounter}` !== anchor) {
        items.push({
          id: `${clause.id}#${lineCounter}`,
          anchor: `${lineCounter}`,
          number: fullNum,
          previewText: preview || `Подпункт ${fullNum}`
        });
      }

      // If bookmark exists, add bookmark reference item
      if (bookmarkName) {
        items.push({
          id: `${clause.id}#${bookmarkName}`,
          anchor: bookmarkName,
          number: fullNum,
          previewText: preview || `Закладка: ${bookmarkName}`,
          isBookmark: true
        });
      }
    }
  });

  return items;
}
