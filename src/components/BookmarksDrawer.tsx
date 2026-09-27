import React, { useState } from 'react';
import { Bookmark, Highlight } from '../types/reader';
import { X, Bookmark as BookmarkIcon, Highlighter, Trash2, Plus, MessageSquare } from 'lucide-react';

interface BookmarksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: Bookmark[];
  highlights: Highlight[];
  currentPage: number;
  onSelectPage: (page: number) => void;
  onAddBookmark: () => void;
  onDeleteBookmark: (id: string) => void;
  onDeleteHighlight: (id: string) => void;
}

export const BookmarksDrawer: React.FC<BookmarksDrawerProps> = ({
  isOpen,
  onClose,
  bookmarks,
  highlights,
  currentPage,
  onSelectPage,
  onAddBookmark,
  onDeleteBookmark,
  onDeleteHighlight,
}) => {
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'highlights'>('bookmarks');

  if (!isOpen) return null;

  const isCurrentPageBookmarked = bookmarks.some((b) => b.page === currentPage);

  const colorBadgeClass = {
    yellow: 'bg-amber-300 dark:bg-amber-500',
    green: 'bg-emerald-300 dark:bg-emerald-500',
    blue: 'bg-sky-300 dark:bg-sky-500',
    pink: 'bg-pink-300 dark:bg-pink-500',
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
            <BookmarkIcon className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h2 className="text-sm font-semibold tracking-wide uppercase">Saved Reading</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="p-3 border-b border-stone-200 dark:border-stone-800">
          <div className="grid grid-cols-2 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`py-1.5 px-3 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'bookmarks'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <BookmarkIcon className="w-3.5 h-3.5" />
              <span>Bookmarks ({bookmarks.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('highlights')}
              className={`py-1.5 px-3 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'highlights'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>Highlights ({highlights.length})</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'bookmarks' ? (
            <>
              {/* Add Bookmark CTA */}
              <button
                onClick={onAddBookmark}
                disabled={isCurrentPageBookmarked}
                className={`w-full py-2 px-3 text-xs font-medium rounded-lg flex items-center justify-center gap-2 border transition-all ${
                  isCurrentPageBookmarked
                    ? 'bg-stone-100 dark:bg-stone-800/50 text-stone-400 border-stone-200 dark:border-stone-800 cursor-default'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>
                  {isCurrentPageBookmarked ? `Page ${currentPage} already bookmarked` : `Bookmark Current Page ${currentPage}`}
                </span>
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-stone-800 font-mono shadow-xs border border-stone-200 dark:border-stone-700">
                  B
                </kbd>
              </button>

              {bookmarks.length === 0 ? (
                <div className="py-12 text-center text-xs text-stone-400">
                  <BookmarkIcon className="w-8 h-8 mx-auto mb-2 opacity-25" />
                  No bookmarks yet. Press <kbd className="px-1 py-0.5 rounded bg-stone-100 dark:bg-stone-800 font-mono">B</kbd> while reading to bookmark a page.
                </div>
              ) : (
                <div className="space-y-2">
                  {bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className="group p-3 rounded-lg border border-stone-200 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700 transition-colors bg-white dark:bg-stone-800/40 flex items-start justify-between gap-3"
                    >
                      <button
                        onClick={() => {
                          onSelectPage(bm.page);
                          onClose();
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-amber-800 dark:text-amber-400 font-mono">
                            Page {bm.page}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            {new Date(bm.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-xs text-stone-700 dark:text-stone-300 line-clamp-2 italic">
                          {bm.snippet ? `“${bm.snippet}”` : bm.title}
                        </div>
                      </button>

                      <button
                        onClick={() => onDeleteBookmark(bm.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-rose-600 transition-opacity"
                        title="Delete Bookmark"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {highlights.length === 0 ? (
                <div className="py-12 text-center text-xs text-stone-400">
                  <Highlighter className="w-8 h-8 mx-auto mb-2 opacity-25" />
                  Select text while in Reflow Reading mode to create highlights and add notes.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {highlights.map((hl) => (
                    <div
                      key={hl.id}
                      className="group p-3 rounded-lg border border-stone-200 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700 transition-colors bg-white dark:bg-stone-800/40 flex items-start justify-between gap-3"
                    >
                      <button
                        onClick={() => {
                          onSelectPage(hl.page);
                          onClose();
                        }}
                        className="flex-1 text-left space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${colorBadgeClass[hl.color]}`} />
                          <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 font-mono">
                            Page {hl.page}
                          </span>
                        </div>
                        <div className="text-xs text-stone-700 dark:text-stone-300 line-clamp-3 pl-2 border-l-2 border-amber-400/60 italic">
                          “{hl.text}”
                        </div>
                        {hl.note && (
                          <div className="flex items-start gap-1.5 text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded">
                            <MessageSquare className="w-3 h-3 shrink-0 mt-0.5" />
                            <span>{hl.note}</span>
                          </div>
                        )}
                      </button>

                      <button
                        onClick={() => onDeleteHighlight(hl.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-rose-600 transition-opacity"
                        title="Delete Highlight"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
