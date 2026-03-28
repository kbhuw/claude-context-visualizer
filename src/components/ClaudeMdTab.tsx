'use client';

interface ClaudeMdTabProps {
  content: string | null;
}

export default function ClaudeMdTab({ content }: ClaudeMdTabProps) {
  if (!content) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No CLAUDE.md found for this project
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-accent/50">
        <span className="text-xs font-medium text-muted-foreground">CLAUDE.md</span>
      </div>
      <pre className="p-4 text-sm font-mono text-foreground whitespace-pre-wrap overflow-x-auto leading-relaxed">
        {content}
      </pre>
    </div>
  );
}
