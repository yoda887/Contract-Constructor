import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Folder, FolderOpen, ChevronRight, ChevronDown, Plus, BookOpen, Star, ChevronDownCircle 
} from 'lucide-react';
import { Clause, FolderNode } from '../../types';
import { ClauseCard } from './ClauseCard';

interface ClauseLibraryProps {
  clauses: Clause[];
  folders: FolderNode[];
  documentClauseIds: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  expandedFolderIds: string[];
  onToggleExpandFolder: (folderId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onlyFavorites: boolean;
  onToggleOnlyFavorites: () => void;
  onToggleAddClause: (clause: Clause) => void;
  onEditClause: (clause: Clause) => void;
  onDeleteClause: (clauseId: string) => void;
  onOpenNewClauseModal: () => void;
}

export const ClauseLibrary: React.FC<ClauseLibraryProps> = ({
  clauses,
  folders,
  documentClauseIds,
  selectedCategory,
  onSelectCategory,
  selectedFolderId,
  onSelectFolder,
  expandedFolderIds,
  onToggleExpandFolder,
  searchQuery,
  onSearchChange,
  onlyFavorites,
  onToggleOnlyFavorites,
  onToggleAddClause,
  onEditClause,
  onDeleteClause,
  onOpenNewClauseModal
}) => {

  // Batch size for progressive rendering when library contains many clauses
  const INITIAL_BATCH_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BATCH_SIZE);

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH_SIZE);
  }, [searchQuery, selectedCategory, selectedFolderId, onlyFavorites]);

  // Categories list
  const categories = ['all', 'Поставка', 'Ответственность', 'Приемка', 'Подряд', 'Общие условия', 'ЭДО', 'Застережения', 'Форс-мажор', 'ВЭД', 'Аренда'];

  // Filter clauses efficiently with useMemo
  const filteredClauses = useMemo(() => {
    return clauses.filter(c => {
      if (onlyFavorites && !c.isFavorite) return false;
      if (selectedCategory !== 'all' && c.category !== selectedCategory) return false;
      if (selectedFolderId && c.folderId !== selectedFolderId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchTitle = (c.titleRu || '').toLowerCase().includes(q);
        const matchContent = (c.contentRu || '').toLowerCase().includes(q);
        const matchTags = c.tags?.some(t => t.toLowerCase().includes(q));
        return matchName || matchTitle || matchContent || matchTags;
      }
      return true;
    });
  }, [clauses, onlyFavorites, selectedCategory, selectedFolderId, searchQuery]);

  const displayedClauses = useMemo(() => {
    return filteredClauses.slice(0, visibleCount);
  }, [filteredClauses, visibleCount]);

  // Render recursive folder node
  const renderFolderNode = (node: FolderNode) => {
    const isExpanded = expandedFolderIds.includes(node.id);
    const isSelected = selectedFolderId === node.id;
    const children = folders.filter(f => f.parentId === node.id);
    const hasChildren = children.length > 0;

    return (
      <div key={node.id} className="text-xs">
        <div 
          className={`flex items-center space-x-1 py-1 px-1.5 rounded-lg cursor-pointer transition-colors ${
            isSelected ? 'bg-blue-100/80 text-blue-900 font-bold' : 'hover:bg-slate-100 text-slate-700'
          }`}
          onClick={() => onSelectFolder(node.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpandFolder(node.id);
              }}
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {isExpanded ? (
            <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          )}

          <span className="truncate">{node.name}</span>
        </div>

        {hasChildren && isExpanded && (
          <div className="pl-3 border-l border-slate-200 ml-2 space-y-0.5 mt-0.5">
            {children.map(child => renderFolderNode(child))}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = folders.filter(f => f.parentId === null);

  return (
    <div className="space-y-3.5">
      
      {/* Top Search & Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по названию, тексту или тегам..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <button
          onClick={onToggleOnlyFavorites}
          className={`p-1.5 rounded-lg border text-xs font-bold transition-colors flex items-center space-x-1 ${
            onlyFavorites
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
          title="Фильтр избранных клауз"
        >
          <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-400 text-amber-500' : ''}`} />
        </button>

        <button
          onClick={onOpenNewClauseModal}
          className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          title="Добавить новый пункт в библиотеку"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-xs scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat === 'all' ? 'Все категории' : cat}
          </button>
        ))}
      </div>

      {/* Folder Tree Filter (Collapsible Header) */}
      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 space-y-1">
        <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500 uppercase tracking-wider px-1">
          <span className="flex items-center space-x-1">
            <BookOpen className="w-3 h-3 text-slate-400" />
            <span>Папки рубрикатора</span>
          </span>
          {selectedFolderId && (
            <button
              onClick={() => onSelectFolder(null)}
              className="text-blue-600 hover:underline capitalize"
            >
              Сбросить папку
            </button>
          )}
        </div>
        <div className="max-h-36 overflow-y-auto space-y-0.5 pr-1">
          {rootFolders.map(rf => renderFolderNode(rf))}
        </div>
      </div>

      {/* Clause Cards List */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
          <span>Найдено клауз: {filteredClauses.length}</span>
          {filteredClauses.length > INITIAL_BATCH_SIZE && (
            <span className="text-[11px] text-slate-400 font-normal">
              Показано {displayedClauses.length} из {filteredClauses.length}
            </span>
          )}
        </div>

        {filteredClauses.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
            Пункт не найден. Измените параметры поиска или добавьте новый пункт.
          </div>
        ) : (
          <>
            {displayedClauses.map(clause => (
              <ClauseCard
                key={clause.id}
                clause={clause}
                inDocument={documentClauseIds.includes(clause.id)}
                onToggleAdd={onToggleAddClause}
                onEdit={onEditClause}
                onDelete={onDeleteClause}
              />
            ))}

            {visibleCount < filteredClauses.length && (
              <button
                onClick={() => setVisibleCount(prev => prev + 20)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1.5 border border-slate-200/80"
              >
                <ChevronDownCircle className="w-4 h-4 text-slate-500" />
                <span>Показать еще ({filteredClauses.length - visibleCount} пунктов)</span>
              </button>
            )}
          </>
        )}
      </div>

    </div>
  );
};
