import React, { useState } from 'react';
import { Book } from '../types/reader';
import { X, BookOpen, Save } from 'lucide-react';

interface EditBookModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: { title: string; author: string }) => Promise<void>;
}

export const EditBookModal: React.FC<EditBookModalProps> = ({ book, isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      await onSave(book.id, {
        title: title.trim(),
        author: author.trim() || 'Unknown Author',
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-md bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Edit Novel Information"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h2 className="text-base font-semibold">Edit Novel Info</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex gap-4 items-center p-3 rounded-lg bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800">
            {book.cover ? (
              <img
                src={book.cover}
                alt={book.title}
                referrerPolicy="no-referrer"
                className="w-14 h-19 object-cover rounded shadow-xs shrink-0"
              />
            ) : (
              <div className="w-14 h-19 bg-stone-200 dark:bg-stone-700 rounded flex items-center justify-center text-xs text-stone-500 shrink-0">
                PDF
              </div>
            )}
            <div className="text-xs text-stone-500 dark:text-stone-400 space-y-1">
              <div>Total Pages: <span className="font-medium text-stone-800 dark:text-stone-200 font-mono">{book.totalPages}</span></div>
              <div>File Size: <span className="font-medium text-stone-800 dark:text-stone-200 font-mono">{(book.fileSize / 1024 / 1024).toFixed(2)} MB</span></div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
              Novel Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/40 dark:focus:ring-amber-400/40 text-stone-900 dark:text-stone-100"
              placeholder="e.g. Crime and Punishment"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
              Author
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/40 dark:focus:ring-amber-400/40 text-stone-900 dark:text-stone-100"
              placeholder="e.g. Fyodor Dostoevsky"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-amber-800 hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving…' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
