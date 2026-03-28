'use client';

interface ClaudeMdTabProps {
  content: string | null;
}

export default function ClaudeMdTab({ content }: ClaudeMdTabProps) {
  if (!content) {
    return (
      <div className="text-center py-12 text-[#999] text-sm">
        No CLAUDE.md found for this project
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e5e5e5] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e5e5e5] bg-[#fafafa]">
        <span className="text-xs font-medium text-[#666]">CLAUDE.md</span>
      </div>
      <pre className="p-4 text-sm font-mono text-[#1a1a1a] whitespace-pre-wrap overflow-x-auto leading-relaxed">
        {content}
      </pre>
    </div>
  );
}
