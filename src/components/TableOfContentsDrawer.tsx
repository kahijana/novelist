import React from 'react';
import { ChapterOutline } from '../types/reader';
import { X, BookOpen, Compass } from 'lucide-react';

interface TableOfContentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: ChapterOutline[];
  currentPage: number;
  onSelectChapter: (page: number) => void;
}

export const TableOfContentsDrawer: React.FC<TableOfContentsDrawerProps> = ({
  isOpen,
  onClose,
  chapters,
  currentPage,
  onSelectChapter,
}) => {
  if (!isOpen) return null;

  // Determine which chapter is active based on currentPage
  let activeChapterId: string | null = null;
  for (let i = chapters.length - 1; i >= 0; i--) {
    if (currentPage >= chapters[i].page) {
      activeChapterId = chapters[i].id;
      break;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Drawer */}
      <div className="relative w-full max-w-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200 border-r border-stone-200 dark:border-stone-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h2 className="text-sm font-semibold tracking-wide uppercase">Table of Contents</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 divide-y divide-stone-100 dark:divide-stone-800/60">
          {chapters.length === 0 ? (
            <div className="p-8 text-center text-sm text-stone-500">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No outline detected in this PDF.
            </div>
          ) : (
            chapters.map((ch) => {
              const isActive = ch.id === activeChapterId;
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    onSelectChapter(ch.page);
                    onClose();
                  }}
                  className={`w-full text-left py-2.5 px-3 rounded-lg flex items-center justify-between gap-3 transition-colors ${
                    ch.level ? 'pl-7 text-xs' : 'text-sm'
                  } ${
                    isActive
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-medium border-l-3 border-amber-600'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800/60 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <span className="line-clamp-2">{ch.title}</span>
                  <span className="text-xs font-mono text-stone-400 shrink-0 tabular-nums">
                    p. {ch.page}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
