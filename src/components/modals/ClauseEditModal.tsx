import React, { useState, useEffect, useRef } from 'react';
import { X, HelpCircle, Star, Trash2, GitBranch, ListOrdered, List, Indent, Outdent, ChevronDown, Columns2, Columns3, Split, Link2, Variable, Sparkles, Check } from 'lucide-react';
import { Clause, FolderNode } from '../../types';
import { generateUniqueClauseId } from '../../utils/idGenerator';
import { getHierarchicalNumber, extractClauseSubItems, isClauseTitleVisible } from '../../utils/numbering';
import { ClauseQuestionsModal } from './ClauseQuestionsModal';
import { DslConditionBuilderModal } from './DslConditionBuilderModal';

interface ClauseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  clause: Clause | null;
  folders: FolderNode[];
  onSave: (clause: Clause) => void;
  targetMode?: 'library' | 'document';
  onSaveToLibrary?: (clause: Clause) => void;
  documentClauses?: Clause[];
}

export const ClauseEditModal: React.FC<ClauseEditModalProps> = ({
  isOpen,
  onClose,
  clause,
  folders,
  onSave,
  targetMode = 'library',
  onSaveToLibrary,
  documentClauses = []
}) => {
  const [saveAlsoToLibrary, setSaveAlsoToLibrary] = useState(false);

  const [form, setForm] = useState<Partial<Clause>>({
    name: '',
    titleRu: '',
    titleEn: '',
    contentRu: '',
    contentEn: '',
    category: 'Поставка',
    folderId: '3',
    questions: [],
    isFavorite: false
  });

  const [isQuestionsModalOpen, setIsQuestionsModalOpen] = useState(false);
  const [isDslBuilderOpen, setIsDslBuilderOpen] = useState(false);
  const [activeMenuSection, setActiveMenuSection] = useState<string | null>(null);
  const [showEnglishTitle, setShowEnglishTitle] = useState(false);
  const [showEnglishBody, setShowEnglishBody] = useState(false);
  const [locationMode, setLocationMode] = useState<'path' | 'tree'>('path');
  const [isTreeDropdownOpen, setIsTreeDropdownOpen] = useState(false);

  // Focus and Active Editor state for showing toolbar ONLY on focus
  const [activeEditor, setActiveEditor] = useState<'contentRu' | 'contentEn' | null>(null);

  // States for conditional expression and reference dropdowns
  const [isRuDslDropdownOpen, setIsRuDslDropdownOpen] = useState(false);
  const [isEnDslDropdownOpen, setIsEnDslDropdownOpen] = useState(false);
  const [isRuRefDropdownOpen, setIsRuRefDropdownOpen] = useState(false);
  const [isEnRefDropdownOpen, setIsEnRefDropdownOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const contentRuRef = useRef<HTMLTextAreaElement>(null);
  const contentEnRef = useRef<HTMLTextAreaElement>(null);
  const previewRuRef = useRef<HTMLDivElement>(null);
  const previewEnRef = useRef<HTMLDivElement>(null);
  const ruDslDropdownRef = useRef<HTMLDivElement>(null);
  const enDslDropdownRef = useRef<HTMLDivElement>(null);
  const ruRefDropdownRef = useRef<HTMLDivElement>(null);
  const enRefDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSaveAlsoToLibrary(false);
    if (clause) {
      setForm(clause);
      setShowEnglishTitle(!!clause.titleEn);
      setShowEnglishBody(!!clause.contentEn);
    } else {
      if (targetMode === 'document') {
        setForm({
          id: `adhoc-${Date.now()}`,
          name: 'Индивидуальный пункт (Ad hoc)',
          titleRu: 'Особые условия',
          titleEn: '',
          contentRu: 'Стороны договорились, что [Условие_1]. За нарушение условий применяется [Санкция].',
          contentEn: '',
          category: 'Общие условия',
          folderId: '3',
          isFavorite: false,
          questions: []
        });
      } else {
        setForm({
          id: `c-${Date.now()}`,
          name: 'Новый пункт библиотеки',
          titleRu: 'Ответственность сторон',
          titleEn: '',
          contentRu: 'В случае нарушения [Поставщиком] сроков поставки [Продукции], [Поставщик] уплачивает [Покупателю] неустойку в размере 0,5% за каждый день просрочки.',
          contentEn: '',
          category: 'Поставка',
          folderId: '3',
          isFavorite: false,
          questions: []
        });
      }
      setShowEnglishTitle(false);
      setShowEnglishBody(false);
    }
  }, [clause, isOpen, targetMode]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuSection(null);
      }
    };
    if (activeMenuSection) {
      window.document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuSection]);

  useEffect(() => {
    const clickOutsideDropdowns = (e: MouseEvent) => {
      if (isRuDslDropdownOpen && ruDslDropdownRef.current && !ruDslDropdownRef.current.contains(e.target as Node)) {
        setIsRuDslDropdownOpen(false);
      }
      if (isEnDslDropdownOpen && enDslDropdownRef.current && !enDslDropdownRef.current.contains(e.target as Node)) {
        setIsEnDslDropdownOpen(false);
      }
      if (isRuRefDropdownOpen && ruRefDropdownRef.current && !ruRefDropdownRef.current.contains(e.target as Node)) {
        setIsRuRefDropdownOpen(false);
      }
      if (isEnRefDropdownOpen && enRefDropdownRef.current && !enRefDropdownRef.current.contains(e.target as Node)) {
        setIsEnRefDropdownOpen(false);
      }
    };
    window.document.addEventListener('mousedown', clickOutsideDropdowns);
    return () => {
      window.document.removeEventListener('mousedown', clickOutsideDropdowns);
    };
  }, [isRuDslDropdownOpen, isEnDslDropdownOpen, isRuRefDropdownOpen, isEnRefDropdownOpen]);

  // Adjust textarea height dynamically to fit text content exactly
  const adjustTextareaHeight = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    const minH = 100;
    const targetH = Math.max(minH, el.scrollHeight);
    el.style.height = `${targetH}px`;
  };

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      adjustTextareaHeight(contentRuRef.current);
      if (showEnglishBody) {
        adjustTextareaHeight(contentEnRef.current);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [form.contentRu, form.contentEn, isOpen, showEnglishBody]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.contentRu) return;

    const isAdHoc = targetMode === 'document' || form.isAdHoc || form.id?.startsWith('adhoc-');
    const fullClause: Clause = {
      ...form,
      id: form.id || generateUniqueClauseId(targetMode === 'document' ? 'adhoc' : 'c'),
      name: form.name,
      titleRu: form.titleRu || form.name,
      titleEn: form.titleEn,
      contentRu: form.contentRu,
      contentEn: form.contentEn,
      category: form.category || 'Поставка',
      folderId: form.folderId,
      isFavorite: form.isFavorite || false,
      isAdHoc: isAdHoc,
      questions: form.questions || [],
      hideNumber: Boolean(form.hideNumber),
      noAutoSubnumbers: Boolean(form.noAutoSubnumbers)
    };

    if (targetMode === 'document' && saveAlsoToLibrary && onSaveToLibrary) {
      onSaveToLibrary(fullClause);
    }

    onSave(fullClause);
    onClose();
  };

  // Synchronize scroll position between textarea and live preview layer
  const handleScroll = (
    taRef: React.RefObject<HTMLTextAreaElement | null>,
    pvRef: React.RefObject<HTMLDivElement | null>
  ) => {
    if (taRef.current && pvRef.current) {
      pvRef.current.scrollTop = taRef.current.scrollTop;
    }
  };

  // Toggle Numbering for the Clause (Like in Word)
  const toggleNumbering = () => {
    const isCurrentlyNumbered = !form.hideNumber && !form.noAutoSubnumbers;
    if (isCurrentlyNumbered) {
      // Turn numbering OFF
      setForm(prev => ({ ...prev, hideNumber: true, noAutoSubnumbers: true }));
    } else {
      // Turn numbering ON
      setForm(prev => ({ ...prev, hideNumber: false, noAutoSubnumbers: false }));
    }
  };

  // Tab Key & Indentation Support (\t) and Word-like Backspace
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    field: 'contentRu' | 'contentEn'
  ) => {
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const val = target.value;
    const lineStart = val.lastIndexOf('\n', start - 1) + 1;

    if (e.key === 'Tab') {
      e.preventDefault();

      if (!e.shiftKey) {
        // Add tab
        const newVal = val.substring(0, lineStart) + '\t' + val.substring(lineStart);
        setForm(prev => ({ ...prev, [field]: newVal }));
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 1;
        }, 0);
      } else {
        // Remove tab if exists
        if (val.substring(lineStart, lineStart + 1) === '\t') {
          const newVal = val.substring(0, lineStart) + val.substring(lineStart + 1);
          setForm(prev => ({ ...prev, [field]: newVal }));
          setTimeout(() => {
            target.selectionStart = target.selectionEnd = Math.max(lineStart, start - 1);
          }, 0);
        }
      }
    } else if (e.key === 'Backspace' && start === end) {
      // Word-like Backspace at beginning of line
      const prefixBeforeCursor = val.substring(lineStart, start);
      
      // If cursor is at start of line
      if (prefixBeforeCursor === '') {
        const lineText = val.substring(lineStart);
        
        // If line has bullet, remove bullet
        if (/^([•\-—])\s*/.test(lineText)) {
          e.preventDefault();
          const cleanLine = lineText.replace(/^([•\-—])\s*/, '');
          const newVal = val.substring(0, lineStart) + cleanLine;
          setForm(prev => ({ ...prev, [field]: newVal }));
          setTimeout(() => {
            target.selectionStart = target.selectionEnd = lineStart;
          }, 0);
          return;
        }

        // If numbering is active and user presses Backspace at the beginning of the clause / line 0
        if (lineStart === 0 && (!form.hideNumber || !form.noAutoSubnumbers)) {
          e.preventDefault();
          setForm(prev => ({ ...prev, hideNumber: true, noAutoSubnumbers: true }));
          return;
        }
      } else if (/^\t+$/.test(prefixBeforeCursor)) {
        // Cursor is after tabs at the beginning of content - remove one tab
        e.preventDefault();
        const newVal = val.substring(0, start - 1) + val.substring(start);
        setForm(prev => ({ ...prev, [field]: newVal }));
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start - 1;
        }, 0);
      }
    }
  };

  // Adjust indentation/level of the current line or selection
  const changeLineIndent = (direction: 'increase' | 'decrease') => {
    const activeField = activeEditor || 'contentRu';
    const taRef = activeField === 'contentRu' ? contentRuRef : contentEnRef;
    const ta = taRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = form[activeField] || '';

    // Find full lines involved in current selection
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = text.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = text.length;

    const linesBlock = text.substring(lineStart, lineEnd);
    const splitLines = linesBlock.split('\n');

    const modifiedLines = splitLines.map(line => {
      if (direction === 'increase') {
        return '\t' + line;
      } else {
        if (line.startsWith('\t')) {
          return line.substring(1);
        }
        return line;
      }
    });

    const newBlock = modifiedLines.join('\n');
    const newText = text.substring(0, lineStart) + newBlock + text.substring(lineEnd);
    setForm(prev => ({ ...prev, [activeField]: newText }));

    setTimeout(() => {
      ta.focus();
      if (start === end) {
        // Simple cursor position adjustments
        const originalFirstLine = splitLines[0] || '';
        const hasTabToRemove = direction === 'decrease' && originalFirstLine.startsWith('\t');
        const offset = direction === 'increase' ? 1 : (hasTabToRemove ? -1 : 0);
        const newCursorPos = Math.max(lineStart, start + offset);
        ta.selectionStart = ta.selectionEnd = newCursorPos;
      } else {
        // Keep selection of the whole block
        ta.selectionStart = lineStart;
        ta.selectionEnd = lineStart + newBlock.length;
      }
    }, 0);
  };

  // Toggle line prefix formatting for bullets • or dashes -
  const toggleLinePrefix = (prefixToToggle: string) => {
    const activeField = activeEditor || 'contentRu';
    const taRef = activeField === 'contentRu' ? contentRuRef : contentEnRef;
    const ta = taRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = form[activeField] || '';

    // Find full lines involved in current selection
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = text.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = text.length;

    const linesBlock = text.substring(lineStart, lineEnd);
    const splitLines = linesBlock.split('\n');

    const modifiedLines = splitLines.map(line => {
      let tabs = '';
      let rest = line;
      while (rest.startsWith('\t')) {
        tabs += '\t';
        rest = rest.substring(1);
      }

      if (prefixToToggle === '• ') {
        if (rest.startsWith('• ') || rest.startsWith('•')) {
          rest = rest.replace(/^•\s*/, '');
        } else {
          rest = rest.replace(/^([\-—])\s*/, '');
          rest = '• ' + rest;
        }
      } else if (prefixToToggle === '- ') {
        if (rest.startsWith('- ') || rest.startsWith('— ')) {
          rest = rest.replace(/^[\-—]\s*/, '');
        } else {
          rest = rest.replace(/^•\s*/, '');
          rest = '- ' + rest;
        }
      }

      return tabs + rest;
    });

    const newBlock = modifiedLines.join('\n');
    const newText = text.substring(0, lineStart) + newBlock + text.substring(lineEnd);
    setForm(prev => ({ ...prev, [activeField]: newText }));

    setTimeout(() => {
      ta.focus();
      ta.selectionStart = lineStart;
      ta.selectionEnd = lineStart + newBlock.length;
    }, 0);
  };

  // Text formatting function for Bold, Italic, Brackets, etc.
  const formatText = (startTag: string, endTag: string) => {
    const activeField = activeEditor || 'contentRu';
    const taRef = activeField === 'contentRu' ? contentRuRef : contentEnRef;
    const ta = taRef.current;

    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = form[activeField] || '';
    const selectedText = text.substring(start, end);

    let inserted = '';
    if (startTag === '[' && endTag === ']' && !selectedText) {
      inserted = '[Переменная]';
    } else if (startTag === '{IF}' && !selectedText) {
      inserted = "{IF [ПЕРЕМЕННАЯ] == 'ЗНАЧЕНИЕ'} Текст {ENDIF}";
    } else if (startTag === '{IF_ELSE}' && !selectedText) {
      inserted = "{IF [ПЕРЕМЕННАЯ] == 'ЗНАЧЕНИЕ'} Основной текст {ELSE} Альтернативный текст {ENDIF}";
    } else if (startTag === '{IF}' && selectedText) {
      inserted = `{IF [ПЕРЕМЕННАЯ] == 'ЗНАЧЕНИЕ'} ${selectedText} {ENDIF}`;
    } else if (startTag === '{IF_ELSE}' && selectedText) {
      inserted = `{IF [ПЕРЕМЕННАЯ] == 'ЗНАЧЕНИЕ'} ${selectedText} {ELSE} Альтернатива {ENDIF}`;
    } else {
      inserted = startTag + selectedText + endTag;
    }

    const newText = text.substring(0, start) + inserted + text.substring(end);
    setForm(prev => ({ ...prev, [activeField]: newText }));

    setTimeout(() => {
      ta.focus();
      const newCursorPos = start + inserted.length;
      ta.selectionStart = newCursorPos;
      ta.selectionEnd = newCursorPos;
    }, 0);
  };

  // Helper to insert column separator (===)
  const insertColumnSeparator = () => {
    const activeField = activeEditor || 'contentRu';
    const taRef = activeField === 'contentRu' ? contentRuRef : contentEnRef;
    const ta = taRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = form[activeField] || '';
    const separator = '\n===\n';

    const newText = text.substring(0, start) + separator + text.substring(end);
    const countSeparators = (newText.match(/(?:={3,}|\|{3,})/g) || []).length;
    const newColsCount = countSeparators >= 2 ? 3 : 2;

    setForm(prev => ({
      ...prev,
      [activeField]: newText,
      isMultiColumn: true,
      columnsCount: newColsCount,
      noAutoSubnumbers: true
    }));

    setTimeout(() => {
      ta.focus();
      const newCursorPos = start + separator.length;
      ta.selectionStart = newCursorPos;
      ta.selectionEnd = newCursorPos;
    }, 0);
  };

  // Helper to switch to 1 single column (removes delimiters and resets multi-column mode)
  const switchToOneColumn = () => {
    const delimiterRegex = /\n?\s*(?:={3,}|\|{3,})\s*\n?/g;
    const cleanRu = (form.contentRu || '').split(delimiterRegex).filter(Boolean).join('\n\n');
    const cleanEn = form.contentEn ? form.contentEn.split(delimiterRegex).filter(Boolean).join('\n\n') : '';

    setForm(prev => ({
      ...prev,
      contentRu: cleanRu,
      contentEn: cleanEn,
      isMultiColumn: false,
      columnsCount: 1
    }));
  };

  // Helper to switch to 2 columns (applies template if no columns exist, or updates count)
  const switchToTwoColumns = () => {
    const currentRu = form.contentRu || '';
    const hasDelimiter = currentRu.includes('===') || currentRu.includes('|||');
    if (!hasDelimiter) {
      applyRequisitesTemplate(2);
    } else {
      setForm(prev => ({
        ...prev,
        isMultiColumn: true,
        columnsCount: 2,
        noAutoSubnumbers: true
      }));
    }
  };

  // Helper to switch to 3 columns (applies template if no columns exist, or updates count)
  const switchToThreeColumns = () => {
    const currentRu = form.contentRu || '';
    const hasDelimiter = currentRu.includes('===') || currentRu.includes('|||');
    if (!hasDelimiter) {
      applyRequisitesTemplate(3);
    } else {
      setForm(prev => ({
        ...prev,
        isMultiColumn: true,
        columnsCount: 3,
        noAutoSubnumbers: true
      }));
    }
  };

  // Helper to apply 2-party or 3-party pre-filled requisites and signatures template
  const applyRequisitesTemplate = (cols: 2 | 3) => {
    const activeField = activeEditor || 'contentRu';
    let template = '';
    if (cols === 2) {
      template = `<b>[ПОКУПАТЕЛЬ]:</b>\n[Сторона_А]\nКод ЕГРПОУ/ИНН: [Код_Стороны_А]\nАдрес: [Адрес_Стороны_А]\nБанк: [Банк_Стороны_А]\nР/с (IBAN): [Счет_Стороны_А]\nДиректор: [Директор_Стороны_А]\n\nМ.П. ___________________ / [Директор_Стороны_А] /\n===\n<b>[ПОСТАВЩИК]:</b>\n[Сторона_Б]\nКод ЕГРПОУ/ИНН: [Код_Стороны_Б]\nАдрес: [Адрес_Стороны_Б]\nБанк: [Банк_Стороны_Б]\nР/с (IBAN): [Счет_Стороны_Б]\nДиректор: [Директор_Стороны_Б]\n\nМ.П. ___________________ / [Директор_Стороны_Б] /`;
    } else {
      template = `<b>[ЗАКАЗЧИК / СТОРОНА 1]:</b>\n[Сторона_А]\nКод ЕГРПОУ/ИНН: [Код_Стороны_А]\nАдрес: [Адрес_Стороны_А]\nБанк: [Банк_Стороны_А]\nР/с: [Счет_Стороны_А]\nДиректор: [Директор_Стороны_А]\n\nМ.П. ___________________\n===\n<b>[ИСПОЛНИТЕЛЬ / СТОРОНА 2]:</b>\n[Сторона_Б]\nКод ЕГРПОУ/ИНН: [Код_Стороны_Б]\nАдрес: [Адрес_Стороны_Б]\nБанк: [Банк_Стороны_Б]\nР/с: [Счет_Стороны_Б]\nДиректор: [Директор_Стороны_Б]\n\nМ.П. ___________________\n===\n<b>[ГАРАНТ / ПЛАТЕЛЬЩИК / СТОРОНА 3]:</b>\n[Сторона_В]\nКод ЕГРПОУ/ИНН: [Код_Стороны_В]\nАдрес: [Адрес_Стороны_В]\nБанк: [Банк_Стороны_В]\nР/с: [Счет_Стороны_В]\nДиректор: [Директор_Стороны_В]\n\nМ.П. ___________________`;
    }

    setForm(prev => ({
      ...prev,
      [activeField]: template,
      titleRu: prev.titleRu || (cols === 2 ? 'Адреса, банковские реквизиты и подписи Сторон' : 'Адреса, реквизиты и подписи Сторон'),
      category: 'Реквизиты',
      columnsCount: cols,
      isMultiColumn: true,
      noAutoSubnumbers: true
    }));
  };

  // Helper to parse line text into formatted JSX elements (yellow highlight for variables & HTML tags)
  // Ensures exact 1:1 font metrics and zero horizontal padding so that the overlay aligns pixel-for-pixel with the textarea
  const renderPreviewLineContent = (lineText: string) => {
    // Regex splits variables [...], DSL condition tags {...}, and formatting tags <b>, <i>, <u>, etc.
    const parts = lineText.split(/(\{[^}]+\}|\[[^\]]+\]|<\/?b>|<\/?i>|<\/?u>|<\/?del>|<\/?s>)/gi);

    return parts.map((part, index) => {
      if (!part) return null;

      if (part.startsWith('[') && part.endsWith(']')) {
        const varInner = part.slice(1, -1);
        const isRef = varInner.toLowerCase().startsWith('ref:');
        return (
          <span
            key={`var-${index}`}
            style={{
              background: isRef ? '#e0f2fe' : '#fef08a',
              color: isRef ? '#0369a1' : '#854d0e',
              fontWeight: 'inherit',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit',
              letterSpacing: 'inherit',
              padding: 0,
              margin: 0,
              border: 'none',
              borderRadius: 0,
              display: 'inline'
            }}
          >
            {part}
          </span>
        );
      }

      if (part.startsWith('{') && part.endsWith('}')) {
        const isIf = part.toUpperCase().startsWith('{IF');
        const isElse = part.toUpperCase() === '{ELSE}';
        const isEndIf = part.toUpperCase() === '{ENDIF}';

        if (isIf || isElse || isEndIf) {
          return (
            <span
              key={`dsl-${index}`}
              style={{
                background: isElse ? '#fef3c7' : '#f3e8ff',
                color: isElse ? '#92400e' : '#6b21a8',
                fontWeight: 'inherit',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                lineHeight: 'inherit',
                letterSpacing: 'inherit',
                padding: 0,
                margin: 0,
                border: 'none',
                borderRadius: 0,
                display: 'inline'
              }}
            >
              {part}
            </span>
          );
        }
      }

      if (/^<\/?(b|i|u|del|s)>$/i.test(part)) {
        return (
          <span
            key={`tag-${index}`}
            style={{
              color: '#94a3b8',
              fontWeight: 'inherit',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit',
              padding: 0,
              margin: 0,
              border: 'none',
              borderRadius: 0,
              display: 'inline'
            }}
          >
            {part}
          </span>
        );
      }

      return <span key={`txt-${index}`}>{part}</span>;
    });
  };

  // Render the entire Live Preview overlay layer with auto outline levels matching textarea line-for-line
  const renderLivePreview = (textValue: string) => {
    if (!textValue) {
      return <div className="preview-line level-1"><br /></div>;
    }

    const lines = textValue.split('\n');

    return lines.map((rawLine, idx) => {
      if (rawLine.replace(/^\s+|\s+$/g, '') === '') {
        return (
          <div key={idx} className="preview-line level-1">
            <br />
          </div>
        );
      }

      const trimmed = rawLine.trim();
      const isDelimiter = trimmed === '===' || trimmed === '|||' || /^={3,}$/.test(trimmed) || /^\|{3,}$/.test(trimmed);

      if (isDelimiter) {
        return (
          <div key={idx} className="preview-line level-1">
            <span
              style={{
                color: '#4f46e5',
                background: '#e0e7ff',
                fontWeight: 'inherit',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                lineHeight: 'inherit',
                padding: 0,
                margin: 0,
                border: 'none',
                borderRadius: 0,
                display: 'inline'
              }}
            >
              {rawLine}
            </span>
          </div>
        );
      }

      let lvl = 1;
      let textToCount = rawLine;
      while (textToCount.startsWith('\t')) {
        lvl++;
        textToCount = textToCount.substring(1);
      }
      if (lvl > 4) lvl = 4;

      return (
        <div key={idx} className={`preview-line level-${lvl}`}>
          {renderPreviewLineContent(rawLine)}
        </div>
      );
    });
  };

  const categories = ['Поставка', 'Ответственность', 'Приемка', 'Подряд', 'Общие условия', 'ЭДО', 'Форс-мажор', 'Аренда'];

  // Recursive tree renderer for folder selection
  const renderFolderTreeNodes = (nodes: FolderNode[], level = 0) => {
    return (
      <ul className={level === 0 ? "treeview" : "pl-4 space-y-1"}>
        {nodes.map(node => (
          <li key={node.id} className="py-0.5">
            <button
              type="button"
              onClick={() => {
                setForm(prev => ({ ...prev, category: node.name, folderId: node.id }));
                setIsTreeDropdownOpen(false);
              }}
              className={`w-full text-left px-2 py-1 rounded text-xs transition-colors flex items-center justify-between cursor-pointer ${
                form.category === node.name || form.folderId === node.id
                  ? 'bg-[#2a6db5] text-white font-bold'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span className="flex items-center space-x-1.5">
                <span>📁</span>
                <span>{node.name}</span>
              </span>
            </button>
            {node.children && node.children.length > 0 && renderFolderTreeNodes(node.children, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-[#f0f4f8] rounded-xl max-w-[900px] w-full shadow-2xl border border-slate-300 flex flex-col max-h-[92vh] overflow-hidden text-slate-800">
        
        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto bg-[#f0f4f8]">
          {/* Target Mode Banner */}
          {targetMode === 'document' ? (
            (!clause || form.id?.startsWith('adhoc-')) ? (
              <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs">
                <span>⚡ Настройка Ad hoc пункта — сохраняется прямо в текущий договор (без добавления в библиотеку)</span>
                <span className="text-[11px] opacity-90 font-bold">Индивидуальный пункт (Ad hoc)</span>
              </div>
            ) : (
              <div className="bg-indigo-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs">
                <span>📝 Редактирование пункта в договоре — изменения применятся к этому договору (библиотека не затронется)</span>
                <span className="text-[11px] opacity-90 font-bold">Пункт в договоре</span>
              </div>
            )
          ) : (
            <div className="bg-blue-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs">
              <span>📚 Редактирование пункта библиотеки клауз — изменения сохранятся в общую библиотеку</span>
              <span className="text-[11px] opacity-90 font-bold">Общая библиотека</span>
            </div>
          )}

          <form id="clause-form" onSubmit={handleSubmit} className="divide-y-2 divide-[#f0f4f8]">
            
            {/* NAME SECTION */}
            <div className="flex bg-white">
              <div className="w-[110px] min-w-[110px] bg-[#dce8f5] p-3.5 font-bold text-[13px] text-[#333] border-b-2 border-[#f0f4f8] flex flex-col justify-center">
                Name
              </div>
              <div className="flex-1 bg-white p-3 px-4 border-b-2 border-[#f0f4f8] flex items-center">
                <input
                  type="text"
                  required
                  value={form.name || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-[#fafafa] text-sm text-slate-800 focus:outline-none focus:border-[#2a6db5] focus:bg-white font-medium"
                  placeholder="Системное название клаузы"
                />
              </div>
            </div>

            {/* LOCATION SECTION */}
            <div className="flex bg-white">
              <div className="w-[110px] min-w-[110px] bg-[#dce8f5] p-3.5 font-bold text-[13px] text-[#333] border-b-2 border-[#f0f4f8] flex flex-col justify-start pt-3">
                Location
              </div>
              <div className="flex-1 bg-white p-3 px-4 border-b-2 border-[#f0f4f8] space-y-2">
                <div className="inline-block bg-[#dce8f5] rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => setLocationMode('path')}
                    className={`px-3 py-1 text-xs rounded-lg transition-all ${locationMode === 'path' ? 'bg-white text-[#2a6db5] font-bold shadow-xs' : 'text-slate-600'}`}
                  >
                    ☰ Path
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode('tree')}
                    className={`px-3 py-1 text-xs rounded-lg transition-all ${locationMode === 'tree' ? 'bg-white text-[#2a6db5] font-bold shadow-xs' : 'text-slate-600'}`}
                  >
                    📁 Tree
                  </button>
                </div>

                {locationMode === 'path' ? (
                  <div className="relative">
                    <div className="flex items-center flex-wrap gap-1.5 text-xs">
                      <span className="flex items-center bg-[#dce8f5] border border-[#b8d0ea] rounded px-2.5 py-1 text-[#2a4a7f]">
                        📁 Agreements
                      </span>
                      <span className="text-slate-400 text-sm">›</span>
                      <button
                        type="button"
                        onClick={() => setIsTreeDropdownOpen(!isTreeDropdownOpen)}
                        className="flex items-center bg-white border border-[#2a6db5] rounded px-2.5 py-1 text-xs text-[#2a6db5] font-bold shadow-xs cursor-pointer"
                      >
                        <span>📁 {form.category || 'Поставка'}</span>
                        <span className="ml-1 text-[10px]">▼</span>
                      </button>
                    </div>

                    {isTreeDropdownOpen && (
                      <div className="absolute top-8 left-0 z-40 bg-white border border-slate-300 rounded-md shadow-xl w-72 max-h-60 overflow-y-auto p-2">
                        {folders && folders.length > 0 ? (
                          renderFolderTreeNodes(folders)
                        ) : (
                          <div className="space-y-1">
                            {categories.map(cat => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  setForm(prev => ({ ...prev, category: cat }));
                                  setIsTreeDropdownOpen(false);
                                }}
                                className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center space-x-2 ${
                                  form.category === cat ? 'bg-[#2a6db5] text-white font-bold' : 'hover:bg-slate-100 text-slate-700'
                                }`}
                              >
                                <span>📁</span>
                                <span>{cat}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded p-2 bg-[#fafafa] max-h-48 overflow-y-auto text-xs">
                    {folders && folders.length > 0 ? (
                      renderFolderTreeNodes(folders)
                    ) : (
                      <div className="space-y-1">
                        {categories.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, category: cat }))}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center space-x-2 ${
                              form.category === cat ? 'bg-[#2a6db5] text-white font-bold' : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span>📁</span>
                            <span>{cat}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* TITLE SECTION */}
            <div className="flex bg-white relative">
              <div className="w-[110px] min-w-[110px] bg-[#dce8f5] p-3.5 font-bold text-[13px] text-[#333] border-b-2 border-[#f0f4f8] flex flex-col justify-between">
                <span>Title</span>
                <div className="relative" ref={activeMenuSection === 'title' ? menuRef : null}>
                  <button
                    type="button"
                    onClick={() => setActiveMenuSection(activeMenuSection === 'title' ? null : 'title')}
                    className="font-normal text-[11px] text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
                  >
                    •••
                  </button>

                  {activeMenuSection === 'title' && (
                    <div className="absolute left-0 top-5 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-30 font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuestionsModalOpen(true);
                          setActiveMenuSection(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-between"
                      >
                        <span className="flex items-center space-x-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                          <span>Вопросы анкеты</span>
                        </span>
                        {form.questions && form.questions.length > 0 && (
                          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                            {form.questions.length}
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 bg-white p-3 px-4 border-b-2 border-[#f0f4f8] space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="flex flex-col items-center space-y-1">
                    <span className="bg-[#dce8f5] text-[#555] text-[11px] font-bold px-2 py-0.5 rounded min-w-[30px] text-center">
                      UK
                    </span>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, titleRu: '' }))}
                      className="text-slate-400 hover:text-rose-600 p-0.5 transition-colors"
                      title="Очистить заголовок"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    rows={1}
                    value={form.titleRu || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, titleRu: e.target.value }))}
                    className="flex-1 p-2 border border-slate-300 rounded bg-[#fafafa] text-sm text-slate-800 focus:outline-none focus:border-[#2a6db5] focus:bg-white resize-none font-medium"
                    placeholder="Заголовок раздела в договоре"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-1 pl-1">
                  <label className="flex items-center space-x-2 text-xs text-slate-600 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.showTitle !== false}
                      onChange={(e) => setForm(prev => ({ ...prev, showTitle: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                    />
                    <span>Отображать заголовок этого пункта в договоре</span>
                  </label>
                </div>

                {showEnglishTitle && (
                  <div className="flex items-start space-x-2 pt-1 border-t border-slate-100">
                    <div className="flex flex-col items-center space-y-1">
                      <span className="bg-[#dce8f5] text-[#555] text-[11px] font-bold px-2 py-0.5 rounded min-w-[30px] text-center">
                        ENG
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEnglishTitle(false);
                          setForm(prev => ({ ...prev, titleEn: '' }));
                        }}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                        title="Удалить версию"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      rows={1}
                      value={form.titleEn || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, titleEn: e.target.value }))}
                      className="flex-1 p-2 border border-slate-300 rounded bg-[#fafafa] text-sm text-slate-800 focus:outline-none focus:border-[#2a6db5] focus:bg-white resize-none font-medium"
                      placeholder="Title in English"
                    />
                  </div>
                )}

                {!showEnglishTitle && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowEnglishTitle(true)}
                      className="bg-[#dce8f5] hover:bg-[#cbe0f5] text-[#334155] text-xs font-bold px-2.5 py-1 rounded-full transition-colors"
                    >
                      + English
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* BODY SECTION */}
            <div className="flex bg-white relative">
              <div className="w-[110px] min-w-[110px] bg-[#dce8f5] p-3.5 font-bold text-[13px] text-[#333] border-b-2 border-[#f0f4f8] flex flex-col justify-between">
                <span>Body</span>
                <div className="relative" ref={activeMenuSection === 'body' ? menuRef : null}>
                  <button
                    type="button"
                    onClick={() => setActiveMenuSection(activeMenuSection === 'body' ? null : 'body')}
                    className="font-normal text-[11px] text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
                  >
                    •••
                  </button>

                  {activeMenuSection === 'body' && (
                    <div className="absolute left-0 top-5 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-30 font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuestionsModalOpen(true);
                          setActiveMenuSection(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-between"
                      >
                        <span className="flex items-center space-x-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                          <span>Вопросы анкеты</span>
                        </span>
                        {form.questions && form.questions.length > 0 && (
                          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                            {form.questions.length}
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 bg-white p-3 px-4 border-b-2 border-[#f0f4f8] space-y-3">
                {/* Numbering & Layout Mode Toggles for Body */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-[#f8fafc] rounded-lg border border-slate-200/80 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700 font-medium select-none hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={Boolean(form.hideNumber)}
                        onChange={(e) => setForm(prev => ({ ...prev, hideNumber: e.target.checked }))}
                        className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                      />
                      <span>Без номера пункта</span>
                    </label>

                    <div className="h-3.5 w-px bg-slate-300" />

                    <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700 font-medium select-none hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={!form.noAutoSubnumbers}
                        onChange={(e) => setForm(prev => ({ ...prev, noAutoSubnumbers: !e.target.checked }))}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>Автонумерация (1.1, 1.2...)</span>
                    </label>
                  </div>

                  {/* Multi-column layout & Requisites template selector */}
                  <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
                      <Split className="w-3 h-3 text-indigo-600" />
                      Колонки:
                    </span>
                    <button
                      type="button"
                      onClick={switchToOneColumn}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        !form.isMultiColumn || (!form.columnsCount || form.columnsCount === 1)
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      title="1 колонка (обычный текст)"
                    >
                      1
                    </button>
                    <button
                      type="button"
                      onClick={switchToTwoColumns}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                        form.isMultiColumn && form.columnsCount === 2
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      title="2 колонки (Реквизиты и подписи 2 сторон)"
                    >
                      <Columns2 className="w-3 h-3" />
                      <span>2 (Реквизиты)</span>
                    </button>
                    <button
                      type="button"
                      onClick={switchToThreeColumns}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                        form.isMultiColumn && form.columnsCount === 3
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      title="3 колонки (Реквизиты и подписи 3 сторон)"
                    >
                      <Columns3 className="w-3 h-3" />
                      <span>3 (3 стороны)</span>
                    </button>
                  </div>
                </div>

                {/* RU Body Editor */}
                <div className="flex items-start space-x-2">
                  <div className="flex flex-col items-center space-y-1 pt-1">
                    <span className="bg-[#dce8f5] text-[#555] text-[11px] font-bold px-2 py-0.5 rounded min-w-[30px] text-center">
                      UK
                    </span>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, contentRu: '' }))}
                      className="text-slate-400 hover:text-rose-600 p-0.5"
                      title="Очистить текст"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 relative">
                    {/* Floating Formatting Toolbar - Appears ONLY when focused on text editing area */}
                    {activeEditor === 'contentRu' && (
                      <div className="absolute -top-11 left-0 right-0 z-30 bg-[#e2e8f0] border border-[#cbd5e1] rounded-md p-1 shadow-md flex items-center space-x-1 text-xs">
                        <div className="border-r border-[#cbd5e1] pr-1.5 space-x-1 flex items-center">
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); toggleNumbering(); }}
                            className={`px-2 py-0.5 rounded font-bold flex items-center space-x-1 cursor-pointer transition-colors ${
                              !form.hideNumber && !form.noAutoSubnumbers
                                ? 'bg-[#2a6db5] text-white shadow-xs'
                                : 'text-slate-700 hover:bg-[#cbd5e1]'
                            }`}
                            title={!form.hideNumber && !form.noAutoSubnumbers ? 'Нумерация включена (нажмите для отключения)' : 'Включить нумерацию (как в Word)'}
                          >
                            <ListOrdered className="w-3.5 h-3.5" />
                            <span>1.</span>
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); toggleLinePrefix('• '); }}
                            className="px-1.5 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded font-bold flex items-center cursor-pointer"
                            title="Маркированный список (•)"
                          >
                            <List className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); toggleLinePrefix('- '); }}
                            className="px-2 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded font-bold cursor-pointer"
                            title="Список с дефисом (-)"
                          >
                            -
                          </button>
                          <div className="h-4 w-px bg-slate-300 mx-1" />
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); changeLineIndent('decrease'); }}
                            className="px-1.5 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded font-bold flex items-center cursor-pointer"
                            title="Уменьшить уровень / Сдвинуть влево (Shift+Tab)"
                          >
                            <Outdent className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); changeLineIndent('increase'); }}
                            className="px-1.5 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded font-bold flex items-center cursor-pointer"
                            title="Увеличить уровень / Сдвинуть вправо (Tab)"
                          >
                            <Indent className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="border-r border-[#cbd5e1] pr-1.5 space-x-1">
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); formatText('<b>', '</b>'); }}
                            className="px-2 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded font-bold"
                            title="Жирный"
                          >
                            <b>B</b>
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); formatText('<i>', '</i>'); }}
                            className="px-2 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded italic font-semibold"
                            title="Курсив"
                          >
                            <i>I</i>
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); formatText('<u>', '</u>'); }}
                            className="px-2 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded underline"
                            title="Подчеркнутый"
                          >
                            <u>U</u>
                          </button>
                        </div>
                        <div ref={ruRefDropdownRef} className="border-r border-[#cbd5e1] pr-1.5 space-x-1 flex items-center relative">
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); formatText('[', ']'); }}
                            className="px-2 py-0.5 text-blue-700 hover:bg-[#cbd5e1] rounded font-mono font-bold bg-white/70"
                            title="Обрамить скобками или вставить [Переменная]"
                          >
                            [ _ ]
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              if (documentClauses && documentClauses.length > 0) {
                                setIsRuRefDropdownOpen(!isRuRefDropdownOpen);
                              } else {
                                formatText('[ref:', ']');
                              }
                            }}
                            className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-bold flex items-center gap-0.5 border cursor-pointer transition-colors ${
                              isRuRefDropdownOpen
                                ? 'bg-blue-600 text-white border-blue-700'
                                : 'text-blue-800 bg-blue-50/80 hover:bg-blue-100 border-blue-200'
                            }`}
                            title="Вставить ссылку на другой пункт договора [ref:...]"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>ref</span>
                            <ChevronDown className="w-2.5 h-2.5 ml-0.5" />
                          </button>

                          {isRuRefDropdownOpen && (
                            <div className="absolute left-0 top-full mt-1 z-50 min-w-[300px] max-h-72 overflow-y-auto bg-white border border-slate-200/80 rounded-md shadow-xl py-1 flex flex-col text-left font-sans text-slate-800">
                              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                                <span>Выберите пункт или подпункт:</span>
                              </div>
                              {documentClauses.filter(c => c.id !== form.id).map((cl, idx) => {
                                const fullIndex = documentClauses.findIndex(c => c.id === cl.id);
                                const num = fullIndex !== -1 ? getHierarchicalNumber(documentClauses, fullIndex) : '';
                                const label = (num ? `п. ${num} ` : '') + (cl.titleRu || cl.name);
                                const isTitleVis = isClauseTitleVisible(cl, true);
                                const subItems = extractClauseSubItems(cl, num, isTitleVis);
                                return (
                                  <div key={cl.id || idx} className="border-b border-slate-50 last:border-0">
                                    <button
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        formatText(`[ref:${cl.id}]`, '');
                                        setIsRuRefDropdownOpen(false);
                                      }}
                                      className="px-3 py-1.5 text-left text-xs font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-900 flex items-center justify-between w-full transition-colors group"
                                    >
                                      <span className="truncate max-w-[180px]" title={label}>{label}</span>
                                      <span className="text-[10px] text-blue-600 font-mono ml-2 shrink-0 bg-blue-50/80 group-hover:bg-blue-100 px-1 rounded">
                                        [ref:{cl.id}]
                                      </span>
                                    </button>
                                    {subItems.length > 0 && (
                                      <div className="pl-3 pr-2 pb-1 space-y-0.5 bg-slate-50/60">
                                        {subItems.map((sub, sIdx) => (
                                          <button
                                            key={sIdx}
                                            type="button"
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              formatText(`[ref:${sub.id}]`, '');
                                              setIsRuRefDropdownOpen(false);
                                            }}
                                            className="px-2 py-1 text-left text-[11px] text-slate-600 hover:bg-blue-100/70 hover:text-blue-900 flex items-center justify-between w-full rounded transition-colors group/sub"
                                          >
                                            <span className="truncate max-w-[175px]" title={sub.previewText}>
                                              ↳ <strong className="font-medium text-slate-700">п. {sub.number}</strong> <span className="text-slate-500">{sub.previewText}</span>
                                            </span>
                                            <span className="text-[9px] text-blue-500 font-mono ml-1 shrink-0 group-hover/sub:text-blue-700">
                                              #{sub.anchor}
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              <div className="h-px bg-slate-100 my-1" />
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  formatText('[ref:', ']');
                                  setIsRuRefDropdownOpen(false);
                                }}
                                className="px-3 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-50 flex items-center justify-between w-full transition-colors italic"
                              >
                                <span>Ввести вручную [ref:ID#номер]</span>
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="border-r border-[#cbd5e1] pr-1.5 space-x-1 flex items-center">
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); insertColumnSeparator(); }}
                            className="px-1.5 py-0.5 text-indigo-700 hover:bg-[#cbd5e1] rounded font-mono text-[11px] font-bold flex items-center gap-0.5"
                            title="Вставить разделитель колонок (===)"
                          >
                            <Split className="w-3 h-3" />
                            <span>===</span>
                          </button>
                        </div>
                        <div ref={ruDslDropdownRef} className="border-r border-[#cbd5e1] pr-1.5 flex items-center relative">
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setIsRuDslDropdownOpen(!isRuDslDropdownOpen);
                            }}
                            className={`px-1.5 py-0.5 rounded font-bold text-[11px] flex items-center space-x-1 border shadow-2xs transition-all cursor-pointer ${
                              isRuDslDropdownOpen
                                ? 'bg-purple-700 text-white border-purple-800 shadow-inner'
                                : 'text-purple-900 bg-purple-100 hover:bg-purple-200 border-purple-300'
                            }`}
                            title="Условия и ветвление DSL"
                          >
                            <GitBranch className={`w-3.5 h-3.5 ${isRuDslDropdownOpen ? 'text-white' : 'text-purple-700'}`} />
                            <span>Условия</span>
                            <ChevronDown className={`w-3 h-3 ml-0.5 ${isRuDslDropdownOpen ? 'text-white' : 'text-purple-700'}`} />
                          </button>

                          {isRuDslDropdownOpen && (
                            <div className="absolute left-0 top-full mt-1 z-50 min-w-[210px] bg-white border border-slate-200/80 rounded-md shadow-xl py-1 flex flex-col text-left font-sans text-slate-800">
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setIsDslBuilderOpen(true);
                                  setIsRuDslDropdownOpen(false);
                                }}
                                className="px-3 py-1.5 text-left text-xs text-purple-900 hover:bg-purple-50 flex items-center space-x-2 w-full transition-colors font-semibold"
                              >
                                <GitBranch className="w-3.5 h-3.5 text-purple-700" />
                                <span>Конструктор условий DSL</span>
                              </button>
                              <div className="h-px bg-slate-100 my-1" />
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  formatText('{IF}', '');
                                  setIsRuDslDropdownOpen(false);
                                }}
                                className="px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between w-full transition-colors"
                              >
                                <span className="font-mono text-purple-800 font-bold">{'{IF}'}</span>
                                <span className="text-[10px] text-slate-400 font-sans">Простое условие</span>
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  formatText('{IF_ELSE}', '');
                                  setIsRuDslDropdownOpen(false);
                                }}
                                className="px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between w-full transition-colors"
                              >
                                <span className="font-mono text-indigo-800 font-bold">{'{IF_ELSE}'}</span>
                                <span className="text-[10px] text-slate-400 font-sans">С развилкой</span>
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  formatText('{ELSE}', '');
                                  setIsRuDslDropdownOpen(false);
                                }}
                                className="px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between w-full transition-colors"
                              >
                                <span className="font-mono text-amber-800 font-bold">{'{ELSE}'}</span>
                                <span className="text-[10px] text-slate-400 font-sans">Разделитель ветки</span>
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  formatText('{ENDIF}', '');
                                  setIsRuDslDropdownOpen(false);
                                }}
                                className="px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between w-full transition-colors"
                              >
                                <span className="font-mono text-purple-800 font-bold">{'{ENDIF}'}</span>
                                <span className="text-[10px] text-slate-400 font-sans">Конец условия</span>
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="space-x-1">
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); document.execCommand('undo'); }}
                            className="px-2 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded"
                            title="Отмена"
                          >
                            ↶
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); document.execCommand('redo'); }}
                            className="px-2 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded"
                            title="Повтор"
                          >
                            ↷
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Double Layer: Live Preview behind + Transparent Textarea in front */}
                    <div className="editor-wrapper">
                      <div
                        ref={previewRuRef}
                        className={`live-preview ${
                          form.hideNumber ||
                          form.noAutoSubnumbers ||
                          form.isMultiColumn ||
                          (form.columnsCount && form.columnsCount >= 2) ||
                          form.contentRu?.includes('===') ||
                          form.contentRu?.includes('|||')
                            ? 'no-numbering'
                            : ''
                        }`}
                      >
                        {renderLivePreview(form.contentRu || '')}
                      </div>

                      <textarea
                        ref={contentRuRef}
                        required
                        value={form.contentRu || ''}
                        onFocus={() => setActiveEditor('contentRu')}
                        onBlur={() => {
                          // Slight delay to allow clicking formatting buttons
                          setTimeout(() => {
                            setActiveEditor(prev => prev === 'contentRu' ? null : prev);
                          }, 150);
                        }}
                        onScroll={() => handleScroll(contentRuRef, previewRuRef)}
                        onKeyDown={(e) => handleKeyDown(e, 'contentRu')}
                        onChange={(e) => {
                          setForm(prev => ({ ...prev, contentRu: e.target.value }));
                          adjustTextareaHeight(e.target);
                        }}
                        className={`textarea-body ${
                          form.hideNumber ||
                          form.noAutoSubnumbers ||
                          form.isMultiColumn ||
                          (form.columnsCount && form.columnsCount >= 2) ||
                          form.contentRu?.includes('===') ||
                          form.contentRu?.includes('|||')
                            ? 'no-numbering'
                            : ''
                        }`}
                        placeholder="Укажите текст условия клаузы..."
                      />
                    </div>
                  </div>
                </div>

                {/* EN Body Editor */}
                {showEnglishBody && (
                  <div className="flex items-start space-x-2 pt-2 border-t border-slate-100">
                    <div className="flex flex-col items-center space-y-1 pt-1">
                      <span className="bg-[#dce8f5] text-[#555] text-[11px] font-bold px-2 py-0.5 rounded min-w-[30px] text-center">
                        ENG
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEnglishBody(false);
                          setForm(prev => ({ ...prev, contentEn: '' }));
                        }}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                        title="Удалить английскую версию"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 relative">
                      {/* Floating Formatting Toolbar for EN field */}
                      {activeEditor === 'contentEn' && (
                        <div className="absolute -top-11 left-0 right-0 z-30 bg-[#e2e8f0] border border-[#cbd5e1] rounded-md p-1 shadow-md flex items-center space-x-1 text-xs">
                          <div className="border-r border-[#cbd5e1] pr-1.5 space-x-1 flex items-center">
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); toggleNumbering(); }}
                              className={`px-2 py-0.5 rounded font-bold flex items-center space-x-1 cursor-pointer transition-colors ${
                                !form.hideNumber && !form.noAutoSubnumbers
                                  ? 'bg-[#2a6db5] text-white shadow-xs'
                                  : 'text-slate-700 hover:bg-[#cbd5e1]'
                              }`}
                              title={!form.hideNumber && !form.noAutoSubnumbers ? 'Numbering ON (click to disable)' : 'Enable numbering (Word-like)'}
                            >
                              <ListOrdered className="w-3.5 h-3.5" />
                              <span>1.</span>
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); toggleLinePrefix('• '); }}
                              className="px-1.5 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded font-bold flex items-center cursor-pointer"
                              title="Bulleted list (•)"
                            >
                              <List className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); toggleLinePrefix('- '); }}
                              className="px-2 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded font-bold cursor-pointer"
                              title="Dash list (-)"
                            >
                              -
                            </button>
                            <div className="h-4 w-px bg-slate-300 mx-1" />
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); changeLineIndent('decrease'); }}
                              className="px-1.5 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded font-bold flex items-center cursor-pointer"
                              title="Decrease level / Outdent (Shift+Tab)"
                            >
                              <Outdent className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); changeLineIndent('increase'); }}
                              className="px-1.5 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded font-bold flex items-center cursor-pointer"
                              title="Increase level / Indent (Tab)"
                            >
                              <Indent className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="border-r border-[#cbd5e1] pr-1.5 space-x-1">
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); formatText('<b>', '</b>'); }}
                              className="px-2 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded font-bold"
                            >
                              <b>B</b>
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); formatText('<i>', '</i>'); }}
                              className="px-2 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded italic font-semibold"
                            >
                              <i>I</i>
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); formatText('<u>', '</u>'); }}
                              className="px-2 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded underline"
                            >
                              <u>U</u>
                            </button>
                          </div>
                          <div ref={enRefDropdownRef} className="border-r border-[#cbd5e1] pr-1.5 space-x-1 flex items-center relative">
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); formatText('[', ']'); }}
                              className="px-2 py-0.5 text-blue-700 hover:bg-[#cbd5e1] rounded font-mono font-bold bg-white/70"
                            >
                              [ _ ]
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                if (documentClauses && documentClauses.length > 0) {
                                  setIsEnRefDropdownOpen(!isEnRefDropdownOpen);
                                } else {
                                  formatText('[ref:', ']');
                                }
                              }}
                              className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-bold flex items-center gap-0.5 border cursor-pointer transition-colors ${
                                isEnRefDropdownOpen
                                  ? 'bg-blue-600 text-white border-blue-700'
                                  : 'text-blue-800 bg-blue-50/80 hover:bg-blue-100 border-blue-200'
                              }`}
                              title="Insert cross-clause reference [ref:...]"
                            >
                              <Link2 className="w-3 h-3" />
                              <span>ref</span>
                              <ChevronDown className="w-2.5 h-2.5 ml-0.5" />
                            </button>

                            {isEnRefDropdownOpen && (
                              <div className="absolute left-0 top-full mt-1 z-50 min-w-[300px] max-h-72 overflow-y-auto bg-white border border-slate-200/80 rounded-md shadow-xl py-1 flex flex-col text-left font-sans text-slate-800">
                                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                                  <span>Select section or sub-clause:</span>
                                </div>
                                {documentClauses.filter(c => c.id !== form.id).map((cl, idx) => {
                                  const fullIndex = documentClauses.findIndex(c => c.id === cl.id);
                                  const num = fullIndex !== -1 ? getHierarchicalNumber(documentClauses, fullIndex) : '';
                                  const label = (num ? `Sec. ${num} ` : '') + (cl.titleEn || cl.titleRu || cl.name);
                                  const isTitleVis = isClauseTitleVisible(cl, true);
                                  const subItems = extractClauseSubItems(cl, num, isTitleVis);
                                  return (
                                    <div key={cl.id || idx} className="border-b border-slate-50 last:border-0">
                                      <button
                                        key={cl.id || idx}
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          formatText(`[ref:${cl.id}]`, '');
                                          setIsEnRefDropdownOpen(false);
                                        }}
                                        className="px-3 py-1.5 text-left text-xs font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-900 flex items-center justify-between w-full transition-colors group"
                                      >
                                        <span className="truncate max-w-[180px]" title={label}>{label}</span>
                                        <span className="text-[10px] text-blue-600 font-mono ml-2 shrink-0 bg-blue-50/80 group-hover:bg-blue-100 px-1 rounded">
                                          [ref:{cl.id}]
                                        </span>
                                      </button>
                                      {subItems.length > 0 && (
                                        <div className="pl-3 pr-2 pb-1 space-y-0.5 bg-slate-50/60">
                                          {subItems.map((sub, sIdx) => (
                                            <button
                                              key={sIdx}
                                              type="button"
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                formatText(`[ref:${sub.id}]`, '');
                                                setIsEnRefDropdownOpen(false);
                                              }}
                                              className="px-2 py-1 text-left text-[11px] text-slate-600 hover:bg-blue-100/70 hover:text-blue-900 flex items-center justify-between w-full rounded transition-colors group/sub"
                                            >
                                              <span className="truncate max-w-[175px]" title={sub.previewText}>
                                                ↳ <strong className="font-medium text-slate-700">Sec. {sub.number}</strong> <span className="text-slate-500">{sub.previewText}</span>
                                              </span>
                                              <span className="text-[9px] text-blue-500 font-mono ml-1 shrink-0 group-hover/sub:text-blue-700">
                                                #{sub.anchor}
                                              </span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                <div className="h-px bg-slate-100 my-1" />
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    formatText('[ref:', ']');
                                    setIsEnRefDropdownOpen(false);
                                  }}
                                  className="px-3 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-50 flex items-center justify-between w-full transition-colors italic"
                                >
                                  <span>Type manually [ref:ID#number]</span>
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="border-r border-[#cbd5e1] pr-1.5 space-x-1 flex items-center">
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); insertColumnSeparator(); }}
                              className="px-1.5 py-0.5 text-indigo-700 hover:bg-[#cbd5e1] rounded font-mono text-[11px] font-bold flex items-center gap-0.5"
                              title="Insert column separator (===)"
                            >
                              <Split className="w-3 h-3" />
                              <span>===</span>
                            </button>
                          </div>
                          <div ref={enDslDropdownRef} className="border-r border-[#cbd5e1] pr-1.5 flex items-center relative">
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setIsEnDslDropdownOpen(!isEnDslDropdownOpen);
                              }}
                              className={`px-1.5 py-0.5 rounded font-bold text-[11px] flex items-center space-x-1 border shadow-2xs transition-all cursor-pointer ${
                                isEnDslDropdownOpen
                                  ? 'bg-purple-700 text-white border-purple-800 shadow-inner'
                                  : 'text-purple-900 bg-purple-100 hover:bg-purple-200 border-purple-300'
                              }`}
                              title="Conditions and DSL branching"
                            >
                              <GitBranch className={`w-3.5 h-3.5 ${isEnDslDropdownOpen ? 'text-white' : 'text-purple-700'}`} />
                              <span>Conditions</span>
                              <ChevronDown className={`w-3 h-3 ml-0.5 ${isEnDslDropdownOpen ? 'text-white' : 'text-purple-700'}`} />
                            </button>

                            {isEnDslDropdownOpen && (
                              <div className="absolute left-0 top-full mt-1 z-50 min-w-[210px] bg-white border border-slate-200/80 rounded-md shadow-xl py-1 flex flex-col text-left font-sans text-slate-800">
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setIsDslBuilderOpen(true);
                                    setIsEnDslDropdownOpen(false);
                                  }}
                                  className="px-3 py-1.5 text-left text-xs text-purple-900 hover:bg-purple-50 flex items-center space-x-2 w-full transition-colors font-semibold"
                                >
                                  <GitBranch className="w-3.5 h-3.5 text-purple-700" />
                                  <span>DSL Condition Builder</span>
                                </button>
                                <div className="h-px bg-slate-100 my-1" />
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    formatText('{IF}', '');
                                    setIsEnDslDropdownOpen(false);
                                  }}
                                  className="px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between w-full transition-colors"
                                >
                                  <span className="font-mono text-purple-800 font-bold">{'{IF}'}</span>
                                  <span className="text-[10px] text-slate-400 font-sans">Simple condition</span>
                                </button>
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    formatText('{IF_ELSE}', '');
                                    setIsEnDslDropdownOpen(false);
                                  }}
                                  className="px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between w-full transition-colors"
                                >
                                  <span className="font-mono text-indigo-800 font-bold">{'{IF_ELSE}'}</span>
                                  <span className="text-[10px] text-slate-400 font-sans">With branch</span>
                                </button>
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    formatText('{ELSE}', '');
                                    setIsEnDslDropdownOpen(false);
                                  }}
                                  className="px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between w-full transition-colors"
                                >
                                  <span className="font-mono text-amber-800 font-bold">{'{ELSE}'}</span>
                                  <span className="text-[10px] text-slate-400 font-sans">Branch separator</span>
                                </button>
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    formatText('{ENDIF}', '');
                                    setIsEnDslDropdownOpen(false);
                                  }}
                                  className="px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between w-full transition-colors"
                                >
                                  <span className="font-mono text-purple-800 font-bold">{'{ENDIF}'}</span>
                                  <span className="text-[10px] text-slate-400 font-sans">End of condition</span>
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="space-x-1">
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); document.execCommand('undo'); }}
                              className="px-2 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded"
                            >
                              ↶
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); document.execCommand('redo'); }}
                              className="px-2 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded"
                            >
                              ↷
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="editor-wrapper">
                        <div
                          ref={previewEnRef}
                          className={`live-preview ${
                            form.hideNumber ||
                            form.noAutoSubnumbers ||
                            form.isMultiColumn ||
                            (form.columnsCount && form.columnsCount >= 2) ||
                            form.contentEn?.includes('===') ||
                            form.contentEn?.includes('|||')
                              ? 'no-numbering'
                              : ''
                          }`}
                        >
                          {renderLivePreview(form.contentEn || '')}
                        </div>

                        <textarea
                          ref={contentEnRef}
                          value={form.contentEn || ''}
                          onFocus={() => setActiveEditor('contentEn')}
                          onBlur={() => {
                            setTimeout(() => {
                              setActiveEditor(prev => prev === 'contentEn' ? null : prev);
                            }, 150);
                          }}
                          onScroll={() => handleScroll(contentEnRef, previewEnRef)}
                          onKeyDown={(e) => handleKeyDown(e, 'contentEn')}
                          onChange={(e) => {
                            setForm(prev => ({ ...prev, contentEn: e.target.value }));
                            adjustTextareaHeight(e.target);
                          }}
                          className={`textarea-body ${
                            form.hideNumber ||
                            form.noAutoSubnumbers ||
                            form.isMultiColumn ||
                            (form.columnsCount && form.columnsCount >= 2) ||
                            form.contentEn?.includes('===') ||
                            form.contentEn?.includes('|||')
                              ? 'no-numbering'
                              : ''
                          }`}
                          placeholder="Clause body text in English..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {!showEnglishBody && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowEnglishBody(true)}
                      className="bg-[#dce8f5] hover:bg-[#cbe0f5] text-[#334155] text-xs font-bold px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                    >
                      + English
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ATTRIBUTES SECTION */}
            <div className="flex bg-white">
              <div className="w-[110px] min-w-[110px] bg-[#dce8f5] p-3.5 font-bold text-[13px] text-[#333] border-b-2 border-[#f0f4f8]">
                Attributes
              </div>
              <div className="flex-1 bg-white p-3 px-4 border-b-2 border-[#f0f4f8] flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, isFavorite: !prev.isFavorite }))}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center space-x-1.5 border cursor-pointer ${
                    form.isFavorite
                      ? 'bg-[#fff3cd] border-[#f5a623] text-[#856404]'
                      : 'bg-[#fafafa] border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Star className={`w-4 h-4 ${form.isFavorite ? 'fill-[#f5a623] text-[#f5a623]' : 'text-slate-400'}`} />
                  <span>Избранное</span>
                </button>

                {form.questions && form.questions.length > 0 && (
                  <span className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full font-bold flex items-center space-x-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Привязано вопросов Q&A: {form.questions.length}</span>
                  </span>
                )}

                {targetMode === 'document' && onSaveToLibrary && (
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors ml-auto">
                    <input
                      type="checkbox"
                      checked={saveAlsoToLibrary}
                      onChange={(e) => setSaveAlsoToLibrary(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Сохранить также в общую библиотеку</span>
                  </label>
                )}
              </div>
            </div>

          </form>
        </div>

        {/* Modal for Clause Questions Q&A */}
        <ClauseQuestionsModal
          isOpen={isQuestionsModalOpen}
          onClose={() => setIsQuestionsModalOpen(false)}
          questions={form.questions || []}
          onSave={(updatedQuestions) => {
            setForm(prev => ({ ...prev, questions: updatedQuestions }));
          }}
          clauseName={form.name}
        />

        {/* Modal for Graphic DSL Condition Builder */}
        <DslConditionBuilderModal
          isOpen={isDslBuilderOpen}
          onClose={() => setIsDslBuilderOpen(false)}
          availableVariables={Array.from(new Set(((form.contentRu || '') + ' ' + (form.contentEn || '')).match(/\[([^\]]+)\]/g) || [])).map(v => v.replace(/^\[|\]$/g, ''))}
          initialSelectedText={
            activeEditor === 'contentEn'
              ? (contentEnRef.current?.value.substring(contentEnRef.current.selectionStart, contentEnRef.current.selectionEnd) || '')
              : (contentRuRef.current?.value.substring(contentRuRef.current.selectionStart, contentRuRef.current.selectionEnd) || '')
          }
          onInsert={(dslText) => {
            formatText(dslText, '');
          }}
        />

        {/* BOTTOM BUTTON BAR */}
        <div className="bg-[#dce8f5] p-3.5 px-4 flex items-center justify-between border-t border-slate-300">
          <div className="flex items-center space-x-2.5">
            <button
              type="submit"
              form="clause-form"
              className="bg-[#2a6db5] hover:bg-[#205896] text-white font-bold text-sm px-6 py-1.5 rounded transition-colors shadow-xs cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-slate-100 text-[#333] border border-[#bbb] font-medium text-sm px-6 py-1.5 rounded transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-[#cbe0f5] text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};
