'use client';

import { useState, useRef, useEffect } from 'react';
import type { ConfigSource } from '@/lib/types';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronRight } from 'lucide-react';

interface SourcesPanelProps {
  sources: ConfigSource[];
  onAddSource?: (path: string) => void;
  onSelectSource?: (source: ConfigSource) => void;
}

function SourceMenu({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpenInFinder = async () => {
    setOpen(false);
    try {
      await fetch('/api/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
    } catch {
      // silently fail
    }
  };

  const handleCopyPath = () => {
    setOpen(false);
    navigator.clipboard.writeText(path).catch(() => {});
  };

  return (
    <div className="relative flex-shrink-0" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
        title="More options"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-md py-1 min-w-[200px]">
          <div className="px-3 py-1.5 text-xs text-muted-foreground font-mono break-all border-b border-border mb-1">
            {path}
          </div>
          <button
            onClick={handleCopyPath}
            className="w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            Copy path
          </button>
          <button
            onClick={handleOpenInFinder}
            className="w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            Open in Finder
          </button>
        </div>
      )}
    </div>
  );
}

export default function SourcesPanel({ sources, onAddSource, onSelectSource }: SourcesPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newSourcePath, setNewSourcePath] = useState('');

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSourcePath.trim() && onAddSource) {
      onAddSource(newSourcePath.trim());
      setNewSourcePath('');
      setShowAddInput(false);
    }
  };

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} className="bg-card border border-border rounded-lg">
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors duration-150 rounded-lg">
          <span className="flex items-center gap-2">
            <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`} />
            Sources
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {sources.map((source) => (
              <div
                key={source.path}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-accent/50 border border-border text-sm"
              >
                <button
                  onClick={() => onSelectSource?.(source)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity duration-150 cursor-pointer"
                >
                  <Badge variant={source.scope as 'global' | 'local' | 'custom'}>
                    {source.scope === 'local' ? 'app' : source.scope}
                  </Badge>
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${source.found ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
                  />
                  <span className="text-foreground font-medium truncate flex-1 min-w-0">
                    {source.name}
                  </span>
                </button>
                <SourceMenu path={source.path} />
              </div>
            ))}
          </div>

          <div className="mt-3">
            {showAddInput ? (
              <form onSubmit={handleAddSource} className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Path to config file..."
                  value={newSourcePath}
                  onChange={(e) => setNewSourcePath(e.target.value)}
                  autoFocus
                  className="flex-1 h-8"
                />
                <Button type="submit" size="sm" disabled={!newSourcePath.trim()}>
                  Add
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddInput(false);
                    setNewSourcePath('');
                  }}
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setShowAddInput(true)}>
                + Add Source
              </Button>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
