import React from 'react';
import { ContractDocument } from '../../types';
import { resolveVariableValue, isPartyRoleVariable, evaluateInlineConditions, resolveClauseReference } from '../../utils/variableResolver';
import { EditableVariableSpan } from './EditableVariableSpan';

interface HighlightedClauseTextProps {
  text: string;
  document: ContractDocument;
  prefix?: React.ReactNode;
  clauseNum?: string;
  hasTitle?: boolean;
  disableAutoSubnumbers?: boolean;
  clauseLevel?: number;
  onVariableChange?: (varKey: string, newValue: string) => void;
}

/**
 * Renders clause text with [Variable] placeholders substituted:
 *  - Specific indicators and parameters render with yellow `.var-highlight`.
 *  - Structural party designations render as clean bold text without yellow background clutter.
 *  - Unresolved parameter variables render as a red/rose "missing value" badge.
 *  - Interactive variables can be edited directly in-place when onVariableChange is provided.
 *  - Points and sub-points with line breaks (\n) and tab indentations (\t) render properly structured with sub-item numbering.
 *  - Supports ~ prefix for explicitly unnumbered paragraphs.
 */
export const HighlightedClauseText: React.FC<HighlightedClauseTextProps> = ({
  text,
  document,
  prefix,
  clauseNum,
  hasTitle = false,
  disableAutoSubnumbers = false,
  clauseLevel = 0,
  onVariableChange,
}) => {
  if (!text) return null;

  const processedText = evaluateInlineConditions(text, document.customVariables, document).replace(/\{#[a-zA-Z0-9_\-]+\}/g, '');

  const renderTextSegment = (str: string) => {
    // Splits HTML formatting tags (<b>, </b>, <strong>, <i>, <u>, etc.) and variables/references ([...])
    const parts = str.split(/(<\/?(?:b|strong|i|em|u)>|\[[^\]]+\])/gi);
    let isBold = false;
    let isItalic = false;
    let isUnderline = false;

    return parts.map((part, idx) => {
      if (!part) return null;
      const lower = part.toLowerCase();

      // Track inline formatting tags
      if (lower === '<b>' || lower === '<strong>') {
        isBold = true;
        return null;
      }
      if (lower === '</b>' || lower === '</strong>') {
        isBold = false;
        return null;
      }
      if (lower === '<i>' || lower === '<em>') {
        isItalic = true;
        return null;
      }
      if (lower === '</i>' || lower === '</em>') {
        isItalic = false;
        return null;
      }
      if (lower === '<u>') {
        isUnderline = true;
        return null;
      }
      if (lower === '</u>') {
        isUnderline = false;
        return null;
      }

      const styleClasses = [
        isBold ? 'font-bold' : '',
        isItalic ? 'italic' : '',
        isUnderline ? 'underline' : '',
      ].filter(Boolean).join(' ');

      if (part.startsWith('[') && part.endsWith(']')) {
        const innerKey = part.slice(1, -1).trim();

        // Cross-clause reference: [ref:TARGET] or [#TARGET]
        if (innerKey.toLowerCase().startsWith('ref:') || innerKey.startsWith('#')) {
          const targetRef = innerKey.replace(/^ref:\s*/i, '').replace(/^#\s*/, '').trim();
          const refResult = resolveClauseReference(targetRef, document);

          return (
            <span
              key={`ref-${idx}`}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold mx-0.5 transition-colors ${
                refResult.found
                  ? 'bg-blue-50 text-blue-800 border border-blue-200/80 hover:bg-blue-100/80 cursor-default'
                  : 'bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs'
              } ${styleClasses}`}
              title={refResult.tooltip}
            >
              {refResult.displayText}
            </span>
          );
        }

        // Standard variable
        const varKey = innerKey;
        const isRole = isPartyRoleVariable(varKey, document);
        const val = resolveVariableValue(varKey, document.customVariables, document);

        return (
          <span key={`var-wrap-${idx}`} className={styleClasses || undefined}>
            <EditableVariableSpan
              key={`var-${varKey}-${idx}`}
              varKey={varKey}
              value={val}
              isRole={isRole}
              isUnresolved={!val}
              rawPart={part}
              onVariableChange={onVariableChange}
            />
          </span>
        );
      }

      return (
        <span key={`txt-${idx}`} className={styleClasses || undefined}>
          {part}
        </span>
      );
    });
  };

  const lines = processedText.split('\n');

  // Multi-column rendering support (for requisites & signatures: 2, 3, or more columns separated by === or |||)
  const columnDelimiterRegex = /\n?\s*(?:={3,}|\|{3,})\s*\n?/;
  const isMultiColumn = processedText.includes('===') || processedText.includes('|||');

  const renderColumnLines = (colText: string, colIdx: number, isMultiCol: boolean) => {
    const colLines = colText.split('\n');
    const subCounters: number[] = [];

    return (
      <div className="space-y-1 my-0.5">
        {colLines.map((rawLine, idx) => {
          if (!rawLine.trim()) {
            return <div key={idx} className="h-2" />;
          }

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

          const isExplicitlyUnnumbered = cleanLine.startsWith('~');
          if (isExplicitlyUnnumbered) {
            cleanLine = cleanLine.replace(/^~\s*/, '');
          }

          const hasPrefix = /^(\d+(\.\d+)*[\.\)]|\b[a-zA-Zа-яА-Я][\.\)]|[\-—•])\s/.test(cleanLine);
          let autoSubPrefix = '';

          if (!hasPrefix && !isExplicitlyUnnumbered && !disableAutoSubnumbers && !isMultiCol && (clauseNum || hasTitle)) {
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
              if (clauseNum) {
                autoSubPrefix = `${clauseNum}.${subNumStr}. `;
              } else {
                autoSubPrefix = `${subNumStr}. `;
              }
            } else {
              if (idx > 0 || tabCount > 0) {
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
                if (clauseNum) {
                  autoSubPrefix = `${clauseNum}.${subNumStr}. `;
                } else {
                  autoSubPrefix = `${subNumStr}. `;
                }
              }
            }
          }

          const renderPrimaryPrefix = idx === 0 && colIdx === 0 && prefix && !isExplicitlyUnnumbered && !isMultiCol;
          const totalIndent = (clauseLevel || 0) + tabCount;
          const levelClass = totalIndent > 0 ? `level-${Math.min(totalIndent, 4)}` : 'level-0';

          return (
            <div
              key={idx}
              className={`leading-relaxed preview-line ${levelClass}`}
              style={{
                paddingLeft: totalIndent > 0 ? `calc(var(--clause-indent-unit, 24px) * ${totalIndent})` : undefined,
              }}
            >
              {renderPrimaryPrefix ? prefix : null}
              {autoSubPrefix ? (
                <span className="font-bold text-slate-900 mr-1">{autoSubPrefix}</span>
              ) : null}
              {renderTextSegment(cleanLine)}
            </div>
          );
        })}
      </div>
    );
  };

  if (isMultiColumn) {
    const columnParts = processedText.split(columnDelimiterRegex).filter(p => p.trim().length > 0);
    if (columnParts.length > 1) {
      const colCount = columnParts.length;
      const gridColsClass = colCount === 2 
        ? 'grid-cols-2 gap-6' 
        : colCount === 3 
          ? 'grid-cols-3 gap-4' 
          : 'grid-cols-2 lg:grid-cols-4 gap-3';

      return (
        <div className={`grid ${gridColsClass} my-2 pt-1 font-sans text-xs text-slate-800`}>
          {columnParts.map((colText, colIdx) => (
            <div 
              key={colIdx} 
              className={`space-y-1 ${colIdx > 0 && colCount <= 3 ? 'border-l border-slate-200/60 pl-3 md:pl-4' : ''}`}
            >
              {renderColumnLines(colText, colIdx, true)}
            </div>
          ))}
        </div>
      );
    }
  }

  // If there's a single line, no title, no tabs, and no auto-numbering needed, render inline with prefix
  if (lines.length <= 1 && !processedText.includes('\t') && !hasTitle && !prefix && !processedText.startsWith('~')) {
    return <>{renderTextSegment(processedText)}</>;
  }

  return renderColumnLines(processedText, 0, false);
};
