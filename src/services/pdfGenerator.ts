/**
 * Lightweight, compliant PDF 1.4 binary generator for creating sample literature PDFs
 * fully readable by PDF.js and standard PDF viewers.
 */

interface BookChapterData {
  title: string;
  paragraphs: string[];
}

export function createNovelPdfBlob(
  title: string,
  author: string,
  chapters: BookChapterData[]
): Blob {
  const pagesData: { chapterTitle: string; pageNumber: number; lines: string[] }[] = [];

  // Break paragraphs into lines and pages (approx 36 lines per page)
  const LINES_PER_PAGE = 36;
  const MAX_CHARS_PER_LINE = 64;

  let currentPageLines: string[] = [];
  let currentChapter = '';

  function wrapText(text: string): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = '';

    for (const w of words) {
      if ((current + ' ' + w).trim().length <= MAX_CHARS_PER_LINE) {
        current = current ? current + ' ' + w : w;
      } else {
        if (current) lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  // Cover / Title Page
  pagesData.push({
    chapterTitle: title,
    pageNumber: 1,
    lines: [
      '',
      '',
      '',
      '====================================================',
      `           ${title.toUpperCase()}`,
      `               by ${author}`,
      '====================================================',
      '',
      '              Classic Literature Edition',
      '        Prepared for Desktop Ebook Novel Reader',
      '',
      '',
      '  "A room without books is like a body without a soul."',
      '                             — Cicero',
      '',
      '----------------------------------------------------',
    ],
  });

  for (const chapter of chapters) {
    currentChapter = chapter.title;
    currentPageLines = [`[ ${chapter.title.toUpperCase()} ]`, ''];

    for (const para of chapter.paragraphs) {
      const wrapped = wrapText(para);
      if (currentPageLines.length + wrapped.length + 1 > LINES_PER_PAGE) {
        pagesData.push({
          chapterTitle: currentChapter,
          pageNumber: pagesData.length + 1,
          lines: currentPageLines,
        });
        currentPageLines = [`[ ${chapter.title} (Cont.) ]`, ''];
      }
      currentPageLines.push(...wrapped);
      currentPageLines.push(''); // blank line after paragraph
    }

    if (currentPageLines.length > 0) {
      pagesData.push({
        chapterTitle: currentChapter,
        pageNumber: pagesData.length + 1,
        lines: currentPageLines,
      });
      currentPageLines = [];
    }
  }

  // Construct PDF structure
  // Objects:
  // 1: Catalog
  // 2: Outlines
  // 3: Pages
  // 4: Font /F1 (Times-Roman)
  // 5: Font /F2 (Helvetica-Bold)
  // Then per page: Page Object + Content Stream Object

  const objects: string[] = [];
  const totalPages = pagesData.length;

  // Obj 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 3 0 R /Outlines 2 0 R >>\nendobj\n');

  // Obj 2: Outlines
  objects.push('2 0 obj\n<< /Type /Outlines /Count 0 >>\nendobj\n');

  // Obj 3: Pages placeholder (will be constructed with references)
  const pageObjectIds: number[] = [];
  let nextObjId = 6;

  for (let i = 0; i < totalPages; i++) {
    pageObjectIds.push(nextObjId);
    nextObjId += 2; // page obj, content stream obj
  }

  const kidsStr = pageObjectIds.map((id) => `${id} 0 R`).join(' ');
  objects.push(`3 0 obj\n<< /Type /Pages /Kids [ ${kidsStr} ] /Count ${totalPages} >>\nendobj\n`);

  // Obj 4: Font F1 (Times-Roman)
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>\nendobj\n');

  // Obj 5: Font F2 (Helvetica-Bold)
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');

  // Page dimensions: US Letter 612 x 792 pt
  for (let i = 0; i < totalPages; i++) {
    const pageData = pagesData[i];
    const pageObjId = pageObjectIds[i];
    const contentObjId = pageObjId + 1;

    // Build content stream
    let streamText = 'BT\n';
    
    // Header
    streamText += '/F2 9 Tf\n54 745 Td\n(' + escapePdfText(title) + ' - ' + escapePdfText(pageData.chapterTitle) + ') Tj\nET\n';
    
    // Footer with page number
    streamText += 'BT\n/F2 9 Tf\n300 36 Td\n(- ' + (i + 1) + ' -) Tj\nET\n';

    // Body text
    streamText += 'BT\n/F1 11 Tf\n15.5 TL\n54 715 Td\n';

    for (let lineIndex = 0; lineIndex < pageData.lines.length; lineIndex++) {
      const line = pageData.lines[lineIndex];
      const isHeading = line.startsWith('[ ') && line.endsWith(' ]');
      const escaped = escapePdfText(line);

      if (!line) {
        streamText += '10 TL\nT*\n15.5 TL\n';
      } else if (isHeading) {
        streamText += '/F2 12 Tf\n(' + escaped + ') Tj T*\n/F1 11 Tf\n';
      } else {
        streamText += '(' + escaped + ') Tj T*\n';
      }
    }
    streamText += 'ET\n';

    const streamBytes = new TextEncoder().encode(streamText);
    const streamLength = streamBytes.length;

    // Page object
    const pageObj = `${pageObjId} 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents ${contentObjId} 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> >>\nendobj\n`;
    objects.push(pageObj);

    // Content stream object
    const contentObj = `${contentObjId} 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamText}\nendstream\nendobj\n`;
    objects.push(contentObj);
  }

  // Assemble full PDF with xref table
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefOffset = pdf.length;
  pdf += 'xref\n0 ' + offsets.length + '\n';
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += offsets[i].toString().padStart(10, '0') + ' 00000 n \n';
  }

  pdf += 'trailer\n';
  pdf += `<< /Size ${offsets.length} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += xrefOffset + '\n';
  pdf += '%%EOF\n';

  return new Blob([pdf], { type: 'application/pdf' });
}

function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7E]/g, ' ');
}
