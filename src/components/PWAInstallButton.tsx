import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, MonitorCheck, X } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'compact' | 'drawer';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'navbar' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running in standalone PWA window, we don't show the install button
  if (isInstalled) {
    if (variant === 'drawer') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-stone-500 bg-stone-100 rounded-lg">
          <MonitorCheck className="w-3.5 h-3.5 text-stone-600" />
          <span>Installed as Desktop App</span>
        </div>
      );
    }
    return null;
  }

  // Chromium / Desktop Edge / Chrome / Android flow
  if (isInstallable) {
    if (variant === 'compact') {
      return (
        <button
          onClick={install}
          title="Install Novel Reader Desktop App"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-md transition"
        >
          <Download className="w-3.5 h-3.5 text-stone-600" />
          <span>Install App</span>
        </button>
      );
    }

    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-stone-800 px-3.5 py-1.5 text-xs font-medium text-stone-100 hover:bg-stone-900 border border-stone-700 shadow-xs transition cursor-pointer"
        title="Install Novel Reader as desktop app for full offline reading"
      >
        <Download className="w-3.5 h-3.5 text-stone-300" />
        <span>Install Desktop App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-xl bg-[#FAF8F5] p-5 shadow-xl border border-stone-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-stone-900 font-serif">Install on iPad / iPhone</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-stone-400 hover:text-stone-700 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed space-y-2">
                <span>1. Tap the <strong>Share</strong> button in Safari toolbar.</span><br />
                <span>2. Scroll down and tap <strong>Add to Home Screen</strong>.</span>
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-md bg-stone-800 py-1.5 text-xs font-medium text-stone-100 hover:bg-stone-900 transition"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback for desktop browsers when prompt is already available or manual
  return null;
};
