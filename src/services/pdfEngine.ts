import * as pdfjsLib from 'pdfjs-dist';
import { ChapterOutline, SearchResult, SmartReflowPageResult } from '../types/reader';
import { PreviousPageContext, parseSmartReflowPage, reconstructVisualLines } from './smartReflow';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;
  }
}

// Track active render tasks per canvas to cancel smoothly when changing pages fast
const activeCanvasRenderTasks = new WeakMap<HTMLCanvasElement, any>();

// Cache page endings for cross-page paragraph continuation analysis
const documentPageEndingsCache = new WeakMap<pdfjsLib.PDFDocumentProxy, Map<number, PreviousPageContext>>();

export async function loadPdfDocument(source: Blob | ArrayBuffer | string): Promise<pdfjsLib.PDFDocumentProxy> {
  let data: ArrayBuffer | string;

  if (source instanceof Blob) {
    data = await source.arrayBuffer();
  } else {
    data = source;
  }

  const loadingTask = pdfjsLib.getDocument(
    typeof data === 'string' ? { url: data } : { data: new Uint8Array(data) }
  );

  return loadingTask.promise;
}

export async function extractMetadata(doc: pdfjsLib.PDFDocumentProxy): Promise<{
  title?: string;
  author?: string;
  totalPages: number;
}> {
  let title = '';
  let author = '';
  try {
    const meta = await doc.getMetadata();
    const info = (meta?.info as Record<string, any>) || {};
    title = (info.Title as string)?.trim() || '';
    author = (info.Author as string)?.trim() || '';
  } catch (err) {
    console.warn('Could not extract PDF metadata:', err);
  }

  return {
    title,
    author,
    totalPages: doc.numPages,
  };
}

export async function generateCoverThumbnail(doc: pdfjsLib.PDFDocumentProxy): Promise<string> {
  try {
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 0.75 });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas: canvas as any,
    }).promise;

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.warn('Failed to generate cover thumbnail:', err);
    return '';
  }
}

