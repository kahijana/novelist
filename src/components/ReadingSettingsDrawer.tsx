import React from 'react';
import { PRESETS } from '../services/storage';
import {
  ReaderSettings,
  ReadingFont,
  ReadingMargin,
  ReadingMode,
  ReadingTheme,
} from '../types/reader';
import {
  X,
  Sliders,
  Type,
  AlignLeft,
  AlignJustify,
  Sun,
  Coffee,
  Moon,
  Sparkles,
  RotateCcw,
  BookText,
  FileText,
} from 'lucide-react';

interface ReadingSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
}

export const ReadingSettingsDrawer: React.FC<ReadingSettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const themes: { id: ReadingTheme; label: string; icon: React.ReactNode; bg: string; text: string; border: string }[] = [
    { id: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" />, bg: '#F8F7F3', text: '#252525', border: '#E2DEC9' },
    { id: 'sepia', label: 'Sepia', icon: <Coffee className="w-3.5 h-3.5" />, bg: '#F3E8D0', text: '#3B3025', border: '#DDCBA6' },
    { id: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" />, bg: '#181818', text: '#E5E5E5', border: '#333333' },
    { id: 'oled', label: 'OLED', icon: <Sparkles className="w-3.5 h-3.5" />, bg: '#000000', text: '#E5E5E5', border: '#222222' },
  ];

  const fonts: { id: ReadingFont; label: string; preview: string; fontClass: string }[] = [
    { id: 'serif', label: 'Serif', preview: 'Ag Lora Book', fontClass: 'font-reading-serif' },
    { id: 'sans', label: 'Sans', preview: 'Ag Jakarta Clean', fontClass: 'font-reading-sans' },
    { id: 'dyslexic', label: 'Dyslexic', preview: 'Ag Hyperlegible', fontClass: 'font-reading-dyslexic' },
  ];

  const applyPreset = (presetKey: 'comfortable' | 'compact' | 'large') => {
    const preset = PRESETS[presetKey];
    onUpdateSettings({
      fontSize: preset.fontSize,
      lineHeight: preset.lineHeight,
      contentWidth: preset.contentWidth,
      margin: preset.margin,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Drawer */}
      <div className="relative w-full max-w-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 border-l border-stone-200 dark:border-stone-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h2 className="text-sm font-semibold tracking-wide uppercase">Reading Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Reading Mode Switcher */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
              Reading Engine
            </label>
            <div className="grid grid-cols-2 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => onUpdateSettings({ mode: 'reflow' })}
                className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  settings.mode === 'reflow'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs font-semibold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <BookText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Reflow Ebook</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ mode: 'pdf' })}
                className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  settings.mode === 'pdf'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs font-semibold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <FileText className="w-4 h-4 text-stone-500" />
                <span>Original PDF</span>
              </button>
            </div>
            <p className="mt-1 text-[11px] text-stone-400">
              {settings.mode === 'reflow'
                ? 'Kindle-style readable text with customizable typography.'
                : 'Raw PDF page view, preserving original layout and illustrations.'}
            </p>
          </div>

          {/* Reading Navigation Mode */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
              Navigation Mode
            </label>
            <div className="grid grid-cols-2 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => onUpdateSettings({ navigation: 'continuous' })}
                className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  settings.navigation === 'continuous'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs font-semibold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <span>Continuous Scroll</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ navigation: 'paginated' })}
                className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  settings.navigation === 'paginated'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs font-semibold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <span>Page by Page</span>
              </button>
            </div>
            <p className="mt-1 text-[11px] text-stone-400">
              {settings.navigation === 'continuous'
                ? 'Scroll vertically like a webpage with infinite smooth reading.'
                : 'Flip one page at a time with keyboard arrows or space.'}
            </p>
          </div>

          {/* Page Separation (Only visible in Continuous Scroll) */}
          {settings.navigation === 'continuous' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                Page Separation
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['show', 'minimal', 'none'] as const).map((sep) => (
                  <button
                    key={sep}
                    type="button"
                    onClick={() => onUpdateSettings({ pageSeparation: sep })}
                    className={`py-1.5 px-2 rounded-lg border capitalize transition-colors ${
                      settings.pageSeparation === sep
                        ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-medium'
                        : 'border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {sep}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-stone-400">
                {settings.pageSeparation === 'show'
                  ? 'Displays page number markers and reference dividers.'
                  : settings.pageSeparation === 'minimal'
                  ? 'Discreet spacing between pages without banners.'
                  : 'Seamless endless manuscript text without page breaks.'}
              </p>
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Reading Presets
              </label>
              <button
                onClick={() => applyPreset('comfortable')}
                className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                title="Reset to comfortable default"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('compact')}
                className="py-1.5 px-2 text-xs font-medium rounded-lg border border-stone-200 dark:border-stone-700 hover:border-amber-400 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                Compact
              </button>
              <button
                type="button"
                onClick={() => applyPreset('comfortable')}
                className="py-1.5 px-2 text-xs font-medium rounded-lg border border-amber-600 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200"
              >
                Comfortable
              </button>
              <button
                type="button"
                onClick={() => applyPreset('large')}
                className="py-1.5 px-2 text-xs font-medium rounded-lg border border-stone-200 dark:border-stone-700 hover:border-amber-400 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                Large
              </button>
            </div>
          </div>

          {/* Theme Palette */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Theme
              </label>
              <span className="text-[11px] text-stone-400 font-mono">Shortcut: T</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {themes.map((th) => {
                const isActive = settings.theme === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => onUpdateSettings({ theme: th.id })}
                    style={{ backgroundColor: th.bg, color: th.text, borderColor: th.border }}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-xs font-medium shadow-xs ${
                      isActive ? 'ring-2 ring-amber-600 ring-offset-2 dark:ring-offset-stone-900' : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    {th.icon}
                    <span>{th.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
              Font Family
            </label>
            <div className="grid grid-cols-3 gap-2">
              {fonts.map((f) => {
                const isActive = settings.fontFamily === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onUpdateSettings({ fontFamily: f.id })}
                    className={`p-2 rounded-lg border text-center transition-all ${f.fontClass} ${
                      isActive
                        ? 'border-amber-600 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                        : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <div className="text-sm font-semibold">{f.label}</div>
                    <div className="text-[11px] opacity-70 mt-0.5">Sample</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label className="font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Font Size
              </label>
              <span className="font-mono text-stone-700 dark:text-stone-300 font-medium tabular-nums">
                {settings.fontSize}px
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-serif font-medium">A</span>
              <input
                type="range"
                min={14}
                max={30}
                step={1}
                value={settings.fontSize}
                onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
                className="w-full accent-amber-700 dark:accent-amber-500 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg cursor-pointer"
              />
              <span className="text-lg font-serif font-bold">A</span>
            </div>
          </div>

          {/* Line Height */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label className="font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Line Spacing
              </label>
              <span className="font-mono text-stone-700 dark:text-stone-300 font-medium tabular-nums">
                {settings.lineHeight.toFixed(1)}×
              </span>
            </div>
            <input
              type="range"
              min={1.4}
              max={2.2}
              step={0.1}
              value={settings.lineHeight}
              onChange={(e) => onUpdateSettings({ lineHeight: Number(e.target.value) })}
              className="w-full accent-amber-700 dark:accent-amber-500 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg cursor-pointer"
            />
          </div>

          {/* Column / Page Width */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label className="font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Reading Width
              </label>
              <span className="font-mono text-stone-700 dark:text-stone-300 font-medium tabular-nums">
                {settings.contentWidth}px
              </span>
            </div>
            <input
              type="range"
              min={540}
              max={960}
              step={20}
              value={settings.contentWidth}
              onChange={(e) => onUpdateSettings({ contentWidth: Number(e.target.value) })}
              className="w-full accent-amber-700 dark:accent-amber-500 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg cursor-pointer"
            />
          </div>

          {/* Margins */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
              Page Margins
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['compact', 'comfortable', 'large'] as ReadingMargin[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onUpdateSettings({ margin: m })}
                  className={`py-1.5 px-2 rounded-lg border capitalize transition-colors ${
                    settings.margin === m
                      ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-medium'
                      : 'border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Typography Details (Alignment & PDF Inversion) */}
          <div className="space-y-3 pt-2 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-700 dark:text-stone-300">Text Alignment</span>
              <div className="flex items-center p-0.5 bg-stone-100 dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ textAlign: 'left' })}
                  className={`p-1.5 rounded transition-colors ${
                    settings.textAlign === 'left' ? 'bg-white dark:bg-stone-700 text-amber-800 shadow-xs' : 'text-stone-400'
                  }`}
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ textAlign: 'justify' })}
                  className={`p-1.5 rounded transition-colors ${
                    settings.textAlign === 'justify' ? 'bg-white dark:bg-stone-700 text-amber-800 shadow-xs' : 'text-stone-400'
                  }`}
                  title="Justify Text"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Dark Mode for PDF Canvas
              </span>
              <button
                type="button"
                onClick={() => onUpdateSettings({ pdfInvertDark: !settings.pdfInvertDark })}
                className={`w-9 h-5 rounded-full transition-colors relative ${
                  settings.pdfInvertDark ? 'bg-amber-700' : 'bg-stone-300 dark:bg-stone-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.75 ${
                    settings.pdfInvertDark ? 'left-4.5' : 'left-0.75'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-stone-700 dark:text-stone-300 block">
                  Remember Reading Position
                </span>
                <span className="text-[10px] text-stone-400 block">
                  Auto-restore exact scroll & page on reopen
                </span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ autoSavePosition: !settings.autoSavePosition })}
                className={`w-9 h-5 rounded-full transition-colors relative ${
                  settings.autoSavePosition ? 'bg-amber-700' : 'bg-stone-300 dark:bg-stone-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.75 ${
                    settings.autoSavePosition ? 'left-4.5' : 'left-0.75'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
