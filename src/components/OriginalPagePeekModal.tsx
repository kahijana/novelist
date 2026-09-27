import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { renderPageCanvas } from '../services/pdfEngine';
import { X, ZoomIn, ZoomOut, RotateCcw, ExternalLink, Loader2 } from 'lucide-react';

interface OriginalPagePeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  pageNumber: number;
  onSwitchToPdfMode: () => void;
}

export const OriginalPagePeekModal: React.FC<OriginalPagePeekModalProps> = ({
  isOpen,
  onClose,
  pdfDoc,
  pageNumber,
  onSwitchToPdfMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1.1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!isOpen || !pdfDoc || !canvasRef.current) return;
      setIsLoading(true);
      try {
        await renderPageCanvas(pdfDoc, pageNumber, canvasRef.current, zoom);
      } catch (err) {
        if (!cancelled) console.warn('Peek render error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [isOpen, pdfDoc, pageNumber, zoom]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div 
        className="w-full max-w-3xl h-[85vh] bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Original PDF Page Preview"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/70">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Original PDF Page {pageNumber}</span>
            <span className="text-xs text-stone-500 font-mono">Reference Layout</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs">
              <button
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
                className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-700"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] px-1 tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
                className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-700"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(1.1)}
                className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-700 ml-0.5"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => {
                onClose();
                onSwitchToPdfMode();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-800 hover:bg-amber-900 rounded-lg shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in PDF Mode</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content canvas container */}
        <div className="flex-1 overflow-auto p-6 bg-stone-100 dark:bg-stone-950 flex items-center justify-center relative">
          {isLoading && (
            <div className="absolute inset-0 bg-black/10 backdrop-blur-2xs flex items-center justify-center z-10">
              <Loader2 className="w-8 h-8 animate-spin text-amber-700" />
            </div>
          )}
          <div className="rounded-lg shadow-xl overflow-hidden border border-stone-300 dark:border-stone-800 bg-white">
            <canvas ref={canvasRef} className="block" />
          </div>
        </div>
      </div>
    </div>
  );
};
