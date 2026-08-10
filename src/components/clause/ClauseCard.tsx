import React from 'react';
import { Trash2 } from 'lucide-react';
import { Clause } from '../../types';

interface ClauseCardProps {
  clause: Clause;
  inDocument: boolean;
  onToggleAdd: (clause: Clause) => void;
  onEdit: (clause: Clause) => void;
  onDelete: (clauseId: string) => void;
}

export const ClauseCard: React.FC<ClauseCardProps> = ({
  clause,
  inDocument,
  onToggleAdd,
  onEdit,
  onDelete
}) => {

  // Helper to render text with yellow highlighted bracket variables [Variable]
  const renderHighlightedContent = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    const processLine = (str: string) => {
      const parts = str.split(/(\[[^\]]+\])/g);
      return parts.map((part, idx) => {
        if (part.startsWith('[') && part.endsWith(']')) {
          return (
            <span key={idx} className="var-highlight">
              {part}
            </span>
          );
        }
        return part;
      });
    };

    if (lines.length > 1) {
      return (
        <div className="space-y-1">
          {lines.map((line, idx) => (
            <li key={idx}>
              {processLine(line)}
            </li>
          ))}
        </div>
      );
    }

    return <li>{processLine(text)}</li>;
  };

  return (
    <div
      className={`clause-card ${inDocument ? 'added-clause' : ''}`}
      id={`clause-${clause.id}`}
      data-favorite={clause.isFavorite ? '1' : '0'}
    >
      {/* Кнопка с плюсиком/галочкой слева сверху */}
      <a
        href="#"
        title={inDocument ? 'Удалить из конструктора' : 'Добавить в конструктор'}
        className={`action-button add-button ${inDocument ? 'added' : ''}`}
        onClick={(e) => {
          e.preventDefault();
          onToggleAdd(clause);
        }}
      >
        {inDocument ? '✓' : '+'}
      </a>

      {/* Блок с системным именем и кнопкой опций */}
      <div className="clause-header-bar">
        <table className="clause-actions" cellSpacing="0" cellPadding="0">
          <tbody>
            <tr>
              <td className="clause-name">
                <span>{clause.name}</span>
              </td>
              <td className="clause-button">
                <a
                  href="#"
                  title="Опции"
                  className="action-button option-button"
                  onClick={(e) => {
                    e.preventDefault();
                    onEdit(clause);
                  }}
                >
                  ...
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Блок с заголовком пункта и самим текстом */}
      <div className="clause-body">
        <table className="clause-title-tab" cellSpacing="0" cellPadding="0">
          <tbody>
            <tr>
              <td className="clause-title">
                {clause.titleRu || clause.name}
              </td>
              <td className="clause-button-edit">
                <a
                  href="#"
                  title="Редактировать"
                  className="action-button edit-button"
                  onClick={(e) => {
                    e.preventDefault();
                    onEdit(clause);
                  }}
                />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Блок с самим текстом пункта */}
        <div className="clause-content">
          <div className="clause-content-list-indent">
            {renderHighlightedContent(clause.contentRu)}
          </div>
        </div>

        {/* Delete action row */}
        <div className="flex items-center justify-end text-[10px] pt-2 mt-2 border-t border-slate-100 font-sans">
          <button
            onClick={() => onDelete(clause.id)}
            className="text-slate-400 hover:text-rose-600 font-semibold transition-colors flex items-center space-x-1"
            title="Удалить пункт из библиотеки"
          >
            <Trash2 className="w-3 h-3" />
            <span>Удалить</span>
          </button>
        </div>

      </div>
    </div>
  );
};
