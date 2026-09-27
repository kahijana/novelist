export type ReadingTheme = 'light' | 'sepia' | 'dark' | 'oled';
export type ReadingFont = 'serif' | 'sans' | 'dyslexic';
export type ReadingMargin = 'compact' | 'comfortable' | 'large';
export type ReadingMode = 'reflow' | 'pdf';
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';
export type NavigationMode = 'continuous' | 'paginated';
export type PageSeparation = 'show' | 'minimal' | 'none';

export interface ChapterOutline {
  id: string;
  title: string;
  page: number; // 1-indexed
  level?: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string; // Base64 or URL
  fileBlob?: Blob;
  fileSize: number;
  totalPages: number;
  createdAt: number;
  lastReadAt: number;
  isSample?: boolean;
  sampleContentKey?: string;
  chapters?: ChapterOutline[];
}

export interface ReadingProgress {
  bookId: string;
  page: number;
  totalPages: number;
  percentage: number;
  scrollPosition?: number;
  updatedAt: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  page: number;
  title: string;
  snippet?: string;
  createdAt: number;
}

export interface Highlight {
  id: string;
  bookId: string;
  page: number;
  text: string;
  color: HighlightColor;
  note?: string;
  createdAt: number;
}

export interface ReaderSettings {
  theme: ReadingTheme;
  fontFamily: ReadingFont;
  fontSize: number; // 14 to 32
  lineHeight: number; // 1.4 to 2.2
  contentWidth: number; // 540 to 960
  margin: ReadingMargin;
  textAlign: 'left' | 'justify';
  mode: ReadingMode;
  dropCaps: boolean;
  pdfInvertDark: boolean;
  navigation: NavigationMode;
  pageSeparation: PageSeparation;
  autoSavePosition: boolean;
}

export interface SearchResult {
  pageNumber: number;
  matchText: string;
  prefix: string;
  keyword: string;
  suffix: string;
}

export type BlockType = 'chapter' | 'heading' | 'paragraph' | 'dialogue' | 'scene_break';

export interface NormalizedBlock {
  id: string;
  type: BlockType;
  text: string;
  sourcePage: number;
  confidence: number;
  metadata?: {
    chapterNumber?: string;
    subtitle?: string;
    isIndented?: boolean;
    speakerHint?: string;
    isContinuationFromPrevPage?: boolean;
  };
}

export interface ReflowQualityReport {
  overallConfidence: number; // 0 - 100
  paragraphDetection: number; // 0 - 100
  dialogueDetection: number; // 0 - 100
  chapterDetection: number; // 0 - 100
  hyphenationFixedCount: number;
  headersFootersFilteredCount: number;
  isScanLikely: boolean;
}

export interface SmartReflowPageResult {
  pageNumber: number;
  blocks: NormalizedBlock[];
  rawLineCount: number;
  quality: ReflowQualityReport;
  pageEnding?: {
    lastLineText: string;
    endsWithTerminal: boolean;
    endsWithHyphen: boolean;
    wasChapterHeading: boolean;
  };
}

