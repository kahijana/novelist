import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['Double-click / Tap 2x', 'H'], action: 'Toggle Header & Footer (Zen distraction-free mode)' },
  { keys: ['Scroll'], action: 'Auto-hide Header & Footer while scrolling/reading' },
  { keys: ['→', 'Space'], action: 'Next page' },
  { keys: ['←', 'Shift + Space'], action: 'Previous page' },
  { keys: ['Home'], action: 'Go to beginning of novel' },
  { keys: ['End'], action: 'Go to end of novel' },
  { keys: ['T'], action: 'Cycle reading theme (Light · Sepia · Dark · OLED)' },
  { keys: ['S'], action: 'Open Reading Settings' },
  { keys: ['B'], action: 'Bookmark current page' },
  { keys: ['M'], action: 'Toggle Reflow Text / PDF Original Mode' },
  { keys: ['Ctrl', 'F'], action: 'Search within book' },
  { keys: ['Ctrl', '+'], action: 'Increase font size' },
  { keys: ['Ctrl', '-'], action: 'Decrease font size' },
  { keys: ['F11'], action: 'Toggle full screen' },
  { keys: ['Esc'], action: 'Close panel or exit full screen' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-lg bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard Shortcuts"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h2 className="text-base font-semibold tracking-tight">Desktop Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
          {SHORTCUTS.map((sc, idx) => (
            <div key={idx} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-stone-700 dark:text-stone-300 font-normal">{sc.action}</span>
              <div className="flex items-center gap-1.5">
                {sc.keys.map((k, kIdx) => (
                  <kbd
                    key={kIdx}
                    className="px-2 py-0.5 text-xs font-mono font-medium bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded shadow-xs text-stone-800 dark:text-stone-200"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 bg-stone-50 dark:bg-stone-900/50 border-t border-stone-200 dark:border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
