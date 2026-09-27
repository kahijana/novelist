import React, { useState } from 'react';
import { HighlightColor } from '../types/reader';
import { Copy, MessageSquarePlus, Check } from 'lucide-react';

interface HighlightPopoverProps {
  x: number;
  y: number;
  selectedText: string;
  onHighlight: (color: HighlightColor, note?: string) => void;
  onClose: () => void;
}

const COLOR_OPTIONS: { color: HighlightColor; bgClass: string; label: string }[] = [
  { color: 'yellow', bgClass: 'bg-amber-300 hover:bg-amber-400', label: 'Yellow' },
  { color: 'green', bgClass: 'bg-emerald-300 hover:bg-emerald-400', label: 'Green' },
  { color: 'blue', bgClass: 'bg-sky-300 hover:bg-sky-400', label: 'Blue' },
  { color: 'pink', bgClass: 'bg-pink-300 hover:bg-pink-400', label: 'Pink' },
];

export const HighlightPopover: React.FC<HighlightPopoverProps> = ({
  x,
  y,
  selectedText,
  onHighlight,
  onClose,
}) => {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');
  const [selectedColor, setSelectedColor] = useState<HighlightColor>('yellow');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selectedText);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 700);
    } catch {
      // Fallback
    }
  };

  const handleApplyHighlight = (color: HighlightColor) => {
    if (showNoteInput) {
      setSelectedColor(color);
    } else {
      onHighlight(color);
      onClose();
    }
  };

  const handleSaveNote = () => {
    onHighlight(selectedColor, note.trim() || undefined);
    onClose();
  };

  return (
    <div
      className="fixed z-50 transform -translate-x-1/2 -translate-y-full mb-2 bg-stone-900 text-stone-100 dark:bg-stone-800 rounded-lg shadow-xl border border-stone-700 p-1.5 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: `${x}px`, top: `${y - 10}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 pr-1.5 border-r border-stone-700">
          {COLOR_OPTIONS.map((opt) => (
            <button
              key={opt.color}
              type="button"
              onClick={() => handleApplyHighlight(opt.color)}
              className={`w-5 h-5 rounded-full ${opt.bgClass} transition-transform active:scale-95 ${
                showNoteInput && selectedColor === opt.color ? 'ring-2 ring-white ring-offset-1 ring-offset-stone-900' : ''
              }`}
              title={`Highlight with ${opt.label}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowNoteInput(!showNoteInput)}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-stone-800 dark:hover:bg-stone-700 transition-colors ${
            showNoteInput ? 'text-amber-400 bg-stone-800' : 'text-stone-300'
          }`}
          title="Add Note to highlight"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          <span className="text-[11px]">Note</span>
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs text-stone-300 rounded hover:bg-stone-800 dark:hover:bg-stone-700 transition-colors"
          title="Copy selected text"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {showNoteInput && (
        <div className="pt-1 border-t border-stone-700 flex flex-col gap-1.5">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add note or thought..."
            rows={2}
            className="w-56 p-1.5 text-xs bg-stone-950 text-stone-100 rounded border border-stone-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
            autoFocus
          />
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setShowNoteInput(false)}
              className="px-2 py-0.5 text-[11px] text-stone-400 hover:text-stone-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              className="px-2.5 py-0.5 text-[11px] font-medium bg-amber-600 hover:bg-amber-500 text-white rounded"
            >
              Save Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
