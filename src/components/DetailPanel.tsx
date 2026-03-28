'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ExternalLink, X, ChevronRight, FileText } from 'lucide-react';

interface DetailPanelProps {
  item: Record<string, unknown> | null;
  type: string;
  onClose: () => void;
  onNavigate?: (type: string, item: Record<string, unknown>) => void;
}

function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token for English/code
  return Math.round(text.length / 4);
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/50 border border-border">
      <span className="text-[10px] text-muted-foreground uppercase">{label}</span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}

function SubItemPill({
  label,
  color,
  onClick,
}: {
  label: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full transition-all duration-150 hover:opacity-80 hover:scale-[1.02] ${color}`}
    >
      {label}
      {onClick && <ChevronRight className="w-2.5 h-2.5" />}
    </button>
  );
}

export default function DetailPanel({ item, type, onClose, onNavigate }: DetailPanelProps) {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [showRawConfig, setShowRawConfig] = useState(false);

  useEffect(() => {
    if (!item) {
      setFileContent(null);
      setShowRawConfig(false);
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

  const name = (item?.name as string) || 'Unknown';
  const scope = item?.scope as string;
  const description = item?.description as string | undefined;

  // Compute stats from file content
  const lineCount = fileContent ? fileContent.split('\n').length : null;
  const tokenCount = fileContent ? estimateTokens(fileContent) : null;

  // Plugin sub-items
  const pluginSkills = (item?.skills as string[]) || [];
  const pluginHooks = (item?.hooks as string[]) || [];
  const pluginAgents = (item?.agents as string[]) || [];
  const pluginCommands = (item?.commands as string[]) || [];
  const pluginMcpServers = (item?.mcpServers as string[]) || [];
  const isPlugin = type === 'plugin';

  // MCP server config
  const isMcpServer = type === 'mcpServer';
  const serverConfig = item?.config as Record<string, unknown> | undefined;

  const subSections = isPlugin
    ? [
        { label: 'Skills', items: pluginSkills, color: 'bg-pink-50 text-pink-600', type: 'skill' },
        { label: 'Hooks', items: pluginHooks, color: 'bg-amber-50 text-amber-600', type: 'hook' },
        { label: 'Agents', items: pluginAgents, color: 'bg-indigo-50 text-indigo-600', type: 'agent' },
        { label: 'Commands', items: pluginCommands, color: 'bg-cyan-50 text-cyan-600', type: 'command' },
        { label: 'MCP Servers', items: pluginMcpServers, color: 'bg-green-50 text-green-600', type: 'mcpServer' },
      ]
    : [];

  return (
    <Sheet open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right">
        <SheetHeader>
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0 w-7 h-7">
              <X className="w-4 h-4" />
            </Button>
            <SheetTitle>{name}</SheetTitle>
          </div>
          <Button variant="outline" size="sm" onClick={handleOpenInFinder} className="flex-shrink-0 gap-1.5">
            <ExternalLink className="w-3 h-3" />
            Open in Finder
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Header info */}
          <div className="px-5 py-4 border-b border-border space-y-3">
            {/* Scope + Type badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                  scope === 'global'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-100'
                    : scope === 'local'
                      ? 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-100'
                      : 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-100'
                }`}
              >
                {scope}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-secondary text-muted-foreground">
                {type}
              </span>
              {!!item?.source && (
                <span className="text-[10px] text-muted-foreground">
                  from {String(item.source)}
                </span>
              )}
            </div>

            {/* Description */}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}

            {/* Stats */}
            {(lineCount !== null || tokenCount !== null) && (
              <div className="flex items-center gap-2 flex-wrap">
                {lineCount !== null && <StatBadge label="Lines" value={formatNumber(lineCount)} />}
                {tokenCount !== null && <StatBadge label="~Tokens" value={formatNumber(tokenCount)} />}
              </div>
            )}

            {/* File path */}
            {!!(item?.filePath || item?.installPath || item?.path) && (
              <div className="text-[11px] font-mono text-muted-foreground break-all">
                {String(item.filePath || item.installPath || item.path)}
              </div>
            )}
          </div>

          {/* MCP Server details */}
          {isMcpServer && serverConfig && (
            <div className="px-5 py-4 border-b border-border space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Server Configuration
              </h3>
              <div className="space-y-1.5">
                {!!serverConfig.type && (
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Type</span>
                    <span className="text-sm font-mono text-foreground">{String(serverConfig.type)}</span>
                  </div>
                )}
                {!!serverConfig.command && (
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Command</span>
                    <span className="text-sm font-mono text-foreground break-all">{String(serverConfig.command)}</span>
                  </div>
                )}
                {!!serverConfig.args && Array.isArray(serverConfig.args) && (
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Args</span>
                    <span className="text-sm font-mono text-foreground break-all">{(serverConfig.args as string[]).join(' ')}</span>
                  </div>
                )}
                {!!serverConfig.url && (
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">URL</span>
                    <span className="text-sm font-mono text-foreground break-all">{String(serverConfig.url)}</span>
                  </div>
                )}
                {!!serverConfig.env && typeof serverConfig.env === 'object' && (
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Env</span>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(serverConfig.env as Record<string, unknown>).map((key) => (
                        <span key={key} className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-foreground font-mono">
                          {key}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Plugin contributions */}
          {isPlugin && subSections.some(s => s.items.length > 0) && (
            <div className="px-5 py-4 border-b border-border space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Contributes
              </h3>
              {subSections
                .filter((s) => s.items.length > 0)
                .map((section) => (
                  <div key={section.label}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {section.label} ({section.items.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {section.items.map((subItem) => (
                        <SubItemPill
                          key={subItem}
                          label={subItem}
                          color={section.color}
                          onClick={
                            onNavigate
                              ? () => onNavigate(section.type, { name: subItem, type: section.type })
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* File Content - prominent, shown first */}
          {loadingFile && (
            <div className="px-5 py-8 text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading file content...
              </div>
            </div>
          )}
          {fileContent && !loadingFile && (
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  File Content
                </h3>
              </div>
              <div className="bg-accent/50 border border-border rounded-lg p-3 overflow-auto">
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
                  {fileContent}
                </pre>
              </div>
            </div>
          )}

          {/* Raw Config - collapsed by default */}
          <div className="px-5 py-4">
            <button
              onClick={() => setShowRawConfig(!showRawConfig)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight
                className={`w-3 h-3 transition-transform duration-150 ${showRawConfig ? 'rotate-90' : ''}`}
              />
              <span className="font-semibold uppercase tracking-wider">Raw Config</span>
            </button>
            {showRawConfig && (
              <div className="mt-2 bg-accent/50 border border-border rounded-lg p-3 overflow-x-auto">
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
                  {JSON.stringify(item, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
