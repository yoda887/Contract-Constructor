import React, { useState, useEffect, useRef } from 'react';
import { X, HelpCircle, Star, Trash2 } from 'lucide-react';
import { Clause, FolderNode } from '../../types';
import { ClauseQuestionsModal } from './ClauseQuestionsModal';

interface ClauseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  clause: Clause | null;
  folders: FolderNode[];
  onSave: (clause: Clause) => void;
}

export const ClauseEditModal: React.FC<ClauseEditModalProps> = ({
  isOpen,
  onClose,
  clause,
  folders,
  onSave
}) => {
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
  const [activeMenuSection, setActiveMenuSection] = useState<string | null>(null);
  const [showEnglishTitle, setShowEnglishTitle] = useState(false);
  const [showEnglishBody, setShowEnglishBody] = useState(false);
  const [locationMode, setLocationMode] = useState<'path' | 'tree'>('path');
  const [isTreeDropdownOpen, setIsTreeDropdownOpen] = useState(false);

  // Focus and Active Editor state for showing toolbar ONLY on focus
  const [activeEditor, setActiveEditor] = useState<'contentRu' | 'contentEn' | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const contentRuRef = useRef<HTMLTextAreaElement>(null);
  const contentEnRef = useRef<HTMLTextAreaElement>(null);
  const previewRuRef = useRef<HTMLDivElement>(null);
  const previewEnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (clause) {
      setForm(clause);
      setShowEnglishTitle(!!clause.titleEn);
      setShowEnglishBody(!!clause.contentEn);
    } else {
      setForm({
        id: `c-${Date.now()}`,
        name: 'Неустойка за несвоевременную поставку',
        titleRu: 'Ответственность сторон',
        titleEn: '',
        contentRu: 'У випадку порушення [Постачальником] строків поставки [Продукції], [Постачальник] сплачує [Покупцю] неустойку у розмірі 0,5% від вартості [непоставленої] Продукції за кожний день прострочення поставки. Задля уникнення непорозумінь:\n\tВідповідальність настає лише у випадку прострочення понад 3 дні.\n\tСукупний розмір неустойки не може перевищувати 20%',
        contentEn: '',
        category: 'Поставка',
        folderId: '3',
        isFavorite: false,
        questions: []
      });
      setShowEnglishTitle(false);
      setShowEnglishBody(false);
    }
  }, [clause, isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuSection(null);
      }
    };
    if (activeMenuSection) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuSection]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.contentRu) return;

    const fullClause: Clause = {
      id: form.id || `c-${Date.now()}`,
      name: form.name,
      titleRu: form.titleRu || form.name,
      titleEn: form.titleEn,
      contentRu: form.contentRu,
      contentEn: form.contentEn,
      category: form.category || 'Поставка',
      folderId: form.folderId,
      isFavorite: form.isFavorite || false,
      questions: form.questions || []
    };

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

  // Tab Key & Indentation Support (\t)
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    field: 'contentRu' | 'contentEn'
  ) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;

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
    }
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
    } else {
      inserted = startTag + selectedText + endTag;
    }

    const newText = text.substring(0, start) + inserted + text.substring(end);
    setForm(prev => ({ ...prev, [activeField]: newText }));

    setTimeout(() => {
      ta.focus();
      const newCursorPos = start + (startTag === '[' && endTag === ']' && !selectedText ? inserted.length : startTag.length + selectedText.length);
      ta.selectionStart = newCursorPos;
      ta.selectionEnd = newCursorPos;
    }, 0);
  };

  // Helper to parse line text into formatted JSX elements (yellow brackets & styled HTML tags)
  const renderPreviewLineContent = (lineText: string) => {
    // Regex splits variables [...] and formatting tags <b>, <i>, <u>, etc.
    const parts = lineText.split(/(\[[^\]]+\]|<\/?b>|<\/?i>|<\/?u>)/gi);

    return parts.map((part, index) => {
      if (!part) return null;

      if (part.startsWith('[') && part.endsWith(']')) {
        return (
          <span key={index} style={{ background: '#ffff00', fontWeight: 'normal', color: '#000' }}>
            {part}
          </span>
        );
      }

      if (/^<\/?(b|i|u)>$/i.test(part)) {
        return (
          <span key={index} style={{ color: '#94a3b8' }}>
            {part}
          </span>
        );
      }

      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  // Render the entire Live Preview overlay layer with auto outline levels
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
                        <div className="border-r border-[#cbd5e1] pr-1.5 space-x-1">
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); formatText('1. ', ''); }}
                            className="px-2 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded font-bold"
                            title="Нумерованный список"
                          >
                            1.
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); formatText('• ', ''); }}
                            className="px-2 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded font-bold"
                            title="Маркированный список"
                          >
                            •
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
                        <div className="border-r border-[#cbd5e1] pr-1.5 space-x-1">
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
                            onMouseDown={(e) => { e.preventDefault(); formatText('[ref:', ']'); }}
                            className="px-2 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded font-mono text-[11px]"
                            title="Reference"
                          >
                            ref
                          </button>
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
                      <div ref={previewRuRef} className="live-preview">
                        {renderLivePreview(form.contentRu || '')}
                      </div>

                      <textarea
                        ref={contentRuRef}
                        rows={6}
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
                        onChange={(e) => setForm(prev => ({ ...prev, contentRu: e.target.value }))}
                        className="textarea-body"
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
                          <div className="border-r border-[#cbd5e1] pr-1.5 space-x-1">
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); formatText('1. ', ''); }}
                              className="px-2 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded font-bold"
                            >
                              1.
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); formatText('• ', ''); }}
                              className="px-2 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded font-bold"
                            >
                              •
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
                          <div className="border-r border-[#cbd5e1] pr-1.5 space-x-1">
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); formatText('[', ']'); }}
                              className="px-2 py-0.5 text-blue-700 hover:bg-[#cbd5e1] rounded font-mono font-bold bg-white/70"
                            >
                              [ _ ]
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); formatText('[ref:', ']'); }}
                              className="px-2 py-0.5 text-slate-700 hover:bg-[#cbd5e1] rounded font-mono text-[11px]"
                            >
                              ref
                            </button>
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
                        <div ref={previewEnRef} className="live-preview">
                          {renderLivePreview(form.contentEn || '')}
                        </div>

                        <textarea
                          ref={contentEnRef}
                          rows={4}
                          value={form.contentEn || ''}
                          onFocus={() => setActiveEditor('contentEn')}
                          onBlur={() => {
                            setTimeout(() => {
                              setActiveEditor(prev => prev === 'contentEn' ? null : prev);
                            }, 150);
                          }}
                          onScroll={() => handleScroll(contentEnRef, previewEnRef)}
                          onKeyDown={(e) => handleKeyDown(e, 'contentEn')}
                          onChange={(e) => setForm(prev => ({ ...prev, contentEn: e.target.value }))}
                          className="textarea-body"
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