export async function extractOutline(doc: pdfjsLib.PDFDocumentProxy): Promise<ChapterOutline[]> {
  const chapters: ChapterOutline[] = [];

  try {
    const outline = await doc.getOutline();
    if (outline && outline.length > 0) {
      for (let i = 0; i < outline.length; i++) {
        const item = outline[i];
        let pageNum = 1;
        if (typeof item.dest === 'string') {
          const dest = await doc.getDestination(item.dest);
          if (dest && dest[0]) {
            const pageIndex = await doc.getPageIndex(dest[0]);
            pageNum = pageIndex + 1;
          }
        } else if (Array.isArray(item.dest) && item.dest[0]) {
          const pageIndex = await doc.getPageIndex(item.dest[0]);
          pageNum = pageIndex + 1;
        }

        chapters.push({
          id: `toc-${i}-${pageNum}`,
          title: item.title || `Chapter ${i + 1}`,
          page: pageNum,
          level: 0,
        });

        // Children items
        if (item.items && item.items.length > 0) {
          for (let j = 0; j < item.items.length; j++) {
            const sub = item.items[j];
            let subPage = pageNum;
            if (Array.isArray(sub.dest) && sub.dest[0]) {
              const pIdx = await doc.getPageIndex(sub.dest[0]);
              subPage = pIdx + 1;
            }
            chapters.push({
              id: `toc-${i}-${j}-${subPage}`,
              title: sub.title || `Section ${j + 1}`,
              page: subPage,
              level: 1,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not extract PDF outline:', err);
  }

  // If no native outline was found, let's scan first 30 pages to detect common chapter headings
  if (chapters.length === 0) {
    const detected = await detectChaptersFromContent(doc);
    if (detected.length > 0) {
      return detected;
    }
    // Default fallback: chunk every 10 pages or single book
    if (doc.numPages <= 10) {
      chapters.push({ id: 'toc-start', title: 'Beginning', page: 1, level: 0 });
    } else {
      for (let p = 1; p <= doc.numPages; p += 10) {
        chapters.push({
          id: `toc-p-${p}`,
          title: p === 1 ? 'Beginning' : `Page ${p}`,
          page: p,
          level: 0,
        });
      }
    }
  }

  return chapters;
}

async function detectChaptersFromContent(doc: pdfjsLib.PDFDocumentProxy): Promise<ChapterOutline[]> {
  const detected: ChapterOutline[] = [];
  const maxScanPages = Math.min(doc.numPages, 40);

  const chapterRegex = /^(?:chapter|part|book|bab|act|scene)\s+([0-9ivxlcdm]+|[a-z]+)?(?:\s*[:.\-—]\s*|\s+)(.*)$/i;
  const simpleChapterRegex = /^(?:chapter|part|bab)\s+([0-9ivxlcdm]+)$/i;

  for (let pageNum = 1; pageNum <= maxScanPages; pageNum++) {
    try {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const lines = assembleLinesFromTextItems(textContent.items as any[]);

      for (const line of lines.slice(0, 8)) {
        const trimmed = line.trim();
        if (chapterRegex.test(trimmed) || simpleChapterRegex.test(trimmed) || /^([0-9IVXLCDM]+)\.\s+[A-Z]/.test(trimmed)) {
          detected.push({
            id: `detected-ch-${pageNum}`,
            title: trimmed.replace(/^\[\s*|\s*\]$/g, ''),
            page: pageNum,
            level: 0,
          });
          break;
        }
      }
    } catch {
      // Ignore scan page error
    }
  }

  return detected;
}

export function assembleLinesFromTextItems(items: Array<{ str: string; transform: number[]; hasEOL?: boolean }>): string[] {
  if (!items || items.length === 0) return [];

  // Group by Y coordinate (transform[5])
  const linesMap = new Map<number, string[]>();
  const lineThreshold = 3.5; // pixel tolerance for same line

  for (const item of items) {
    if (!item.str || item.str.trim() === '') continue;
    const y = item.transform ? item.transform[5] : 0;

    let foundLineY: number | null = null;
    for (const existingY of linesMap.keys()) {
      if (Math.abs(existingY - y) <= lineThreshold) {
        foundLineY = existingY;
        break;
      }
    }

    if (foundLineY !== null) {
      linesMap.get(foundLineY)!.push(item.str);
    } else {
      linesMap.set(y, [item.str]);
    }
  }

  // Sort descending by Y (in PDF coordinates, higher Y is higher on page)
  const sortedYs = Array.from(linesMap.keys()).sort((a, b) => b - a);

  return sortedYs.map((y) => linesMap.get(y)!.join(' ').trim());
}

export async function extractSmartReflowPage(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<SmartReflowPageResult> {
  try {
    let endingsMap = documentPageEndingsCache.get(doc);
    if (!endingsMap) {
      endingsMap = new Map<number, PreviousPageContext>();
      documentPageEndingsCache.set(doc, endingsMap);
    }

    let prevContext: PreviousPageContext | undefined = undefined;
    if (pageNumber > 1) {
      if (endingsMap.has(pageNumber - 1)) {
        prevContext = endingsMap.get(pageNumber - 1);
      } else {
        // Look at previous page to detect whether last paragraph continued
        try {
          const prevPage = await doc.getPage(pageNumber - 1);
          const prevVp = prevPage.getViewport({ scale: 1.0 });
          const prevTc = await prevPage.getTextContent();
          const { lines: prevLines } = reconstructVisualLines(
            prevTc.items as any,
            prevVp.height,
            prevVp.width
          );
          if (prevLines.length > 0) {
            const lastL = prevLines[prevLines.length - 1];
            const lastT = lastL ? lastL.text.trim() : '';
            prevContext = {
              lastLineText: lastT,
              endsWithTerminal: /[.!?”"’'…—]\s*$/.test(lastT),
              endsWithHyphen: /[-—–]\s*$/.test(lastT),
            };
            endingsMap.set(pageNumber - 1, prevContext);
          }
        } catch {
          // Ignore error
        }
      }
    }

    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const { lines, headersFootersFiltered } = reconstructVisualLines(
      textContent.items as any,
      viewport.height,
      viewport.width
    );

    const result = parseSmartReflowPage(
      lines,
      pageNumber,
      viewport.width,
      headersFootersFiltered,
      prevContext
    );

    if (result.pageEnding) {
      endingsMap.set(pageNumber, result.pageEnding);
    }

    return result;
  } catch (err) {
    console.error(`Failed to smart-reflow page ${pageNumber}:`, err);
    return {
      pageNumber,
      blocks: [],
      rawLineCount: 0,
      quality: {
        overallConfidence: 0,
        paragraphDetection: 0,
        dialogueDetection: 0,
        chapterDetection: 0,
        hyphenationFixedCount: 0,
        headersFootersFilteredCount: 0,
        isScanLikely: true,
      },
    };
  }
}

export async function extractPageText(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<{ text: string; paragraphs: string[]; headings: string[] }> {
  try {
    const smartPage = await extractSmartReflowPage(doc, pageNumber);
    const paragraphs: string[] = [];
    const headings: string[] = [];

    for (const b of smartPage.blocks) {
      if (b.type === 'chapter' || b.type === 'heading') {
        headings.push(b.text);
        paragraphs.push(`##HEADER##${b.text}`);
      } else if (b.type === 'scene_break') {
        paragraphs.push('⁂');
      } else {
        paragraphs.push(b.text);
      }
    }

    const fullText = paragraphs.join('\n\n');

    return {
      text: fullText,
      paragraphs,
      headings,
    };
  } catch (err) {
    console.error(`Failed to extract text from page ${pageNumber}:`, err);
    return { text: '', paragraphs: [], headings: [] };
  }
}

export async function renderPageCanvas(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number
): Promise<void> {
  // Cancel previous render task if active on this canvas
  const existingTask = activeCanvasRenderTasks.get(canvas);
  if (existingTask) {
    try {
      existingTask.cancel();
    } catch {
      // Ignore cancel error
    }
    activeCanvasRenderTasks.delete(canvas);
  }

  const page = await doc.getPage(pageNumber);
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5); // Cap to 2.5x for speed & crispness
  const viewport = page.getViewport({ scale: scale * dpr });

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
  canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const renderTask = page.render({
    canvasContext: ctx,
    viewport,
    canvas: canvas as any,
  });

  activeCanvasRenderTasks.set(canvas, renderTask);

  try {
    await renderTask.promise;
  } catch (err: any) {
    if (err?.name !== 'RenderingCancelledException') {
      console.warn('Canvas render error:', err);
    }
  } finally {
    if (activeCanvasRenderTasks.get(canvas) === renderTask) {
      activeCanvasRenderTasks.delete(canvas);
    }
  }
}

export async function searchDocument(
  doc: pdfjsLib.PDFDocumentProxy,
  query: string,
  onProgress?: (progressPercent: number) => void
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const results: SearchResult[] = [];
  const lowerQuery = trimmed.toLowerCase();
  const totalPages = doc.numPages;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    try {
      const { text } = await extractPageText(doc, pageNum);
      const lowerText = text.toLowerCase();

      let startIndex = 0;
      while (startIndex < lowerText.length) {
        const foundAt = lowerText.indexOf(lowerQuery, startIndex);
        if (foundAt === -1) break;

        const snippetStart = Math.max(0, foundAt - 50);
        const snippetEnd = Math.min(text.length, foundAt + query.length + 50);

        const prefix = text.slice(snippetStart, foundAt);
        const keyword = text.slice(foundAt, foundAt + query.length);
        const suffix = text.slice(foundAt + query.length, snippetEnd);

        results.push({
          pageNumber: pageNum,
          matchText: text.slice(snippetStart, snippetEnd),
          prefix: (snippetStart > 0 ? '…' : '') + prefix,
          keyword,
          suffix: suffix + (snippetEnd < text.length ? '…' : ''),
        });

        // Limit results per page
        if (results.length > 50) break;
        startIndex = foundAt + query.length;
      }
    } catch {
      // Continue next page
    }

    if (onProgress && pageNum % 5 === 0) {
      onProgress(Math.floor((pageNum / totalPages) * 100));
    }
  }

  if (onProgress) onProgress(100);
  return results;
}
