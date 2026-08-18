import { ContractDocument } from '../types';
import { resolveDocumentText, getExpandedRenderedClauses } from '../utils/variableResolver';
import { getHierarchicalNumber, getClauseTitle, formatContentWithSubnumbers, isClauseTitleVisible } from '../utils/numbering';
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Packer
} from 'docx';

export function exportDocumentToJson(doc: ContractDocument) {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(doc, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `${doc.title.replace(/\s+/g, '_')}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function parseHtmlFormattedLineToTextRuns(line: string, defaultSize: number = 24): TextRun[] {
  const tagRegex = /(<\/?(?:b|strong|i|em|u)>)/gi;
  const parts = line.split(tagRegex);
  const runs: TextRun[] = [];
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;

  for (const part of parts) {
    if (!part) continue;
    const lower = part.toLowerCase();
    if (lower === '<b>' || lower === '<strong>') {
      isBold = true;
    } else if (lower === '</b>' || lower === '</strong>') {
      isBold = false;
    } else if (lower === '<i>' || lower === '<em>') {
      isItalic = true;
    } else if (lower === '</i>' || lower === '</em>') {
      isItalic = false;
    } else if (lower === '<u>') {
      isUnderline = true;
    } else if (lower === '</u>') {
      isUnderline = false;
    } else {
      runs.push(
        new TextRun({
          text: part,
          bold: isBold,
          italics: isItalic,
          underline: isUnderline ? {} : undefined,
          size: defaultSize,
          font: 'Times New Roman'
        })
      );
    }
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text: '', size: defaultSize, font: 'Times New Roman' }));
  }

  return runs;
}

export async function exportDocumentToDocx(doc: ContractDocument): Promise<void> {
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' };
  const noBorders = {
    top: noBorder,
    bottom: noBorder,
    left: noBorder,
    right: noBorder,
    insideHorizontal: noBorder,
    insideVertical: noBorder,
  };

  const childrenElements: (Paragraph | Table)[] = [];

  // 1. DOCUMENT HEADER & TITLE
  if (doc.printTitle !== false) {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 160 },
        children: [
          new TextRun({
            text: (doc.title || 'ДОГОВОР').toUpperCase(),
            bold: true,
            size: 28, // 14pt
            font: 'Times New Roman'
          })
        ]
      })
    );

    // City and Date row (left/right aligned via table)
    childrenElements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: noBorders,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: doc.city || 'г. Москва',
                        bold: true,
                        size: 24, // 12pt
                        font: 'Times New Roman'
                      })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: noBorders,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: doc.date || '«___» ________ 20__ г.',
                        bold: true,
                        size: 24,
                        font: 'Times New Roman'
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    );

    childrenElements.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: '' })]
      })
    );
  }

  // 2. SYSTEM PREAMBLE
  if (doc.showSystemPreamble === true) {
    const directorA = doc.partyA.directorGenitive || doc.partyA.director || '___________';
    const directorB = doc.partyB.directorGenitive || doc.partyB.director || '___________';

    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 100, after: 200, line: 276 },
        children: [
          new TextRun({ text: doc.partyA.name, bold: true, size: 24, font: 'Times New Roman' }),
          new TextRun({ text: ` (${doc.partyA.role}), в лице `, size: 24, font: 'Times New Roman' }),
          new TextRun({ text: directorA, size: 24, font: 'Times New Roman' }),
          new TextRun({ text: ', действующего на основании Устава, с одной стороны, и ', size: 24, font: 'Times New Roman' }),
          new TextRun({ text: doc.partyB.name, bold: true, size: 24, font: 'Times New Roman' }),
          new TextRun({ text: ` (${doc.partyB.role}), в лице `, size: 24, font: 'Times New Roman' }),
          new TextRun({ text: directorB, size: 24, font: 'Times New Roman' }),
          new TextRun({ text: ', с другой стороны, заключили настоящий Договор о нижеследующем:', size: 24, font: 'Times New Roman' })
        ]
      })
    );
  }

  // 3. EXPANDED RENDERED CLAUSES
  const expandedItems = getExpandedRenderedClauses(doc);
  const clausesForNumbering = expandedItems.map(item => {
    const cl = { ...item.clause };
    if (item.totalInstances > 1) {
      cl.id = `${item.clause.id}-repeat-${item.instanceIndex}`;
      cl.titleRu = `${item.clause.titleRu} (${item.instanceIndex + 1})`;
      if (cl.titleEn) cl.titleEn = `${item.clause.titleEn} (${item.instanceIndex + 1})`;
    }
    return cl;
  });

  const columnDelimiterRegex = /\n?\s*(?:={3,}|\|{3,})\s*\n?/;

  expandedItems.forEach((item, idx) => {
    const clause = item.clause;
    const rawNum = getHierarchicalNumber(clausesForNumbering, idx, doc.includeTitleInClause);
    const num = (doc.includeNumbering !== false && !clause.formatAsTitle) ? rawNum : '';
    const isFormatAsTitle = clause.formatAsTitle;
    const title = isFormatAsTitle ? '' : getClauseTitle(clause, doc.includeTitleInClause);
    const clauseLevel = clause.level || 0;

    if (isFormatAsTitle) {
      childrenElements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: item.resolvedTextRu.toUpperCase(),
              bold: true,
              size: 24,
              font: 'Times New Roman'
            })
          ]
        })
      );
      return;
    }

    // Clause Section Title if visible
    if (title) {
      childrenElements.push(
        new Paragraph({
          spacing: { before: 240, after: 80 },
          indent: clauseLevel > 0 ? { left: clauseLevel * 360 } : undefined,
          children: [
            new TextRun({
              text: `${num ? `${num}. ` : ''}${title.toUpperCase()}`,
              bold: true,
              size: 24,
              font: 'Times New Roman'
            })
          ]
        })
      );
    }

    const isMultiColumn = clause.isMultiColumn || 
      (clause.columnsCount !== undefined && clause.columnsCount > 1) || 
      item.resolvedTextRu.includes('===') || 
      item.resolvedTextRu.includes('|||');

    if (isMultiColumn) {
      const columnParts = item.resolvedTextRu.split(columnDelimiterRegex).filter(p => p.trim().length > 0);
      if (columnParts.length > 1) {
        const colCount = columnParts.length;
        const tableCells: TableCell[] = columnParts.map((colText, colIdx) => {
          const colWidthPercent = colIdx === colCount - 1
            ? 100 - Math.floor(100 / colCount) * (colCount - 1)
            : Math.floor(100 / colCount);

          const colLines = colText.split('\n');
          const paragraphs: Paragraph[] = [];

          colLines.forEach(rawLine => {
            if (!rawLine.trim()) {
              paragraphs.push(
                new Paragraph({
                  spacing: { before: 30, after: 30 },
                  children: [new TextRun({ text: '', size: 22, font: 'Times New Roman' })]
                })
              );
              return;
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

            const runs = parseHtmlFormattedLineToTextRuns(cleanLine, 22);

            paragraphs.push(
              new Paragraph({
                alignment: AlignmentType.LEFT,
                indent: tabCount > 0 ? { left: tabCount * 360 } : undefined,
                spacing: { before: 30, after: 30, line: 260 },
                children: runs
              })
            );
          });

          return new TableCell({
            width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ children: [new TextRun({ text: '', size: 22, font: 'Times New Roman' })] })]
          });
        });

        childrenElements.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
              new TableRow({
                children: tableCells
              })
            ]
          })
        );
        return;
      }
    }

    // Bilingual side-by-side or standard single-column content
    if (doc.bilingual) {
      const formattedRu = formatContentWithSubnumbers(item.resolvedTextRu, num, Boolean(title), clause.noAutoSubnumbers);
      const formattedEn = formatContentWithSubnumbers(item.resolvedTextEn || '', num, Boolean(title), clause.noAutoSubnumbers);

      const ruParagraphs = formattedRu
        .split('\n')
        .filter(l => l.trim().length > 0)
        .map(line => {
          return new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 40, after: 40, line: 276 },
            children: parseHtmlFormattedLineToTextRuns(line, 22)
          });
        });

      const enParagraphs = formattedEn
        .split('\n')
        .filter(l => l.trim().length > 0)
        .map(line => {
          return new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 40, after: 40, line: 276 },
            children: parseHtmlFormattedLineToTextRuns(line, 22)
          });
        });

      childrenElements.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorders,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: noBorders,
                  children: ruParagraphs.length > 0 ? ruParagraphs : [new Paragraph({ children: [new TextRun({ text: '' })] })]
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: noBorders,
                  children: enParagraphs.length > 0 ? enParagraphs : [new Paragraph({ children: [new TextRun({ text: '' })] })]
                })
              ]
            })
          ]
        })
      );
    } else {
      const formattedContent = formatContentWithSubnumbers(item.resolvedTextRu, num, Boolean(title), clause.noAutoSubnumbers);
      const lines = formattedContent.split('\n');

      lines.forEach(line => {
        if (!line.trim()) return;

        let tabCount = 0;
        let cleanLine = line;
        while (cleanLine.startsWith('\t')) {
          tabCount++;
          cleanLine = cleanLine.substring(1);
        }

        const totalIndent = (clauseLevel + tabCount) * 360;

        childrenElements.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: totalIndent > 0 ? { left: totalIndent } : undefined,
            spacing: { before: 40, after: 40, line: 276 },
            children: parseHtmlFormattedLineToTextRuns(cleanLine, 24)
          })
        );
      });
    }
  });

  // 4. REQUISITES AND SIGNATURES (RENDERED ONLY IF NOT ALREADY PROVIDED AS A CLAUSE IN DOCUMENT)
  const hasCustomRequisitesClause = doc.clauses.some(c => 
    c.isMultiColumn || 
    (c.columnsCount !== undefined && c.columnsCount > 1) ||
    c.contentRu?.includes('===') ||
    c.contentRu?.includes('|||') ||
    (c.category === 'Реквизиты' || (c.titleRu && (c.titleRu.toLowerCase().includes('реквизит') || c.titleRu.toLowerCase().includes('подпис'))))
  );

  if (!hasCustomRequisitesClause) {
    childrenElements.push(
      new Paragraph({
        spacing: { before: 360, after: 140 },
        children: [
          new TextRun({
            text: 'АДРЕСА, РЕКВИЗИТЫ И ПОДПИСИ СТОРОН',
            bold: true,
            size: 24,
            font: 'Times New Roman'
          })
        ]
      })
    );

    const partyACellChildren: Paragraph[] = [
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: doc.partyA.role.toUpperCase(), bold: true, size: 22, font: 'Times New Roman' })]
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: doc.partyA.name, bold: true, size: 22, font: 'Times New Roman' })]
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: `Код ЕГРПОУ / ИНН: ${doc.partyA.code || '—'}`, size: 20, font: 'Times New Roman' })]
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: `Адрес: ${doc.partyA.address || '—'}`, size: 20, font: 'Times New Roman' })]
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: `Банк: ${doc.partyA.bankName || '—'}`, size: 20, font: 'Times New Roman' })]
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: `Счёт/IBAN: ${doc.partyA.bankAccount || '—'}`, size: 20, font: 'Times New Roman' })]
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: `Директор: ${doc.partyA.director || '—'}`, size: 20, font: 'Times New Roman' })]
      }),
      new Paragraph({
        spacing: { before: 240, after: 40 },
        children: [new TextRun({ text: 'М.П. ___________________', size: 20, font: 'Times New Roman' })]
      })
    ];

    const partyBCellChildren: Paragraph[] = [
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: doc.partyB.role.toUpperCase(), bold: true, size: 22, font: 'Times New Roman' })]
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: doc.partyB.name, bold: true, size: 22, font: 'Times New Roman' })]
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: `Код ЕГРПОУ / ИНН: ${doc.partyB.code || '—'}`, size: 20, font: 'Times New Roman' })]
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: `Адрес: ${doc.partyB.address || '—'}`, size: 20, font: 'Times New Roman' })]
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: `Банк: ${doc.partyB.bankName || '—'}`, size: 20, font: 'Times New Roman' })]
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: `Счёт/IBAN: ${doc.partyB.bankAccount || '—'}`, size: 20, font: 'Times New Roman' })]
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: `Директор: ${doc.partyB.director || '—'}`, size: 20, font: 'Times New Roman' })]
      }),
      new Paragraph({
        spacing: { before: 240, after: 40 },
        children: [new TextRun({ text: 'М.П. ___________________', size: 20, font: 'Times New Roman' })]
      })
    ];

    childrenElements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: noBorders,
                children: partyACellChildren
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: noBorders,
                children: partyBCellChildren
              })
            ]
          })
        ]
      })
    );
  }

  const wordDoc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // 20mm in twips
              bottom: 1134,
              left: 1134,
              right: 1134
            }
          }
        },
        children: childrenElements
      }
    ]
  });

  const blob = await Packer.toBlob(wordDoc);
  const downloadUrl = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', downloadUrl);
  const sanitizedTitle = (doc.title || 'Договор').replace(/[/\\?%*:|"<>]/g, '_').trim();
  downloadAnchor.setAttribute('download', `${sanitizedTitle}.docx`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(downloadUrl);
}

export function generateFullText(doc: ContractDocument): string {
  let text = `${doc.title}\n`;
  text += `${doc.city}                                              ${doc.date}\n\n`;
  text += `${doc.partyA.name} (${doc.partyA.role}), в лице ${doc.partyA.directorGenitive || doc.partyA.director}, с одной стороны, и ${doc.partyB.name} (${doc.partyB.role}), в лице ${doc.partyB.directorGenitive || doc.partyB.director}, с другой стороны, заключили настоящий Договор о нижеследующем:\n\n`;

  doc.clauses.forEach((clause, idx) => {
    const rawNum = getHierarchicalNumber(doc.clauses, idx, doc.includeTitleInClause);
    const num = doc.includeNumbering !== false ? rawNum : '';
    const title = getClauseTitle(clause, doc.includeTitleInClause);
    const hasTitle = Boolean(title);
    const rawContent = resolveDocumentText(clause.contentRu, doc);
    const content = formatContentWithSubnumbers(rawContent, num, hasTitle, clause.noAutoSubnumbers);

    if (title) {
      text += `${num ? `${num}. ` : ''}${title.toUpperCase()}\n`;
      text += `${content}\n\n`;
    } else {
      text += `${content}\n\n`;
    }
  });

  const hasCustomRequisitesClause = doc.clauses.some(c => 
    c.isMultiColumn || 
    (c.columnsCount !== undefined && c.columnsCount > 1) ||
    c.contentRu?.includes('===') ||
    c.contentRu?.includes('|||') ||
    (c.category === 'Реквизиты' || (c.titleRu && (c.titleRu.toLowerCase().includes('реквизит') || c.titleRu.toLowerCase().includes('подпис'))))
  );

  if (!hasCustomRequisitesClause) {
    text += `РЕКВИЗИТЫ И ПОДПИСИ СТОРОН:\n\n`;
    text += `${doc.partyA.role.toUpperCase()}:\n${doc.partyA.name}\nКод ЕГРПОУ: ${doc.partyA.code}\nАдрес: ${doc.partyA.address}\nДиректор: ${doc.partyA.director}\n\n`;
    text += `${doc.partyB.role.toUpperCase()}:\n${doc.partyB.name}\nКод ЕГРПОУ: ${doc.partyB.code}\nАдрес: ${doc.partyB.address}\nДиректор: ${doc.partyB.director}\n`;
  }

  return text;
}

export function copyDocumentToClipboard(doc: ContractDocument): Promise<void> {
  const text = generateFullText(doc);
  return navigator.clipboard.writeText(text);
}

export function printDocument() {
  window.print();
}
