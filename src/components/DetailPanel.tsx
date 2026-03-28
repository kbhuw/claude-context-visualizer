'use client';

import { useEffect, useState } from 'react';

interface DetailPanelProps {
  item: Record<string, unknown> | null;
  type: string;
  onClose: () => void;
}

export default function DetailPanel({ item, type, onClose }: DetailPanelProps) {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  useEffect(() => {
    if (!item) {
      setFileContent(null);
      return;
    }

    const filePath =
      (item.filePath as string) ||
      (item.installPath as string) ||
      (item.path as string);

    if (filePath) {
      setLoadingFile(true);
      fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.content) setFileContent(data.content);
          else setFileContent(null);
        })
        .catch(() => setFileContent(null))
        .finally(() => setLoadingFile(false));
    } else {
      setFileContent(null);
    }
  }, [item]);

  const handleOpenInFinder = async () => {
    const filePath =
      (item?.filePath as string) ||
      (item?.installPath as string) ||
      (item?.path as string);
    if (!filePath) return;
    try {
      await fetch('/api/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      });
    } catch {
      // silently fail
    }
  };

  if (!item) return null;

  const name = (item.name as string) || 'Unknown';
  const scope = item.scope as string;
  const source = item.source as string;

  const metadataRows: [string, string | undefined][] = [
    ['Type', type],
    ['Scope', scope],
    ['Source', source],
    ['Version', item.version as string | undefined],
    ['URL', item.url as string | undefined],
    ['File Path', (item.filePath || item.installPath) as string | undefined],
    ['Marketplace', item.marketplace as string | undefined],
    ['Command', item.command as string | undefined],
    ['Hook Type', item.type as string | undefined],
    ['Description', item.description as string | undefined],
  ].filter((row): row is [string, string] => row[1] !== undefined && row[1] !== '');

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-150"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-white border-l border-[#e5e5e5] z-50 flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e5e5]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#f0f0f0] transition-colors duration-150"
            >
              <svg className="w-4 h-4 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-sm font-semibold text-[#1a1a1a] truncate">{name}</h2>
          </div>
          <button
            onClick={handleOpenInFinder}
            className="flex-shrink-0 h-7 px-3 text-xs font-medium border border-[#e5e5e5] rounded-md hover:bg-[#fafafa] transition-colors duration-150 flex items-center gap-1.5"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in Finder
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Metadata */}
          <div className="px-5 py-4 border-b border-[#e5e5e5]">
            <div className="space-y-2.5">
              {metadataRows.map(([label, value]) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-xs text-[#999] w-20 flex-shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm text-[#1a1a1a] font-mono break-all">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Config */}
          <div className="px-5 py-4">
            <h3 className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-2">
              Raw Config
            </h3>
            <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-lg p-3 overflow-x-auto">
              <pre className="text-xs font-mono text-[#1a1a1a] whitespace-pre-wrap">
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          </div>

          {/* File Content */}
          {loadingFile && (
            <div className="px-5 py-4 text-xs text-[#999]">Loading file content...</div>
          )}
          {fileContent && !loadingFile && (
            <div className="px-5 py-4 border-t border-[#e5e5e5]">
              <h3 className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-2">
                File Content
              </h3>
              <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-lg p-3 overflow-x-auto max-h-96">
                <pre className="text-xs font-mono text-[#1a1a1a] whitespace-pre-wrap">
                  {fileContent}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
