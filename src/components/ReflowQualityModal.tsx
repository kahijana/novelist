import React from 'react';
import { ReflowQualityReport } from '../types/reader';
import { X, Sparkles, CheckCircle2, AlertTriangle, FileText, SplitSquareVertical } from 'lucide-react';

interface ReflowQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  quality: ReflowQualityReport;
  pageNumber: number;
  onViewOriginalPdf: () => void;
}

export const ReflowQualityModal: React.FC<ReflowQualityModalProps> = ({
  isOpen,
  onClose,
  quality,
  pageNumber,
  onViewOriginalPdf,
}) => {
  if (!isOpen) return null;

  const isExcellent = quality.overallConfidence >= 90;
  const isGood = quality.overallConfidence >= 75 && quality.overallConfidence < 90;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-md bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Smart Reflow Quality Report"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h2 className="text-sm font-semibold tracking-wide uppercase">Smart Reflow Analysis</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Main Quality Score Gauge */}
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs uppercase tracking-wider text-stone-500 font-mono">
                Page {pageNumber} Fidelity
              </span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-serif font-bold text-amber-900 dark:text-amber-300 tabular-nums">
                  {quality.overallConfidence}%
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {isExcellent ? 'High Fidelity' : isGood ? 'Good Fidelity' : 'Complex Layout'}
                </span>
              </div>
            </div>

            {isExcellent ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            )}
          </div>

          {/* Breakdown Bars */}
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-stone-600 dark:text-stone-300 mb-1">
                <span>Paragraph Boundary Reconstruction</span>
                <span className="font-mono font-medium">{quality.paragraphDetection}%</span>
              </div>
              <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-700 dark:bg-amber-400 rounded-full"
                  style={{ width: `${quality.paragraphDetection}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-stone-600 dark:text-stone-300 mb-1">
                <span>Dialogue Turn Preservation</span>
                <span className="font-mono font-medium">{quality.dialogueDetection}%</span>
              </div>
              <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-700 dark:bg-amber-400 rounded-full"
                  style={{ width: `${quality.dialogueDetection}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-stone-600 dark:text-stone-300 mb-1">
                <span>Chapter & Section Heading Structure</span>
                <span className="font-mono font-medium">{quality.chapterDetection}%</span>
              </div>
              <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-700 dark:bg-amber-400 rounded-full"
                  style={{ width: `${quality.chapterDetection}%` }}
                />
              </div>
            </div>
          </div>

          {/* Statistical Highlights */}
          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30">
              <div className="text-stone-500">De-hyphenated Words</div>
              <div className="text-base font-semibold font-mono text-stone-900 dark:text-stone-100 mt-0.5">
                {quality.hyphenationFixedCount} fixed
              </div>
            </div>
            <div className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30">
              <div className="text-stone-500">Running Headers Filtered</div>
              <div className="text-base font-semibold font-mono text-stone-900 dark:text-stone-100 mt-0.5">
                {quality.headersFootersFilteredCount} removed
              </div>
            </div>
          </div>

          {/* Scanned page notice if applicable */}
          {quality.isScanLikely && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                This page appears to be a scanned image or contains little digital text. We recommend using <strong>PDF Original Mode</strong> for best fidelity.
              </span>
            </div>
          )}

          {/* Quick Action: View Original PDF */}
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <span className="text-xs text-stone-500">
              Want to cross-check?
            </span>
            <button
              onClick={() => {
                onClose();
                onViewOriginalPdf();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950 hover:bg-amber-200 dark:hover:bg-amber-900 rounded-lg transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Original PDF (Page {pageNumber})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
