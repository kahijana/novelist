import React, { useState, useRef } from 'react';
import { Book, ReadingProgress } from '../types/reader';
import { Navbar } from './Navbar';
import { EditBookModal } from './EditBookModal';
import { ShortcutsModal } from './ShortcutsModal';
import {
  Search,
  LayoutGrid,
  List,
  MoreVertical,
  BookOpen,
  ArrowRight,
  UploadCloud,
  Loader2,
  Trash2,
  Edit3,
  Clock,
  Sparkles,
} from 'lucide-react';

interface LibraryViewProps {
  books: Book[];
  progressMap: Record<string, ReadingProgress>;
  onSelectBook: (book: Book, pageToResume?: number) => void;
  onImportPdf: (file: File) => Promise<void>;
  onDeleteBook: (id: string) => Promise<void>;
  onUpdateBook: (id: string, updates: { title: string; author: string }) => Promise<void>;
  onResetSamples: () => Promise<void>;
  isImporting: boolean;
  importProgressText?: string;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  progressMap,
  onSelectBook,
  onImportPdf,
  onDeleteBook,
  onUpdateBook,
  onResetSamples,
  isImporting,
  importProgressText,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'added' | 'title' | 'progress'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'recent' | 'completed'>('all');
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find most recently read book for "Continue Reading" banner
  const mostRecentBook = [...books]
    .filter((b) => b.lastReadAt > 0)
    .sort((a, b) => b.lastReadAt - a.lastReadAt)[0] || books[0];

  const mostRecentProgress = mostRecentBook ? progressMap[mostRecentBook.id] : undefined;

