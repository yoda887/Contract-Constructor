import { ContractDocument } from '../types';

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

export function generateFullText(doc: ContractDocument): string {
  let text = `${doc.title}\n`;
  text += `${doc.city}                                              ${doc.date}\n\n`;
  text += `${doc.partyA.name} (${doc.partyA.role}), в лице ${doc.partyA.director}, с одной стороны, и ${doc.partyB.name} (${doc.partyB.role}), в лице ${doc.partyB.director}, с другой стороны, заключили настоящий Договор о нижеследующем:\n\n`;

  doc.clauses.forEach((clause, idx) => {
    const num = idx + 1;
    const title = doc.includeTitleInClause ? clause.titleRu || clause.name : '';
    let content = clause.contentRu;

    // Substitute variables
    content = content.replace(/\[([^\]]+)\]/g, (_, varName) => {
      return doc.customVariables[varName] || `[${varName}]`;
    });

    if (title) {
      text += `${num}. ${title.toUpperCase()}\n`;
    } else {
      text += `${num}. `;
    }
    text += `${content}\n\n`;
  });

  text += `РЕКВИЗИТЫ И ПОДПИСИ СТОРОН:\n\n`;
  text += `${doc.partyA.role.toUpperCase()}:\n${doc.partyA.name}\nКод ЕГРПОУ: ${doc.partyA.code}\nАдрес: ${doc.partyA.address}\nДиректор: ${doc.partyA.director}\n\n`;
  text += `${doc.partyB.role.toUpperCase()}:\n${doc.partyB.name}\nКод ЕГРПОУ: ${doc.partyB.code}\nАдрес: ${doc.partyB.address}\nДиректор: ${doc.partyB.director}\n`;

  return text;
}

export function copyDocumentToClipboard(doc: ContractDocument): Promise<void> {
  const text = generateFullText(doc);
  return navigator.clipboard.writeText(text);
}

export function printDocument() {
  window.print();
}
