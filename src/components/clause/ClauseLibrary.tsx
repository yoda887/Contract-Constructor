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
  selectedClause?: Clause | null;
  selectedClauseNumber?: number | null;
  onToggleAddClause: (clause: Clause, position?: 'above' | 'below' | 'start' | 'end', relativeToClauseId?: string) => void;
  onEditClause: (clause: Clause) => void;
  onDeleteClause: (clauseId: string) => void;
  onOpenNewClauseModal?: () => void;
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
  selectedClause,
  selectedClauseNumber,
  onToggleAddClause,
  onEditClause,
  onDeleteClause,
  onOpenNewClauseModal
}) => {

  // Batch size for progressive rendering when library contains many clauses
  const INITIAL_BATCH_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BATCH_SIZE);
  const [isFolderSectionOpen, setIsFolderSectionOpen] = useState<boolean>(true);

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH_SIZE);
  }, [searchQuery, selectedCategory, selectedFolderId, onlyFavorites]);

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
    <div className="h-full flex flex-col min-h-0 space-y-3 font-ui-sans">
      
      {/* Fixed Top Controls */}
      <div className="shrink-0 space-y-2.5">
        {/* Top Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по названию, тексту или тегам..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <button
            onClick={onToggleOnlyFavorites}
            className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
              onlyFavorites
                ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-2xs'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Фильтр избранных клауз"
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-400 text-amber-500' : ''}`} />
          </button>

          {onOpenNewClauseModal && (
            <button
              onClick={onOpenNewClauseModal}
              className="p-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg transition-all shadow-2xs hover:shadow-xs flex items-center justify-center cursor-pointer"
              title="Создать новую клаузу в библиотеке"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* Folder Tree Filter (Collapsible Header) */}
        <div className="bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500 uppercase tracking-wider px-1">
            <button
              onClick={() => setIsFolderSectionOpen(!isFolderSectionOpen)}
              className="flex items-center space-x-1.5 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
              title={isFolderSectionOpen ? "Свернуть рубрикатор" : "Развернуть рубрикатор"}
            >
              {isFolderSectionOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
              <BookOpen className="w-3 h-3 text-blue-600" />
              <span>Папки рубрикатора</span>
              {!isFolderSectionOpen && selectedFolderId && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 normal-case border border-blue-200/60">
                  {folders.find(f => f.id === selectedFolderId)?.name || 'Выбрана папка'}
                </span>
              )}
            </button>
            {selectedFolderId && (
              <button
                onClick={() => onSelectFolder(null)}
                className="text-blue-600 hover:underline capitalize text-[11px] font-semibold cursor-pointer"
              >
                Сбросить
              </button>
            )}
          </div>
          {isFolderSectionOpen && (
            <div className="max-h-28 overflow-y-auto space-y-0.5 pr-1 pt-1 scrollbar-thin">
              {rootFolders.map(rf => renderFolderNode(rf))}
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1 pt-0.5">
          <span className="flex items-center gap-1.5">
            <span>Найдено клауз:</span>
            <span className="px-1.5 py-0.2 bg-slate-200/70 text-slate-700 rounded-md text-[11px] font-mono font-bold">
              {filteredClauses.length}
            </span>
          </span>
          {filteredClauses.length > INITIAL_BATCH_SIZE && (
            <span className="text-[11px] text-slate-400 font-normal">
              Показано {displayedClauses.length} из {filteredClauses.length}
            </span>
          )}
        </div>
      </div>

      {/* Clause Cards List (Scrollable Area) */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-3.5 pl-4 pr-2 pt-3.5 pb-4">
        {filteredClauses.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 space-y-2.5">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-600 font-medium">
              По вашему запросу ничего не найдено
            </p>
            {(searchQuery || selectedFolderId || onlyFavorites) && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  onSelectFolder(null);
                  if (onlyFavorites) onToggleOnlyFavorites();
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
              >
                Сбросить фильтры поиска
              </button>
            )}
          </div>
        ) : (
          <>
            {displayedClauses.map(clause => (
              <ClauseCard
                key={clause.id}
                clause={clause}
                inDocument={false}
                selectedClause={selectedClause}
                selectedClauseNumber={selectedClauseNumber}
                hasClauses={documentClauseIds.length > 0}
                onToggleAdd={onToggleAddClause}
                onEdit={onEditClause}
                onDelete={onDeleteClause}
              />
            ))}

            {visibleCount < filteredClauses.length && (
              <button
                onClick={() => setVisibleCount(prev => prev + 20)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 border border-slate-200/80 cursor-pointer shadow-2xs"
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