  // Filter & Sort
  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const prog = progressMap[b.id]?.percentage || 0;
    if (filter === 'recent') return b.lastReadAt > 0;
    if (filter === 'completed') return prog >= 99;
    return true;
  });

  filteredBooks.sort((a, b) => {
    if (sortBy === 'recent') return (b.lastReadAt || 0) - (a.lastReadAt || 0);
    if (sortBy === 'added') return b.createdAt - a.createdAt;
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'progress') {
      const pA = progressMap[a.id]?.percentage || 0;
      const pB = progressMap[b.id]?.percentage || 0;
      return pB - pA;
    }
    return 0;
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        await onImportPdf(file);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await onImportPdf(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen bg-[#F8F7F3] dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors relative"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf,.pdf"
        className="hidden"
      />

      {/* Drag Overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-amber-900/40 backdrop-blur-xs border-4 border-dashed border-amber-500 m-4 rounded-2xl flex flex-col items-center justify-center text-white pointer-events-none animate-in fade-in duration-150">
          <UploadCloud className="w-16 h-16 mb-4 animate-bounce" />
          <h2 className="text-2xl font-serif font-bold">Drop PDF Novel Here</h2>
          <p className="text-sm opacity-80 mt-1">We will extract the text, chapters, and prepare your reading mode.</p>
        </div>
      )}

      {/* Importing Loader Modal */}
      {isImporting && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-8 max-w-sm w-full text-center shadow-2xl">
            <Loader2 className="w-10 h-10 animate-spin text-amber-700 dark:text-amber-500 mx-auto mb-4" />
            <h3 className="text-base font-semibold">Processing Novel…</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
              {importProgressText || 'Extracting chapters, generating cover, and organizing reading flow…'}
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <Navbar
        filter={filter}
        onFilterChange={setFilter}
        onOpenShortcuts={() => setShowShortcuts(true)}
        onImportClick={() => fileInputRef.current?.click()}
        totalBooksCount={books.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-10 py-8 space-y-10">
        {/* Continue Reading Featured Hero */}
        {mostRecentBook && filter === 'all' && !searchQuery && (
          <section className="bg-white dark:bg-stone-900 rounded-2xl p-6 lg:p-8 border border-stone-200/80 dark:border-stone-800 shadow-sm flex flex-col md:flex-row gap-6 md:gap-8 items-center justify-between">
            <div className="flex gap-6 items-center w-full md:w-auto">
              <div
                onClick={() => onSelectBook(mostRecentBook, mostRecentProgress?.page || 1)}
                className="relative group cursor-pointer shrink-0"
              >
                <div className="w-24 sm:w-28 aspect-3/4 rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-all border border-stone-200/60 dark:border-stone-800 bg-stone-100 dark:bg-stone-800">
                  {mostRecentBook.cover ? (
                    <img
                      src={mostRecentBook.cover}
                      alt={mostRecentBook.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-mono text-stone-400">
                      PDF
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Continue Reading</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 line-clamp-1">
                  {mostRecentBook.title}
                </h2>
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  by {mostRecentBook.author}
                </p>

                {/* Progress bar */}
                <div className="pt-2 max-w-md">
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1.5 font-mono tabular-nums">
                    <span>
                      Page {mostRecentProgress?.page || 1} of {mostRecentBook.totalPages}
                    </span>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      {mostRecentProgress?.percentage || 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-700 dark:bg-amber-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(mostRecentProgress?.percentage || 0, 2)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 shrink-0">
              <button
                onClick={() => onSelectBook(mostRecentBook, mostRecentProgress?.page || 1)}
                className="w-full md:w-auto px-6 py-3 bg-amber-900 hover:bg-amber-950 dark:bg-amber-700 dark:hover:bg-amber-600 text-white font-medium text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
              >
                <span>Resume Reading</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* Library Shelf Controls */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-serif font-bold tracking-tight text-stone-900 dark:text-stone-100">
                My Novel Shelf
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {filteredBooks.length} {filteredBooks.length === 1 ? 'novel' : 'novels'} available in your local offline library
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title or author…"
                  className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/40 text-stone-900 dark:text-stone-100"
                />
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/40 text-stone-700 dark:text-stone-300"
              >
                <option value="recent">Recently Read</option>
                <option value="added">Recently Added</option>
                <option value="title">Title (A-Z)</option>
                <option value="progress">Reading Progress</option>
              </select>

              {/* View Toggle */}
              <div className="flex items-center p-0.5 bg-stone-200/60 dark:bg-stone-800 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'grid' ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs' : 'text-stone-500'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'list' ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs' : 'text-stone-500'
                  }`}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Book Collection */}
          {filteredBooks.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 p-12 text-center space-y-4">
              <BookOpen className="w-12 h-12 mx-auto text-stone-300 dark:text-stone-700" />
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200">
                  {searchQuery ? 'No novels match your search' : 'Your library is empty'}
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Drag and drop a PDF novel anywhere on this screen, or click the import button to load your ebook.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-amber-900 hover:bg-amber-950 text-white text-xs font-medium rounded-lg shadow-xs"
                >
                  Choose PDF File
                </button>
                <button
                  onClick={onResetSamples}
                  className="px-4 py-2 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-medium rounded-lg"
                >
                  Load Sample Classic Novels
                </button>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {filteredBooks.map((book) => {
                const prog = progressMap[book.id];
                const percentage = prog?.percentage || 0;
                const isMenuOpen = activeMenuId === book.id;

                return (
                  <div
                    key={book.id}
                    className="group relative flex flex-col bg-white dark:bg-stone-900 rounded-xl p-3 border border-stone-200/80 dark:border-stone-800/80 hover:border-amber-400 dark:hover:border-amber-700 hover:shadow-lg transition-all duration-200"
                  >
                    {/* Cover Frame */}
                    <div
                      onClick={() => onSelectBook(book, prog?.page || 1)}
                      className="relative aspect-3/4 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 shadow-xs cursor-pointer mb-3"
                    >
                      {book.cover ? (
                        <img
                          src={book.cover}
                          alt={book.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-stone-200 dark:bg-stone-800">
                          <BookOpen className="w-8 h-8 text-stone-400 mb-2" />
                          <span className="text-[11px] font-medium text-stone-600 dark:text-stone-300 line-clamp-3">
                            {book.title}
                          </span>
                        </div>
                      )}

                      {/* Hover Quick Read Button Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-3 py-1.5 bg-white text-stone-900 font-semibold text-xs rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                          Read Now
                        </span>
                      </div>

                      {/* Percentage Badge */}
                      {percentage > 0 && (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono font-medium">
                          {percentage}%
                        </div>
                      )}
                    </div>

                    {/* Book Metadata */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3
                          onClick={() => onSelectBook(book, prog?.page || 1)}
                          className="text-sm font-serif font-semibold text-stone-900 dark:text-stone-100 line-clamp-1 cursor-pointer hover:text-amber-800 dark:hover:text-amber-400"
                          title={book.title}
                        >
                          {book.title}
                        </h3>
                        <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                          {book.author}
                        </p>
                      </div>

                      {/* Reading Progress Line */}
                      <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800/80">
                        <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono mb-1">
                          <span>{book.totalPages} pp.</span>
                          <span>{percentage > 0 ? `p. ${prog?.page || 1}` : 'Unread'}</span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-700 dark:bg-amber-500 rounded-full"
                            style={{ width: `${Math.max(percentage, percentage > 0 ? 3 : 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Menu Button */}
                    <div className="absolute top-4 right-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : book.id);
                        }}
                        className="p-1 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors"
                        title="Book Options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                            }}
                          />
                          <div className="absolute right-0 top-8 z-40 w-44 bg-white dark:bg-stone-800 rounded-lg shadow-xl border border-stone-200 dark:border-stone-700 p-1 text-xs space-y-0.5 animate-in fade-in duration-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                setEditingBook(book);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-left"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-stone-400" />
                              <span>Edit Info</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                setBookToDelete(book);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-left"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>Remove from Library</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden shadow-xs">
              {filteredBooks.map((book) => {
                const prog = progressMap[book.id];
                const percentage = prog?.percentage || 0;

                return (
                  <div
                    key={book.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
                  >
                    <div
                      onClick={() => onSelectBook(book, prog?.page || 1)}
                      className="flex items-center gap-4 cursor-pointer flex-1"
                    >
                      <div className="w-12 aspect-3/4 rounded bg-stone-100 dark:bg-stone-800 overflow-hidden shrink-0 shadow-2xs border border-stone-200/50">
                        {book.cover ? (
                          <img
                            src={book.cover}
                            alt={book.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400">
                            PDF
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h3 className="text-sm font-semibold font-serif text-stone-900 dark:text-stone-100 hover:text-amber-800">
                          {book.title}
                        </h3>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          {book.author} · {book.totalPages} pages
                        </p>
                      </div>
                    </div>

                    <div className="w-48 hidden sm:block">
                      <div className="flex justify-between text-xs text-stone-500 font-mono mb-1">
                        <span>Progress</span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-700 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectBook(book, prog?.page || 1)}
                        className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-stone-800 dark:text-stone-200 hover:text-amber-900 rounded-lg text-xs font-medium transition-colors"
                      >
                        Read
                      </button>
                      <button
                        onClick={() => setEditingBook(book)}
                        className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                        title="Edit Info"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setBookToDelete(book)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer info note */}
        <section className="pt-8 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Local-first offline storage · Your files remain completely private in your browser</span>
          </div>
          <button
            onClick={onResetSamples}
            className="hover:text-stone-600 dark:hover:text-stone-300 underline"
          >
            Reload Classic Literature Samples
          </button>
        </section>
      </main>

      {/* Edit Book Modal */}
      {editingBook && (
        <EditBookModal
          book={editingBook}
          isOpen={true}
          onClose={() => setEditingBook(null)}
          onSave={onUpdateBook}
        />
      )}

      {/* Delete Confirmation Modal */}
      {bookToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
            <h3 className="text-base font-semibold">Remove from Library?</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Are you sure you want to remove <span className="font-semibold text-stone-800 dark:text-stone-200">{bookToDelete.title}</span>? Reading progress and bookmarks will also be deleted from this browser.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBookToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDeleteBook(bookToDelete.id);
                  setBookToDelete(null);
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts Modal */}
      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
};
