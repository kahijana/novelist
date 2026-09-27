/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Book, Bookmark, Highlight, ReaderSettings, ReadingProgress } from './types/reader';
import {
  getAllBooks,
  getBookmarks,
  getHighlights,
  getProgress,
  getSettings,
  saveBook,
  deleteBook,
  updateBook,
  saveProgress,
  addBookmark,
  deleteBookmark,
  addHighlight,
  deleteHighlight,
  saveSettings,
  DEFAULT_SETTINGS,
} from './services/storage';
import { createSampleBookInstances } from './services/sampleBooks';
import {
  extractMetadata,
  extractOutline,
  generateCoverThumbnail,
  loadPdfDocument,
} from './services/pdfEngine';
import { LibraryView } from './components/LibraryView';
import { ReaderView } from './components/ReaderView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ReadingProgress>>({});
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [resumePage, setResumePage] = useState<number>(1);
  const [resumeScrollPos, setResumeScrollPos] = useState<number>(0);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgressText, setImportProgressText] = useState('');

  // 1. Initial Data Load
  useEffect(() => {
    async function init() {
      try {
        const storedSettings = await getSettings();
        setSettings(storedSettings);

        let storedBooks = await getAllBooks();

        // Seed with sample classic literature novels on first run
        if (storedBooks.length === 0) {
          const sampleBooks = await createSampleBookInstances();
          for (const sb of sampleBooks) {
            await saveBook(sb);
          }
          storedBooks = sampleBooks;
        }

        setBooks(storedBooks);

        // Fetch progress for all books
        const progressObj: Record<string, ReadingProgress> = {};
        for (const b of storedBooks) {
          const prog = await getProgress(b.id);
          if (prog) {
            progressObj[b.id] = prog;
          }
        }
        setProgressMap(progressObj);
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsLoadingInitial(false);
      }
    }

    init();
  }, []);

  // 2. Select Book & Open Reader
  const handleSelectBook = async (book: Book, pageToResume?: number) => {
    try {
      const bookBookmarks = await getBookmarks(book.id);
      const bookHighlights = await getHighlights(book.id);
      setBookmarks(bookBookmarks);
      setHighlights(bookHighlights);

      const targetPage = pageToResume || progressMap[book.id]?.page || 1;
      const targetScroll = progressMap[book.id]?.scrollPosition || 0;
      setResumePage(targetPage);
      setResumeScrollPos(targetScroll);
      setActiveBook(book);
    } catch (err) {
      console.error('Error selecting book:', err);
      setActiveBook(book);
    }
  };

  // 3. Close Reader & Back to Library
  const handleBackToLibrary = useCallback(async () => {
    setActiveBook(null);
    // Refresh books and progress
    const updatedBooks = await getAllBooks();
    setBooks(updatedBooks);
    const progressObj: Record<string, ReadingProgress> = {};
    for (const b of updatedBooks) {
      const prog = await getProgress(b.id);
      if (prog) {
        progressObj[b.id] = prog;
      }
    }
    setProgressMap(progressObj);
  }, []);

  // 4. Import User PDF Novel
  const handleImportPdf = async (file: File) => {
    setIsImporting(true);
    setImportProgressText('Reading novel PDF file…');

    try {
      const arrayBuffer = await file.arrayBuffer();
      setImportProgressText('Parsing PDF document structure…');
      const doc = await loadPdfDocument(arrayBuffer);

      setImportProgressText('Extracting metadata and chapter outline…');
      const metadata = await extractMetadata(doc);
      const outline = await extractOutline(doc);

      setImportProgressText('Generating cover thumbnail…');
      const cover = await generateCoverThumbnail(doc);

      const novelTitle =
        metadata.title || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const novelAuthor = metadata.author || 'Unknown Author';

      const newBook: Book = {
        id: `book-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
        title: novelTitle,
        author: novelAuthor,
        cover,
        fileBlob: file,
        fileSize: file.size,
        totalPages: metadata.totalPages || doc.numPages,
        createdAt: Date.now(),
        lastReadAt: Date.now(),
        chapters: outline,
      };

      setImportProgressText('Saving to your local library…');
      await saveBook(newBook);

      setBooks((prev) => [newBook, ...prev]);

      // Automatically open newly imported book for reading!
      await handleSelectBook(newBook, 1);
    } catch (err) {
      console.error('Failed to import novel PDF:', err);
      alert('Could not import PDF. Please verify that this is a valid PDF document.');
    } finally {
      setIsImporting(false);
      setImportProgressText('');
    }
  };

  // 5. Delete Book
  const handleDeleteBook = async (id: string) => {
    await deleteBook(id);
    setBooks((prev) => prev.filter((b) => b.id !== id));
    setProgressMap((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // 6. Update Book Info
  const handleUpdateBook = async (id: string, updates: { title: string; author: string }) => {
    await updateBook(id, updates);
    setBooks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  // 7. Reset / Reload Sample Novels
  const handleResetSamples = async () => {
    setIsImporting(true);
    setImportProgressText('Generating classic literature samples…');
    try {
      const samples = await createSampleBookInstances();
      for (const sb of samples) {
        await saveBook(sb);
      }
      const all = await getAllBooks();
      setBooks(all);
    } finally {
      setIsImporting(false);
      setImportProgressText('');
    }
  };

  // 8. Save Progress
  const handleSaveProgress = async (prog: ReadingProgress) => {
    await saveProgress(prog);
    setProgressMap((prev) => ({ ...prev, [prog.bookId]: prog }));
  };

  // 9. Bookmarks & Highlights
  const handleAddBookmark = async (page: number, snippet: string) => {
    if (!activeBook) return;
    const newBm: Bookmark = {
      id: `bm-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      bookId: activeBook.id,
      page,
      title: `Page ${page}`,
      snippet,
      createdAt: Date.now(),
    };
    await addBookmark(newBm);
    setBookmarks((prev) => [...prev, newBm]);
  };

  const handleDeleteBookmark = async (id: string) => {
    await deleteBookmark(id);
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleAddHighlight = async (hl: Highlight) => {
    await addHighlight(hl);
    setHighlights((prev) => [...prev, hl]);
  };

  const handleDeleteHighlight = async (id: string) => {
    await deleteHighlight(id);
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  };

  // 10. Update Settings
  const handleUpdateSettings = async (newSettings: ReaderSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  if (isLoadingInitial) {
    return (
      <div className="min-h-screen bg-[#F8F7F3] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-800" />
        <p className="text-xs font-serif text-stone-600 tracking-wider">
          Opening your library…
        </p>
      </div>
    );
  }

  if (activeBook) {
    return (
      <>
        <ReaderView
          book={activeBook}
          initialPage={resumePage}
          initialScrollPosition={resumeScrollPos}
          initialSettings={settings}
          bookmarks={bookmarks}
          highlights={highlights}
          onBackToLibrary={handleBackToLibrary}
          onSaveProgress={handleSaveProgress}
          onAddBookmark={handleAddBookmark}
          onDeleteBookmark={handleDeleteBookmark}
          onAddHighlight={handleAddHighlight}
          onDeleteHighlight={handleDeleteHighlight}
          onUpdateSettings={handleUpdateSettings}
        />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <>
      <LibraryView
        books={books}
        progressMap={progressMap}
        onSelectBook={handleSelectBook}
        onImportPdf={handleImportPdf}
        onDeleteBook={handleDeleteBook}
        onUpdateBook={handleUpdateBook}
        onResetSamples={handleResetSamples}
        isImporting={isImporting}
        importProgressText={importProgressText}
      />
      <OfflineIndicator />
    </>
  );
}
