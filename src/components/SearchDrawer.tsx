import React, { useState } from 'react';
import { SearchResult } from '../types/reader';
import { X, Search, Loader2 } from 'lucide-react';

interface SearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => Promise<SearchResult[]>;
  onSelectResult: (page: number) => void;
  currentPage: number;
}

export const SearchDrawer: React.FC<SearchDrawerProps> = ({
  isOpen,
  onClose,
  onSearch,
  onSelectResult,
  currentPage,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const found = await onSearch(query.trim());
      setResults(found);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Drawer */}
      <div className="relative w-full max-w-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 border-l border-stone-200 dark:border-stone-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h2 className="text-sm font-semibold tracking-wide uppercase">Search in Book</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search words or phrases…"
              autoFocus
              className="w-full pl-9 pr-8 py-2 text-sm bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/40 text-stone-900 dark:text-stone-100"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {hasSearched && !isSearching && (
            <div className="mt-2 text-xs text-stone-500 dark:text-stone-400">
              {results.length === 0
                ? 'No matches found.'
                : `${results.length} match${results.length === 1 ? '' : 'es'} found`}
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-stone-100 dark:divide-stone-800/60">
          {isSearching ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-stone-500 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
              <span>Searching across pages…</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400">
              {hasSearched ? 'Try different keywords or check spelling.' : 'Type a word or sentence to find occurrences.'}
            </div>
          ) : (
            results.map((res, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelectResult(res.pageNumber);
                  onClose();
                }}
                className={`w-full text-left py-3 px-3 rounded-lg transition-colors hover:bg-stone-100 dark:hover:bg-stone-800/60 ${
                  res.pageNumber === currentPage ? 'bg-amber-50/70 dark:bg-amber-950/30' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 font-mono">
                    Page {res.pageNumber}
                  </span>
                  {res.pageNumber === currentPage && (
                    <span className="text-[10px] uppercase tracking-wider text-stone-400">Current</span>
                  )}
                </div>
                <div className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                  <span className="text-stone-500">{res.prefix}</span>
                  <mark className="bg-amber-200 dark:bg-amber-800 dark:text-amber-100 px-0.5 rounded font-medium">
                    {res.keyword}
                  </mark>
                  <span className="text-stone-500">{res.suffix}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
