'use client';

import { useState } from 'react';
import type { ConfigSource } from '@/lib/types';

interface SourcesPanelProps {
  sources: ConfigSource[];
  onAddSource?: (path: string) => void;
}

const scopeColors: Record<string, string> = {
  global: 'bg-blue-50 text-blue-600 border-blue-200',
  local: 'bg-green-50 text-green-600 border-green-200',
  custom: 'bg-purple-50 text-purple-600 border-purple-200',
};

export default function SourcesPanel({ sources, onAddSource }: SourcesPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newSourcePath, setNewSourcePath] = useState('');

  const handleOpenInFinder = async (path: string) => {
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

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSourcePath.trim() && onAddSource) {
      onAddSource(newSourcePath.trim());
      setNewSourcePath('');
      setShowAddInput(false);
    }
  };

  return (
    <div className="bg-white border border-[#e5e5e5] rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[#1a1a1a] hover:bg-[#fafafa] transition-colors duration-150 rounded-lg"
      >
        <span className="flex items-center gap-2">
          <svg
            className={`w-3.5 h-3.5 text-[#999] transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Config Sources
          <span className="text-xs text-[#999] font-normal">
            {sources.filter((s) => s.found).length}/{sources.length} found
          </span>
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {sources.map((source) => (
              <div
                key={source.path}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-[#fafafa] border border-[#f0f0f0] text-sm"
              >
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded border ${scopeColors[source.scope]}`}
                >
                  {source.scope}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${source.found ? 'bg-green-500' : 'bg-gray-300'}`}
                />
                <span className="text-[#1a1a1a] font-medium truncate flex-shrink-0">
                  {source.name}
                </span>
                <span className="text-[#999] font-mono text-xs truncate min-w-0 flex-1">
                  {source.path}
                </span>
                <button
                  onClick={() => handleOpenInFinder(source.path)}
                  className="flex-shrink-0 text-[#999] hover:text-[#1a1a1a] transition-colors duration-150"
                  title="Open in Finder"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3">
            {showAddInput ? (
              <form onSubmit={handleAddSource} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Path to config file..."
                  value={newSourcePath}
                  onChange={(e) => setNewSourcePath(e.target.value)}
                  autoFocus
                  className="flex-1 h-8 px-3 text-sm bg-white border border-[#e5e5e5] rounded-md outline-none focus:border-[#999] transition-colors duration-150 placeholder:text-[#999]"
                />
                <button
                  type="submit"
                  disabled={!newSourcePath.trim()}
                  className="h-8 px-3 text-xs font-medium bg-[#1a1a1a] text-white rounded-md hover:bg-[#333] transition-colors duration-150 disabled:opacity-40"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddInput(false);
                    setNewSourcePath('');
                  }}
                  className="h-8 px-3 text-xs font-medium border border-[#e5e5e5] rounded-md hover:bg-[#fafafa] transition-colors duration-150"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowAddInput(true)}
                className="text-xs font-medium text-[#666] hover:text-[#1a1a1a] transition-colors duration-150"
              >
                + Add Source
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
