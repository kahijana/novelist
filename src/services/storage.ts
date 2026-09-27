import { Book, Bookmark, Highlight, ReaderSettings, ReadingProgress } from '../types/reader';

const DB_NAME = 'novel_reader_db';
const DB_VERSION = 1;

export const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'light',
  fontFamily: 'serif',
  fontSize: 19,
  lineHeight: 1.8,
  contentWidth: 720,
  margin: 'comfortable',
  textAlign: 'left',
  mode: 'reflow',
  dropCaps: false,
  pdfInvertDark: true,
  navigation: 'continuous',
  pageSeparation: 'show',
  autoSavePosition: true,
};

export const PRESETS = {
  comfortable: {
    fontSize: 19,
    lineHeight: 1.8,
    contentWidth: 720,
    margin: 'comfortable' as const,
  },
  compact: {
    fontSize: 16,
    lineHeight: 1.6,
    contentWidth: 800,
    margin: 'compact' as const,
  },
  large: {
    fontSize: 23,
    lineHeight: 1.9,
    contentWidth: 700,
    margin: 'large' as const,
  },
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('books')) {
        db.createObjectStore('books', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('progress')) {
        db.createObjectStore('progress', { keyPath: 'bookId' });
      }
      if (!db.objectStoreNames.contains('bookmarks')) {
        const bmStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
        bmStore.createIndex('bookId', 'bookId', { unique: false });
      }
      if (!db.objectStoreNames.contains('highlights')) {
        const hlStore = db.createObjectStore('highlights', { keyPath: 'id' });
        hlStore.createIndex('bookId', 'bookId', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllBooks(): Promise<Book[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('books', 'readonly');
    const store = tx.objectStore('books');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getBook(id: string): Promise<Book | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('books', 'readonly');
    const store = tx.objectStore('books');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBook(book: Book): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('books', 'readwrite');
    const store = tx.objectStore('books');
    const request = store.put(book);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updateBook(id: string, updates: Partial<Book>): Promise<void> {
  const existing = await getBook(id);
  if (!existing) return;
  const merged = { ...existing, ...updates };
  await saveBook(merged);
}

export async function deleteBook(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['books', 'progress', 'bookmarks', 'highlights'], 'readwrite');
    tx.objectStore('books').delete(id);
    tx.objectStore('progress').delete(id);

    // Clean up bookmarks for this book
    const bmStore = tx.objectStore('bookmarks');
    const bmIndex = bmStore.index('bookId');
    const bmReq = bmIndex.getAll(id);
    bmReq.onsuccess = () => {
      for (const item of bmReq.result) {
        bmStore.delete(item.id);
      }
    };

    // Clean up highlights for this book
    const hlStore = tx.objectStore('highlights');
    const hlIndex = hlStore.index('bookId');
    const hlReq = hlIndex.getAll(id);
    hlReq.onsuccess = () => {
      for (const item of hlReq.result) {
        hlStore.delete(item.id);
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getProgress(bookId: string): Promise<ReadingProgress | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('progress', 'readonly');
    const store = tx.objectStore('progress');
    const request = store.get(bookId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProgress(progress: ReadingProgress): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['progress', 'books'], 'readwrite');
    tx.objectStore('progress').put(progress);
    
    // Also update lastReadAt on book
    const bookStore = tx.objectStore('books');
    const bookReq = bookStore.get(progress.bookId);
    bookReq.onsuccess = () => {
      if (bookReq.result) {
        bookReq.result.lastReadAt = progress.updatedAt;
        bookStore.put(bookReq.result);
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getBookmarks(bookId: string): Promise<Bookmark[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('bookmarks', 'readonly');
    const store = tx.objectStore('bookmarks');
    const index = store.index('bookId');
    const request = index.getAll(bookId);
    request.onsuccess = () => {
      const items = (request.result || []) as Bookmark[];
      items.sort((a, b) => a.page - b.page);
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function addBookmark(bookmark: Bookmark): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('bookmarks', 'readwrite');
    const store = tx.objectStore('bookmarks');
    const request = store.put(bookmark);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteBookmark(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('bookmarks', 'readwrite');
    const store = tx.objectStore('bookmarks');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getHighlights(bookId: string): Promise<Highlight[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('highlights', 'readonly');
    const store = tx.objectStore('highlights');
    const index = store.index('bookId');
    const request = index.getAll(bookId);
    request.onsuccess = () => {
      const items = (request.result || []) as Highlight[];
      items.sort((a, b) => a.page - b.page);
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function addHighlight(highlight: Highlight): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('highlights', 'readwrite');
    const store = tx.objectStore('highlights');
    const request = store.put(highlight);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteHighlight(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('highlights', 'readwrite');
    const store = tx.objectStore('highlights');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSettings(): Promise<ReaderSettings> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const request = store.get('default');
    request.onsuccess = () => {
      if (request.result && request.result.settings) {
        resolve({ ...DEFAULT_SETTINGS, ...request.result.settings });
      } else {
        resolve(DEFAULT_SETTINGS);
      }
    };
    request.onerror = () => resolve(DEFAULT_SETTINGS);
  });
}

export async function saveSettings(settings: ReaderSettings): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const request = store.put({ key: 'default', settings });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
