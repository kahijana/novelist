import React from 'react';
import { BookOpen, Plus, Keyboard } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  filter: 'all' | 'recent' | 'completed';
  onFilterChange: (filter: 'all' | 'recent' | 'completed') => void;
  onOpenShortcuts: () => void;
  onImportClick: () => void;
  totalBooksCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  filter,
  onFilterChange,
  onOpenShortcuts,
  onImportClick,
  totalBooksCount,
}) => {
  return (
    <header className="h-16 px-6 lg:px-10 border-b border-stone-200 dark:border-stone-800 bg-[#F8F7F3] dark:bg-stone-900 flex items-center justify-between transition-colors sticky top-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-900 dark:bg-amber-600 text-white flex items-center justify-center shadow-xs">
          <BookOpen className="w-4 h-4" />
        </div>
        <span className="text-lg font-serif font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Novel Reader
        </span>
      </div>

      {/* Zone 2: Navigation links / filter controls */}
      <nav className="flex items-center gap-1 p-1 bg-stone-200/60 dark:bg-stone-800/80 rounded-lg">
        <button
          onClick={() => onFilterChange('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            filter === 'all'
              ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          All Library ({totalBooksCount})
        </button>
        <button
          onClick={() => onFilterChange('recent')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            filter === 'recent'
              ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          Recent
        </button>
        <button
          onClick={() => onFilterChange('completed')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            filter === 'completed'
              ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          Finished
        </button>
      </nav>

      {/* Zone 3: Primary actions */}
      <div className="flex items-center gap-3">
        <PWAInstallButton />

        <button
          onClick={onOpenShortcuts}
          className="p-2 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        <button
          onClick={onImportClick}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-amber-900 hover:bg-amber-950 dark:bg-amber-700 dark:hover:bg-amber-600 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer active:scale-98"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Novel</span>
        </button>
      </div>
    </header>
  );
};

