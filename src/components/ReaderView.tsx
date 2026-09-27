import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Book,
  Bookmark,
  ChapterOutline,
  Highlight,
  HighlightColor,
  NormalizedBlock,
  ReaderSettings,
  ReadingProgress,
  SearchResult,
  SmartReflowPageResult,
} from '../types/reader';
import {
  extractOutline,
  extractSmartReflowPage,
  loadPdfDocument,
  renderPageCanvas,
  searchDocument,
} from '../services/pdfEngine';
import { ReadingSettingsDrawer } from './ReadingSettingsDrawer';
import { TableOfContentsDrawer } from './TableOfContentsDrawer';
import { SearchDrawer } from './SearchDrawer';
import { BookmarksDrawer } from './BookmarksDrawer';
import { HighlightPopover } from './HighlightPopover';
import { ShortcutsModal } from './ShortcutsModal';
import { ReflowQualityModal } from './ReflowQualityModal';
import { OriginalPagePeekModal } from './OriginalPagePeekModal';
import {
  ArrowLeft,
  BookText,
  FileText,
  Sliders,
  Compass,
  Search,
  Bookmark as BookmarkIcon,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  Sparkles,
  ScrollText,
  BookOpen,
  Eye,
} from 'lucide-react';

interface ReaderViewProps {
  book: Book;
  initialPage: number;
  initialScrollPosition?: number;
  initialSettings: ReaderSettings;
  bookmarks: Bookmark[];
  highlights: Highlight[];
  onBackToLibrary: () => void;
  onSaveProgress: (progress: ReadingProgress) => Promise<void>;
  onAddBookmark: (page: number, snippet: string) => Promise<void>;
  onDeleteBookmark: (id: string) => Promise<void>;
  onAddHighlight: (highlight: Highlight) => Promise<void>;
  onDeleteHighlight: (id: string) => Promise<void>;
  onUpdateSettings: (settings: ReaderSettings) => Promise<void>;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  book,
  initialPage,
  initialScrollPosition = 0,
  initialSettings,
  bookmarks,
  highlights,
  onBackToLibrary,
  onSaveProgress,
  onAddBookmark,
  onDeleteBookmark,
  onAddHighlight,
  onDeleteHighlight,
  onUpdateSettings,
}) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(book.totalPages || 1);
  const [settings, setSettings] = useState<ReaderSettings>(initialSettings);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [chapters, setChapters] = useState<ChapterOutline[]>(book.chapters || []);
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);

  // Paginated Reflow state
  const [smartReflowData, setSmartReflowData] = useState<SmartReflowPageResult | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);

  // Continuous Reflow state
  const [continuousPages, setContinuousPages] = useState<SmartReflowPageResult[]>([]);
  const [isLoadingMorePages, setIsLoadingMorePages] = useState(false);
  const hasRestoredScrollRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref to track current page in continuous mode without triggering re-render cascades
  const activePageRef = useRef<number>(initialPage);

  // Original PDF Reference / Quick Peek Modal
  const [isPeekModalOpen, setIsPeekModalOpen] = useState(false);

  // PDF Mode State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfZoom, setPdfZoom] = useState(1.2);
  const [isRenderingCanvas, setIsRenderingCanvas] = useState(false);

  // Zen Auto-Hide UI State
  const [isUiVisible, setIsUiVisible] = useState(true);
  const hideUiTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Drawers
  const [activeDrawer, setActiveDrawer] = useState<
    'settings' | 'toc' | 'search' | 'bookmarks' | 'shortcuts' | null
  >(null);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Text Selection / Highlighting in Reflow Mode
  const [selectionPopover, setSelectionPopover] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  // Reflow scroll container ref
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Scrub bar hover tooltip
  const [scrubPreviewPage, setScrubPreviewPage] = useState<number | null>(null);

  // 1. Load PDF Document
  useEffect(() => {
    let isCancelled = false;

    async function load() {
      setIsLoadingPdf(true);
      try {
        if (!book.fileBlob) {
          throw new Error('No PDF file attached to book');
        }
        const doc = await loadPdfDocument(book.fileBlob);
        if (isCancelled) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);

        if (!book.chapters || book.chapters.length === 0) {
          const extracted = await extractOutline(doc);
          if (!isCancelled) {
            setChapters(extracted);
          }
        }
      } catch (err) {
        console.error('Failed to load PDF in reader:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingPdf(false);
        }
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [book]);

  // 2. Fetch Initial Content on Document Load or Navigation Mode Change
  // CRITICAL ARCHITECTURE RULE: In continuous mode, initial load only loads the document stream.
  // It NEVER re-fetches or resets scroll when `currentPage` changes due to scrolling!
  useEffect(() => {
    let isCancelled = false;

    async function initContinuous() {
      if (!pdfDoc || settings.mode !== 'reflow' || settings.navigation !== 'continuous') return;
      setIsLoadingText(true);

      try {
        // Load from page 1 up to initialPage + 3 so previous sections exist above current scroll
        const startP = 1;
        const endP = Math.min(totalPages, Math.max(initialPage + 3, 5));
        const loaded: SmartReflowPageResult[] = [];

        for (let p = startP; p <= endP; p++) {
          if (isCancelled) return;
          const res = await extractSmartReflowPage(pdfDoc, p);
          loaded.push(res);
        }

        if (!isCancelled) {
          setContinuousPages(loaded);
          const activeResult = loaded.find((item) => item.pageNumber === initialPage) || loaded[0];
          if (activeResult) {
            setSmartReflowData(activeResult);
          }

          // Exact scroll position restoration (Source of Truth)
          if (!hasRestoredScrollRef.current && settings.autoSavePosition) {
            setTimeout(() => {
              if (contentContainerRef.current) {
                if (initialScrollPosition > 0) {
                  // Direct exact scroll restore (instant, no jump)
                  contentContainerRef.current.scrollTop = initialScrollPosition;
                } else if (initialPage > 1) {
                  const targetEl = document.getElementById(`reflow-page-${initialPage}`);
                  if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'instant' as any });
                  }
                }
                hasRestoredScrollRef.current = true;
              }
            }, 60);
          }
        }
      } catch (err) {
        console.error('Failed to load initial continuous pages:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingText(false);
        }
      }
    }

    initContinuous();
    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, settings.mode, settings.navigation, totalPages, initialPage, initialScrollPosition, settings.autoSavePosition]);

  // 3. Paginated Mode Single Page Loader
  useEffect(() => {
    let isCancelled = false;

    async function loadSinglePage() {
      if (!pdfDoc || settings.mode !== 'reflow' || settings.navigation !== 'paginated') return;
      setIsLoadingText(true);
      try {
        const single = await extractSmartReflowPage(pdfDoc, currentPage);
        if (!isCancelled) {
          setSmartReflowData(single);
          if (contentContainerRef.current) {
            contentContainerRef.current.scrollTop = 0;
          }
        }
      } catch (err) {
        console.error('Failed to load paginated page:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingText(false);
        }
      }
    }

    loadSinglePage();
    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, settings.mode, settings.navigation]);

  // 4. Render PDF Canvas when in PDF Mode
  useEffect(() => {
    let isCancelled = false;

    async function renderCanvas() {
      if (!pdfDoc || !canvasRef.current || settings.mode !== 'pdf') return;
      setIsRenderingCanvas(true);
      try {
        await renderPageCanvas(pdfDoc, currentPage, canvasRef.current, pdfZoom);
      } catch (err) {
        if (!isCancelled) console.warn('Canvas render error:', err);
      } finally {
        if (!isCancelled) setIsRenderingCanvas(false);
      }
    }

    renderCanvas();
    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, settings.mode, pdfZoom]);

  // 5. Save Progress Helper
  const triggerSaveProgress = useCallback(
    (page: number, scrollPos: number) => {
      const percentage = Math.min(100, Math.round((page / totalPages) * 100));
      onSaveProgress({
        bookId: book.id,
        page,
        totalPages,
        percentage,
        scrollPosition: scrollPos,
        updatedAt: Date.now(),
      });
    },
    [book.id, totalPages, onSaveProgress]
  );

  // 6. IntersectionObserver for Seamless Zero-Jump Page Detection in Continuous Scroll
  useEffect(() => {
    if (settings.navigation !== 'continuous' || settings.mode !== 'reflow') return;

    const container = contentContainerRef.current;
    if (!container) return;

    // Use IntersectionObserver with multiple thresholds for buttery-smooth detection
    const observer = new IntersectionObserver(
      (entries) => {
        let bestEntry: IntersectionObserverEntry | null = null;
        let maxRatio = 0;

        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            bestEntry = entry;
          }
        }

        if (bestEntry) {
          const pageNum = Number(bestEntry.target.getAttribute('data-page-num'));
          if (pageNum && pageNum !== activePageRef.current) {
            activePageRef.current = pageNum;
            // UPDATE DISPLAY ONLY (Never modify scroll position!)
            setCurrentPage(pageNum);
            const found = continuousPages.find((p) => p.pageNumber === pageNum);
            if (found) setSmartReflowData(found);
          }
        }
      },
      {
        root: container,
        rootMargin: '-10% 0px -40% 0px',
        threshold: [0.1, 0.3, 0.5, 0.8],
      }
    );

    const sections = container.querySelectorAll<HTMLElement>('[data-page-num]');
    sections.forEach((sec) => observer.observe(sec));

    return () => observer.disconnect();
  }, [continuousPages, settings.navigation, settings.mode]);

  // 7. Continuous Scroll Listener (Saves exact scroll position + Infinite Append)
  const handleScroll = () => {
    const container = contentContainerRef.current;
    if (!container) return;

    // RULE: Saat membaca dan scrolling, sembunyikan header dan footer segera!
    // (While reading and scrolling, immediately hide header and footer for full immersion)
    if (isUiVisible && !activeDrawer && !selectionPopover && !showQualityModal && !isPeekModalOpen) {
      setIsUiVisible(false);
      if (hideUiTimerRef.current) {
        clearTimeout(hideUiTimerRef.current);
      }
    }

    if (settings.navigation !== 'continuous' || settings.mode !== 'reflow') {
      return;
    }

    const currentScrollY = container.scrollTop;

    // Save exact scroll position (Debounced, does NOT touch scrollY)
    if (settings.autoSavePosition) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        triggerSaveProgress(activePageRef.current, currentScrollY);
      }, 400);
    }

    // Infinite Scroll Append: Check if near bottom
    const distanceToBottom = container.scrollHeight - (currentScrollY + container.clientHeight);
    if (distanceToBottom < 1200 && !isLoadingMorePages && pdfDoc) {
      const highestLoaded = continuousPages.length > 0 ? continuousPages[continuousPages.length - 1].pageNumber : 1;
      if (highestLoaded < totalPages) {
        loadMorePages(highestLoaded + 1);
      }
    }
  };

  const loadMorePages = async (startPage: number) => {
    if (!pdfDoc || isLoadingMorePages) return;
    setIsLoadingMorePages(true);

    try {
      const endPage = Math.min(totalPages, startPage + 2);
      const newPages: SmartReflowPageResult[] = [];

      for (let p = startPage; p <= endPage; p++) {
        const res = await extractSmartReflowPage(pdfDoc, p);
        newPages.push(res);
      }

      setContinuousPages((prev) => {
        const existingNums = new Set(prev.map((item) => item.pageNumber));
        const filtered = newPages.filter((item) => !existingNums.has(item.pageNumber));
        return [...prev, ...filtered];
      });
    } catch (err) {
      console.error('Failed to load more continuous pages:', err);
    } finally {
      setIsLoadingMorePages(false);
    }
  };

  // 8. Zen Auto-Hide UI & Double-click / Double-tap Toggle Logic
  const resetHideUiTimer = useCallback(() => {
    setIsUiVisible(true);
    if (hideUiTimerRef.current) {
      clearTimeout(hideUiTimerRef.current);
    }
    if (!activeDrawer && !selectionPopover && !showQualityModal && !isPeekModalOpen) {
      hideUiTimerRef.current = setTimeout(() => {
        setIsUiVisible(false);
      }, 4000);
    }
  }, [activeDrawer, selectionPopover, showQualityModal, isPeekModalOpen]);

  const toggleUiVisibility = useCallback(() => {
    setIsUiVisible((prev) => {
      const next = !prev;
      if (hideUiTimerRef.current) {
        clearTimeout(hideUiTimerRef.current);
      }
      if (next && !activeDrawer && !selectionPopover && !showQualityModal && !isPeekModalOpen) {
        hideUiTimerRef.current = setTimeout(() => {
          setIsUiVisible(false);
        }, 5000);
      }
      return next;
    });
  }, [activeDrawer, selectionPopover, showQualityModal, isPeekModalOpen]);

  // Double click handler (Desktop mouse)
  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a, mark, select, [role="button"]')) {
      return;
    }
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) {
      return;
    }
    toggleUiVisibility();
  };

  // Double tap handler (Touch devices: mobile/tablet)
  const touchStartPosRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartPosRef.current = {
        time: Date.now(),
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartPosRef.current;
    if (!start) return;

    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const dist = Math.hypot(touch.clientX - start.x, touch.clientY - start.y);
      const duration = Date.now() - start.time;

      // Finger didn't drag/scroll (dist < 18px) and tap was quick (< 300ms)
      if (dist < 18 && duration < 300) {
        const target = e.target as HTMLElement;
        if (target.closest('button, input, textarea, a, mark, select, [role="button"]')) {
          return;
        }

        const now = Date.now();
        const prevTap = lastTapRef.current;

        if (
          prevTap &&
          now - prevTap.time < 380 &&
          Math.hypot(touch.clientX - prevTap.x, touch.clientY - prevTap.y) < 35
        ) {
          // Double-tap detected on touch screen!
          lastTapRef.current = null;
          toggleUiVisibility();
        } else {
          lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };
        }
      } else {
        lastTapRef.current = null;
      }
    }
  };

  useEffect(() => {
    resetHideUiTimer();
    return () => {
      if (hideUiTimerRef.current) clearTimeout(hideUiTimerRef.current);
    };
  }, [resetHideUiTimer, activeDrawer]);

  const handleMouseMove = (e: React.MouseEvent) => {
    // Only auto-reveal header/footer on hover when mouse deliberately enters top (< 50px) or bottom (> window.innerHeight - 50px)
    if (e.clientY < 50 || e.clientY > window.innerHeight - 50) {
      if (!isUiVisible) {
        setIsUiVisible(true);
      }
      resetHideUiTimer();
    }
  };

  // 9. Navigation Handlers (Intentional User Actions Only)
  const goToNextPage = useCallback(() => {
    if (settings.navigation === 'continuous' && settings.mode === 'reflow') {
      const nextTarget = Math.min(currentPage + 1, totalPages);
      goToPage(nextTarget);
    } else {
      setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    }
  }, [currentPage, totalPages, settings.navigation, settings.mode]);

  const goToPrevPage = useCallback(() => {
    if (settings.navigation === 'continuous' && settings.mode === 'reflow') {
      const prevTarget = Math.max(currentPage - 1, 1);
      goToPage(prevTarget);
    } else {
      setCurrentPage((prev) => Math.max(prev - 1, 1));
    }
  }, [currentPage, settings.navigation, settings.mode]);

  const goToPage = useCallback(
    async (targetPage: number) => {
      const clamped = Math.max(1, Math.min(targetPage, totalPages));
      activePageRef.current = clamped;
      setCurrentPage(clamped);

      if (settings.navigation === 'continuous' && settings.mode === 'reflow') {
        const targetEl = document.getElementById(`reflow-page-${clamped}`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        } else if (pdfDoc) {
          setIsLoadingText(true);
          try {
            const pagesToLoad = Math.min(totalPages, clamped + 3);
            const batch: SmartReflowPageResult[] = [];
            for (let p = clamped; p <= pagesToLoad; p++) {
              const res = await extractSmartReflowPage(pdfDoc, p);
              batch.push(res);
            }
            setContinuousPages(batch);
            setSmartReflowData(batch[0]);
            setTimeout(() => {
              document.getElementById(`reflow-page-${clamped}`)?.scrollIntoView({ behavior: 'smooth' });
            }, 80);
          } finally {
            setIsLoadingText(false);
          }
        }
      } else {
        if (contentContainerRef.current) {
          contentContainerRef.current.scrollTop = 0;
        }
      }

      if (settings.autoSavePosition && contentContainerRef.current) {
        triggerSaveProgress(clamped, contentContainerRef.current.scrollTop);
      }
    },
    [totalPages, settings.navigation, settings.mode, settings.autoSavePosition, pdfDoc, triggerSaveProgress]
  );

  // 10. Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // 11. Desktop Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'ArrowRight' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault();
        goToNextPage();
        resetHideUiTimer();
      } else if (e.key === 'ArrowLeft' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault();
        goToPrevPage();
        resetHideUiTimer();
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToPage(1);
        resetHideUiTimer();
      } else if (e.key === 'End') {
        e.preventDefault();
        goToPage(totalPages);
        resetHideUiTimer();
      } else if (e.key === 'Escape') {
        if (activeDrawer) {
          setActiveDrawer(null);
        } else if (selectionPopover) {
          setSelectionPopover(null);
        } else if (showQualityModal) {
          setShowQualityModal(false);
        } else if (isPeekModalOpen) {
          setIsPeekModalOpen(false);
        } else if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setActiveDrawer('search');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setSettings((prev) => {
          const next = { ...prev, fontSize: Math.min(32, prev.fontSize + 1) };
          onUpdateSettings(next);
          return next;
        });
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        setSettings((prev) => {
          const next = { ...prev, fontSize: Math.max(14, prev.fontSize - 1) };
          onUpdateSettings(next);
          return next;
        });
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        const cycleOrder: ReaderSettings['theme'][] = ['light', 'sepia', 'dark', 'oled'];
        const nextTheme = cycleOrder[(cycleOrder.indexOf(settings.theme) + 1) % cycleOrder.length];
        setSettings((prev) => {
          const updated = { ...prev, theme: nextTheme };
          onUpdateSettings(updated);
          return updated;
        });
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        setActiveDrawer((prev) => (prev === 'settings' ? null : 'settings'));
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleQuickBookmark();
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setSettings((prev) => {
          const updated: ReaderSettings = {
            ...prev,
            mode: prev.mode === 'reflow' ? 'pdf' : 'reflow',
          };
          onUpdateSettings(updated);
          return updated;
        });
      } else if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        toggleUiVisibility();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    goToNextPage,
    goToPrevPage,
    goToPage,
    totalPages,
    activeDrawer,
    selectionPopover,
    showQualityModal,
    isPeekModalOpen,
    settings.theme,
    onUpdateSettings,
    resetHideUiTimer,
    toggleUiVisibility,
  ]);

  // 12. Quick Bookmark Handler
  const handleQuickBookmark = async () => {
    const isAlreadyBookmarked = bookmarks.some((b) => b.page === currentPage);
    if (isAlreadyBookmarked) {
      const existing = bookmarks.find((b) => b.page === currentPage);
      if (existing) {
        await onDeleteBookmark(existing.id);
      }
    } else {
      const snippet = smartReflowData?.blocks[0]?.text.slice(0, 100) || `Page ${currentPage}`;
      await onAddBookmark(currentPage, snippet);
    }
  };

  // 13. Text Selection in Reflow Mode
  const handleMouseUp = () => {
    if (settings.mode !== 'reflow') return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelectionPopover(null);
      return;
    }

    const selectedText = sel.toString().trim();
    if (selectedText.length > 2) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionPopover({
        x: rect.left + rect.width / 2,
        y: rect.top,
        text: selectedText,
      });
    } else {
      setSelectionPopover(null);
    }
  };

  const handleApplyHighlight = async (color: HighlightColor, note?: string) => {
    if (!selectionPopover) return;
    const newHighlight: Highlight = {
      id: `hl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      bookId: book.id,
      page: currentPage,
      text: selectionPopover.text,
      color,
      note,
      createdAt: Date.now(),
    };
    await onAddHighlight(newHighlight);
    setSelectionPopover(null);
    window.getSelection()?.removeAllRanges();
  };

  // 14. Search Execution
  const handleSearchExecute = async (query: string): Promise<SearchResult[]> => {
    if (!pdfDoc) return [];
    return await searchDocument(pdfDoc, query);
  };

  // Current chapter title
  const currentChapter = chapters.slice().reverse().find((ch) => currentPage >= ch.page)?.title || book.title;

  // Theme styling tokens
  const themeClass = `theme-${settings.theme}`;
  const fontClass =
    settings.fontFamily === 'serif'
      ? 'font-reading-serif'
      : settings.fontFamily === 'sans'
      ? 'font-reading-sans'
      : 'font-reading-dyslexic';

  const isCurrentBookmarked = bookmarks.some((b) => b.page === currentPage);

  // PDF Inversion CSS Filter for Dark/OLED mode
  const pdfCanvasFilter =
    (settings.theme === 'dark' || settings.theme === 'oled') && settings.pdfInvertDark
      ? 'invert(0.88) hue-rotate(180deg) brightness(0.95) contrast(1.05)'
      : settings.theme === 'sepia'
      ? 'sepia(0.4) contrast(1.02)'
      : 'none';

  const confidenceScore = smartReflowData?.quality.overallConfidence || 95;

  // Helper to render individual blocks cleanly
  const renderNormalizedBlock = (block: NormalizedBlock, pageNum: number) => {
    const pageHighlights = highlights.filter((h) => h.page === pageNum);
    let renderedContent: React.ReactNode = block.text;

    for (const hl of pageHighlights) {
      if (block.text.includes(hl.text)) {
        const parts = block.text.split(hl.text);
        renderedContent = (
          <span>
            {parts.map((part, pIdx) => (
              <React.Fragment key={pIdx}>
                {part}
                {pIdx < parts.length - 1 && (
                  <mark
                    className="rounded px-0.5 cursor-pointer relative group"
                    style={{
                      backgroundColor:
                        hl.color === 'yellow'
                          ? 'var(--highlight-yellow)'
                          : hl.color === 'green'
                          ? 'var(--highlight-green)'
                          : hl.color === 'blue'
                          ? 'var(--highlight-blue)'
                          : 'var(--highlight-pink)',
                      color: 'inherit',
                    }}
                    title={hl.note ? `Note: ${hl.note}` : 'Highlight'}
                  >
                    {hl.text}
                    {hl.note && (
                      <span className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-stone-900 text-white rounded shadow-lg whitespace-nowrap z-30">
                        {hl.note}
                      </span>
                    )}
                  </mark>
                )}
              </React.Fragment>
            ))}
          </span>
        );
        break;
      }
    }

    // 1. Chapter Heading Block
    if (block.type === 'chapter') {
      return (
        <header
          key={block.id}
          className="text-center py-6 my-4 border-b space-y-1"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {block.metadata?.chapterNumber && (
            <div className="text-xs uppercase tracking-widest font-mono opacity-60">
              CHAPTER {block.metadata.chapterNumber}
            </div>
          )}
          <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-wide">
            {block.text}
          </h2>
        </header>
      );
    }

    // 2. Section Heading Block
    if (block.type === 'heading') {
      return (
        <h3
          key={block.id}
          className="text-lg sm:text-xl font-serif italic text-center py-2 opacity-85"
        >
          {block.text}
        </h3>
      );
    }

    // 3. Scene Break Block (***)
    if (block.type === 'scene_break') {
      return (
        <div
          key={block.id}
          className="py-6 text-center text-xl opacity-40 select-none tracking-widest font-serif"
        >
          ⁂
        </div>
      );
    }

    // 4. Dialogue Paragraph Block
    if (block.type === 'dialogue') {
      return (
        <p
          key={block.id}
          className="leading-relaxed dialogue-turn pl-0.5"
        >
          {renderedContent}
        </p>
      );
    }

    // 5. Standard Narrative Paragraph Block
    const isContinuation = block.metadata?.isContinuationFromPrevPage;

    return (
      <p
        key={block.id}
        className={`leading-relaxed ${
          isContinuation ? 'mt-1' : ''
        } ${block.metadata?.isIndented && !isContinuation ? 'indent-6' : ''}`}
      >
        {renderedContent}
      </p>
    );
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className={`fixed inset-0 select-text overflow-hidden flex flex-col transition-colors duration-200 ${themeClass}`}
      style={{
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-main)',
      }}
    >
      {/* ──────────────────────────────────────────────────────────── */}
      {/* TOP BAR: Distraction-free floating header with auto-hide */}
      {/* ──────────────────────────────────────────────────────────── */}
      <header
        className={`fixed sm:absolute top-0 left-0 right-0 z-40 px-2.5 sm:px-6 py-2 sm:py-3 transition-all duration-300 backdrop-blur-md border-b flex items-center justify-between ${
          isUiVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-canvas) 85%, transparent)',
          borderColor: 'var(--border-subtle)',
          paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
        }}
      >
        {/* Left: Back to library & Smart Reflow Quality Pill */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={onBackToLibrary}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg hover:opacity-80 transition-opacity border cursor-pointer"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
            title="Back to Library"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Library</span>
          </button>

          {/* Smart Reflow Quality Badge */}
          {settings.mode === 'reflow' && smartReflowData && (
            <button
              onClick={() => setShowQualityModal(true)}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors hover:opacity-90 cursor-pointer"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
              title="Click to view Smart Reflow analysis"
            >
              <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Smart Reflow · {confidenceScore}%</span>
            </button>
          )}
        </div>

        {/* Center: Book & Chapter Title */}
        <div className="text-center max-w-[140px] sm:max-w-xs md:max-w-md hidden md:block truncate px-2 sm:px-4">
          <span className="text-[11px] font-medium opacity-60 uppercase tracking-widest block truncate">
            {book.title}
          </span>
          <span className="text-xs sm:text-sm font-serif font-semibold truncate block">
            {currentChapter}
          </span>
        </div>

        {/* Right: Reader Affordances */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Navigation Mode Quick Switcher (Continuous Scroll vs Page by Page) */}
          <button
            onClick={() => {
              const nextNav = settings.navigation === 'continuous' ? 'paginated' : 'continuous';
              const next: ReaderSettings = { ...settings, navigation: nextNav };
              setSettings(next);
              onUpdateSettings(next);
            }}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border text-xs font-medium hover:opacity-85 transition-opacity cursor-pointer"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
            title={
              settings.navigation === 'continuous'
                ? 'Currently in Continuous Scroll. Click for Page by Page.'
                : 'Currently in Page by Page. Click for Continuous Scroll.'
            }
          >
            {settings.navigation === 'continuous' ? (
              <>
                <ScrollText className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span className="hidden xl:inline text-[11px]">Continuous</span>
              </>
            ) : (
              <>
                <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span className="hidden xl:inline text-[11px]">Paged</span>
              </>
            )}
          </button>

          {/* Engine Switcher (Reflow vs PDF) */}
          <div
            className="flex items-center p-0.5 rounded-lg border text-xs"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <button
              onClick={() => {
                const next: ReaderSettings = { ...settings, mode: 'reflow' };
                setSettings(next);
                onUpdateSettings(next);
              }}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded transition-colors cursor-pointer ${
                settings.mode === 'reflow'
                  ? 'bg-amber-700 text-white font-medium shadow-xs'
                  : 'opacity-70 hover:opacity-100'
              }`}
              title="Smart Reflow Ebook Mode (M)"
            >
              <BookText className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reflow</span>
            </button>
            <button
              onClick={() => {
                const next: ReaderSettings = { ...settings, mode: 'pdf' };
                setSettings(next);
                onUpdateSettings(next);
              }}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded transition-colors cursor-pointer ${
                settings.mode === 'pdf'
                  ? 'bg-amber-700 text-white font-medium shadow-xs'
                  : 'opacity-70 hover:opacity-100'
              }`}
              title="PDF Original Document Mode (M)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden md:inline">PDF</span>
            </button>
          </div>

          {/* Table of Contents */}
          <button
            onClick={() => setActiveDrawer('toc')}
            className="p-1.5 sm:p-2 rounded-lg hover:opacity-80 transition-opacity border cursor-pointer"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
            title="Table of Contents"
          >
            <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Search */}
          <button
            onClick={() => setActiveDrawer('search')}
            className="p-1.5 sm:p-2 rounded-lg hover:opacity-80 transition-opacity border cursor-pointer"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
            title="Search in Book (Ctrl + F)"
          >
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Bookmark Toggle */}
          <button
            onClick={handleQuickBookmark}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors border cursor-pointer ${
              isCurrentBookmarked ? 'text-amber-600 font-bold' : 'hover:opacity-80'
            }`}
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
            title={isCurrentBookmarked ? 'Remove Bookmark (B)' : 'Bookmark Current Page (B)'}
          >
            <BookmarkIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isCurrentBookmarked ? 'fill-current' : ''}`} />
          </button>

          {/* Bookmarks & Highlights Drawer */}
          <button
            onClick={() => setActiveDrawer('bookmarks')}
            className="p-1.5 sm:p-2 rounded-lg hover:opacity-80 transition-opacity border cursor-pointer"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
            title="Saved Bookmarks & Highlights"
          >
            <span className="text-xs font-mono font-medium px-0.5">
              {bookmarks.length + highlights.length > 0 ? bookmarks.length + highlights.length : '🔖'}
            </span>
          </button>

          {/* Reading Settings */}
          <button
            onClick={() => setActiveDrawer('settings')}
            className="p-1.5 sm:p-2 rounded-lg hover:opacity-80 transition-opacity border cursor-pointer"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
            title="Reading Settings (S)"
          >
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded-lg hover:opacity-80 transition-opacity border hidden sm:block cursor-pointer"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
            title="Toggle Fullscreen (F11)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* CENTER READING CANVAS */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div
        ref={contentContainerRef}
        onScroll={handleScroll}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-y-auto px-3 sm:px-8 py-14 sm:py-20 flex flex-col items-center justify-start relative focus:outline-none"
      >
        {/* Left & Right Click-to-turn-page zones in Paginated Mode */}
        {settings.navigation === 'paginated' && (
          <>
            <div
              onClick={goToPrevPage}
              className="absolute left-0 top-16 bottom-20 w-16 lg:w-24 cursor-w-resize z-20 opacity-0 hover:opacity-30 flex items-center justify-center transition-opacity"
              title="Previous Page (←)"
            >
              <ChevronLeft className="w-8 h-8" />
            </div>
            <div
              onClick={goToNextPage}
              className="absolute right-0 top-16 bottom-20 w-16 lg:w-24 cursor-e-resize z-20 opacity-0 hover:opacity-30 flex items-center justify-center transition-opacity"
              title="Next Page (→ / Space)"
            >
              <ChevronRight className="w-8 h-8" />
            </div>
          </>
        )}

        {/* Loading PDF State */}
        {isLoadingPdf ? (
          <div className="my-auto text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-700" />
            <p className="text-sm opacity-70">Loading novel pages…</p>
          </div>
        ) : settings.mode === 'reflow' ? (
          /* MODE 1: SMART REFLOW READING MODE */
          <div
            className={`w-full mx-auto transition-all duration-150 ${fontClass}`}
            style={{
              maxWidth: `${settings.contentWidth}px`,
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
              textAlign: settings.textAlign,
            }}
          >
            {isLoadingText && continuousPages.length === 0 ? (
              <div className="py-24 text-center opacity-60 text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Reconstructing novel text…</span>
              </div>
            ) : settings.navigation === 'continuous' ? (
              /* CONTINUOUS SCROLL STREAM */
              <div className="pb-24">
                {continuousPages.map((pageData, pageIdx) => {
                  return (
                    <section
                      key={pageData.pageNumber}
                      id={`reflow-page-${pageData.pageNumber}`}
                      data-page-num={pageData.pageNumber}
                      className="relative"
                    >
                      {/* Page Separation */}
                      {pageIdx > 0 && (
                        settings.pageSeparation === 'show' ? (
                          <div
                            className="py-8 my-8 flex items-center justify-center gap-4 text-xs font-mono opacity-50 select-none border-t border-b border-dashed"
                            style={{ borderColor: 'var(--border-subtle)' }}
                          >
                            <span className="w-12 h-px bg-current opacity-30" />
                            <span>PAGE {pageData.pageNumber}</span>
                            <span className="w-12 h-px bg-current opacity-30" />
                          </div>
                        ) : settings.pageSeparation === 'minimal' ? (
                          <div
                            className="h-8 my-4 border-t border-dotted opacity-20"
                            style={{ borderColor: 'var(--border-subtle)' }}
                          />
                        ) : null
                      )}

                      {/* Page Blocks */}
                      <div className="space-y-6">
                        {pageData.blocks.map((block) => renderNormalizedBlock(block, pageData.pageNumber))}
                      </div>
                    </section>
                  );
                })}

                {isLoadingMorePages && (
                  <div className="py-8 text-center text-xs opacity-60 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                    <span>Loading next chapters…</span>
                  </div>
                )}
              </div>
            ) : (
              /* PAGINATED SINGLE PAGE */
              <article className="space-y-6 select-text pb-16">
                {!smartReflowData || smartReflowData.blocks.length === 0 ? (
                  <div className="py-24 text-center opacity-50 space-y-3">
                    <p className="font-serif italic text-base">
                      This page contains illustrations, diagrams, or scanned images without digital text.
                    </p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => {
                          const next: ReaderSettings = { ...settings, mode: 'pdf' };
                          setSettings(next);
                          onUpdateSettings(next);
                        }}
                        className="px-3.5 py-2 text-xs bg-amber-800 text-white rounded-lg shadow-xs flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View in PDF Original Mode</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  smartReflowData.blocks.map((block) => renderNormalizedBlock(block, currentPage))
                )}

                {/* Original Layout Reference Footer in Paginated Mode */}
                <div
                  className="pt-10 mt-8 pb-4 flex items-center justify-between border-t border-dashed transition-opacity"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div className="text-xs opacity-60 font-mono flex items-center gap-2">
                    <span>Page {currentPage} of {totalPages}</span>
                    <span>·</span>
                    <button
                      onClick={() => setShowQualityModal(true)}
                      className="hover:underline text-amber-700 dark:text-amber-400"
                    >
                      Reflow: {confidenceScore}%
                    </button>
                  </div>

                  <button
                    onClick={() => setIsPeekModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:opacity-85 shadow-2xs"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                    }}
                    title="Quick peek at original PDF layout for this page"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                    <span>Original PDF Layout [p. {currentPage}]</span>
                  </button>
                </div>
              </article>
            )}
          </div>
        ) : (
          /* MODE 2: PDF ORIGINAL PAGE CANVAS MODE */
          <div className="flex flex-col items-center justify-center my-auto pb-16">
            {/* Zoom Controls for PDF View */}
            <div
              className={`flex items-center gap-1.5 p-1 mb-4 rounded-lg border text-xs shadow-xs ${
                isUiVisible ? 'opacity-100' : 'opacity-40 hover:opacity-100'
              } transition-opacity`}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <button
                onClick={() => setPdfZoom((z) => Math.max(0.6, z - 0.15))}
                className="p-1 rounded hover:opacity-70 transition-opacity"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] px-1.5 tabular-nums">
                {Math.round(pdfZoom * 100)}%
              </span>
              <button
                onClick={() => setPdfZoom((z) => Math.min(2.5, z + 0.15))}
                className="p-1 rounded hover:opacity-70 transition-opacity"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPdfZoom(1.2)}
                className="p-1 rounded hover:opacity-70 transition-opacity ml-1 border-l pl-1.5"
                style={{ borderColor: 'var(--border-subtle)' }}
                title="Fit Page / Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="relative rounded-lg shadow-xl overflow-hidden border border-stone-300 dark:border-stone-800">
              {isRenderingCanvas && (
                <div className="absolute inset-0 bg-black/10 backdrop-blur-2xs flex items-center justify-center z-10">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-700" />
                </div>
              )}
              <canvas
                ref={canvasRef}
                style={{
                  filter: pdfCanvasFilter,
                  transition: 'filter 0.3s ease',
                }}
                className="block max-w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* FLOATING TEXT SELECTION POPOVER */}
      {/* ──────────────────────────────────────────────────────────── */}
      {selectionPopover && (
        <HighlightPopover
          x={selectionPopover.x}
          y={selectionPopover.y}
          selectedText={selectionPopover.text}
          onHighlight={handleApplyHighlight}
          onClose={() => {
            setSelectionPopover(null);
            window.getSelection()?.removeAllRanges();
          }}
        />
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* BOTTOM BAR: Minimal Reading Progress with auto-hide */}
      {/* ──────────────────────────────────────────────────────────── */}
      <footer
        className={`fixed sm:absolute bottom-0 left-0 right-0 z-40 px-3 sm:px-6 py-2 sm:py-3 transition-all duration-300 backdrop-blur-md border-t flex flex-col items-center gap-1.5 sm:gap-2 ${
          isUiVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-full pointer-events-none'
        }`}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-canvas) 85%, transparent)',
          borderColor: 'var(--border-subtle)',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="w-full max-w-2xl flex items-center justify-between gap-2 sm:gap-4">
          {/* Previous Page Button */}
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-medium rounded-lg hover:opacity-80 transition-opacity border disabled:opacity-30 cursor-pointer shrink-0"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Page Counter & Percentage */}
          <div className="flex-1 flex flex-col items-center min-w-0">
            <div className="text-[11px] sm:text-xs font-mono flex items-center gap-1.5 sm:gap-2 tabular-nums truncate">
              <span>
                Page <strong className="font-semibold">{currentPage}</strong> of {totalPages}
              </span>
              <span>·</span>
              <span className="font-medium text-amber-700 dark:text-amber-400">
                {Math.round((currentPage / totalPages) * 100)}%
              </span>
              {settings.navigation === 'continuous' && (
                <>
                  <span className="hidden xs:inline">·</span>
                  <span className="text-[10px] text-stone-400 hidden xs:inline">Continuous</span>
                </>
              )}
            </div>

            {/* Scrub Slider */}
            <div className="w-full max-w-md relative mt-1 sm:mt-1.5 flex items-center">
              {scrubPreviewPage !== null && (
                <div
                  className="absolute bottom-full mb-1 text-[11px] font-mono px-2 py-0.5 rounded shadow-md bg-stone-900 text-white transform -translate-x-1/2 pointer-events-none"
                  style={{
                    left: `${((scrubPreviewPage - 1) / Math.max(1, totalPages - 1)) * 100}%`,
                  }}
                >
                  Page {scrubPreviewPage}
                </div>
              )}
              <input
                type="range"
                min={1}
                max={totalPages}
                value={currentPage}
                onMouseEnter={() => setScrubPreviewPage(currentPage)}
                onMouseLeave={() => setScrubPreviewPage(null)}
                onChange={(e) => {
                  const p = Number(e.target.value);
                  setScrubPreviewPage(p);
                  goToPage(p);
                }}
                className="w-full accent-amber-700 h-1 sm:h-1.5 bg-stone-300 dark:bg-stone-700 rounded-lg cursor-pointer"
              />
            </div>
            <div className="text-[10px] opacity-40 font-mono hidden md:block mt-0.5">
              Double-click / double-tap to toggle · Scroll to hide
            </div>
          </div>

          {/* Next Page Button */}
          <button
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-medium rounded-lg hover:opacity-80 transition-opacity border disabled:opacity-30 cursor-pointer shrink-0"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>

      {/* Floating Zen Indicator / Quick Reveal Button when UI is hidden */}
      {!isUiVisible && (
        <button
          onClick={toggleUiVisibility}
          className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full text-[11px] font-mono backdrop-blur-md border opacity-30 hover:opacity-100 active:opacity-100 transition-all select-none flex items-center gap-1.5 shadow-xs cursor-pointer"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-surface) 80%, transparent)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-main)',
          }}
          title="Click, double-click, or double-tap to toggle controls"
        >
          <Eye className="w-3 h-3 opacity-70" />
          <span>
            {currentPage} / {totalPages} · {Math.round((currentPage / totalPages) * 100)}%
          </span>
        </button>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* DRAWERS & MODALS */}
      {/* ──────────────────────────────────────────────────────────── */}
      <TableOfContentsDrawer
        isOpen={activeDrawer === 'toc'}
        onClose={() => setActiveDrawer(null)}
        chapters={chapters}
        currentPage={currentPage}
        onSelectChapter={goToPage}
      />

      <SearchDrawer
        isOpen={activeDrawer === 'search'}
        onClose={() => setActiveDrawer(null)}
        onSearch={handleSearchExecute}
        onSelectResult={goToPage}
        currentPage={currentPage}
      />

      <BookmarksDrawer
        isOpen={activeDrawer === 'bookmarks'}
        onClose={() => setActiveDrawer(null)}
        bookmarks={bookmarks}
        highlights={highlights}
        currentPage={currentPage}
        onSelectPage={goToPage}
        onAddBookmark={handleQuickBookmark}
        onDeleteBookmark={onDeleteBookmark}
        onDeleteHighlight={onDeleteHighlight}
      />

      <ReadingSettingsDrawer
        isOpen={activeDrawer === 'settings'}
        onClose={() => setActiveDrawer(null)}
        settings={settings}
        onUpdateSettings={(updates) => {
          const next = { ...settings, ...updates };
          setSettings(next);
          onUpdateSettings(next);
        }}
      />

      <ShortcutsModal
        isOpen={activeDrawer === 'shortcuts'}
        onClose={() => setActiveDrawer(null)}
      />

      {/* Reflow Quality Modal */}
      {smartReflowData && (
        <ReflowQualityModal
          isOpen={showQualityModal}
          onClose={() => setShowQualityModal(false)}
          quality={smartReflowData.quality}
          pageNumber={currentPage}
          onViewOriginalPdf={() => {
            const next: ReaderSettings = { ...settings, mode: 'pdf' };
            setSettings(next);
            onUpdateSettings(next);
          }}
        />
      )}

      {/* Quick Peek at Original Page Modal */}
      <OriginalPagePeekModal
        isOpen={isPeekModalOpen}
        onClose={() => setIsPeekModalOpen(false)}
        pdfDoc={pdfDoc}
        pageNumber={currentPage}
        onSwitchToPdfMode={() => {
          const next: ReaderSettings = { ...settings, mode: 'pdf' };
          setSettings(next);
          onUpdateSettings(next);
        }}
      />
    </div>
  );
};
