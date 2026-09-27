import React from 'react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <aside
      aria-label="Offline status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-stone-800/90 text-stone-200 border border-stone-700/80 px-3 py-1.5 text-xs font-mono shadow-md backdrop-blur-xs transition"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>Offline Mode — Stored locally</span>
    </aside>
  );
};
