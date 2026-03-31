'use client';

import { useState, useEffect, useCallback } from 'react';
import { Folder, FileText, ChevronRight, ArrowUp, X, Home } from 'lucide-react';

interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface FileBrowserModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (filePath: string) => void;
  initialDir?: string;
}

export default function FileBrowserModal({ open, onClose, onSelect, initialDir }: FileBrowserModalProps) {
  const [currentDir, setCurrentDir] = useState(initialDir || '~/.claude');
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDir = useCallback(async (dir: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ls?dir=${encodeURIComponent(dir)}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setCurrentDir(data.dir);
      setEntries(data.items);
    } catch {
      setError('Failed to load directory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadDir(initialDir || '~/.claude');
    }
  }, [open, initialDir, loadDir]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const parentDir = currentDir.split('/').slice(0, -1).join('/') || '/';
  const segments = currentDir.split('/').filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-lg shadow-xl w-[480px] max-h-[60vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">Select file to include</span>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent"
          >
            <X size={16} />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border text-[12px] text-muted-foreground overflow-x-auto">
          <button
            type="button"
            onClick={() => loadDir('~')}
            className="hover:text-foreground p-0.5 rounded hover:bg-accent flex-shrink-0"
            title="Home"
          >
            <Home size={13} />
          </button>
          {segments.map((seg, i) => {
            const segPath = '/' + segments.slice(0, i + 1).join('/');
            return (
              <span key={segPath} className="flex items-center gap-1 flex-shrink-0">
                <ChevronRight size={11} className="opacity-40" />
                <button
                  type="button"
                  onClick={() => loadDir(segPath)}
                  className="hover:text-foreground hover:underline"
                >
                  {seg}
                </button>
              </span>
            );
          })}
        </div>

        {/* File list */}
        <div className="flex-1 overflow-auto py-1">
          {/* Go up */}
          <button
            type="button"
            onClick={() => loadDir(parentDir)}
            className="w-full text-left px-4 py-1.5 text-[13px] flex items-center gap-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowUp size={14} />
            <span>..</span>
          </button>

          {loading && (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">Loading...</div>
          )}

          {error && (
            <div className="px-4 py-8 text-center text-red-500 text-sm">{error}</div>
          )}

          {!loading && !error && entries.map((entry) => (
            <button
              key={entry.path}
              type="button"
              onClick={() => {
                if (entry.isDirectory) {
                  loadDir(entry.path);
                } else {
                  onSelect(entry.path);
                  onClose();
                }
              }}
              className="w-full text-left px-4 py-1.5 text-[13px] flex items-center gap-2 hover:bg-accent hover:text-foreground transition-colors text-foreground"
            >
              {entry.isDirectory ? (
                <Folder size={14} className="text-blue-500 flex-shrink-0" />
              ) : (
                <FileText size={14} className="text-muted-foreground flex-shrink-0" />
              )}
              <span className="truncate">{entry.name}</span>
              {entry.isDirectory && <ChevronRight size={12} className="ml-auto opacity-40 flex-shrink-0" />}
            </button>
          ))}

          {!loading && !error && entries.length === 0 && (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              No .md files or folders here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
