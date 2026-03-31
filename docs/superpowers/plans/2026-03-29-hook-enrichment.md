# Hook Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an agent-driven enrichment pipeline that analyzes hook source code and persists structured metadata (description, risk, context impact, origin) so the UI can surface what hooks actually do.

**Architecture:** A new `src/lib/enrichment.ts` module handles key hashing, file I/O, and merging. Two new CLI flags (`--dump-hooks`, `--write-enrichments`) expose the pipeline. The scanner merges persisted enrichments onto Hook objects at scan time. The UI renders enrichment data when available.

**Tech Stack:** Node.js/TypeScript, crypto (for hashing), existing scanner infrastructure, Tailwind CSS for UI badges.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/enrichment.ts` | Create | Key hashing, enrichment file read/write/merge |
| `src/lib/types.ts` | Modify | Add enrichment fields to Hook interface |
| `src/lib/scanner.ts` | Modify | Merge enrichments onto hooks after scanning |
| `src/cli.ts` | Modify | Add `--dump-hooks` and `--write-enrichments` flags + dispatch |
| `src/components/HooksTab.tsx` | Modify | Show enrichment badges, descriptions, info tooltip |
| `src/components/DetailPanel.tsx` | Modify | Show enrichment details in hook detail view |

---

### Task 1: Enrichment Module — Key Hashing and File I/O

**Files:**
- Create: `src/lib/enrichment.ts`

- [ ] **Step 1: Create the enrichment module with types and key hashing**

```typescript
// src/lib/enrichment.ts
import { createHash } from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import os from 'os';

export interface HookEnrichment {
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  contextImpact: 'none' | 'injects' | 'modifies';
  scope: 'global' | 'local' | 'custom';
  origin: string;
  event: string;
  matcher: string;
  command: string;
  tags: string[];
  enrichedAt: string;
}

export type EnrichmentMap = Record<string, HookEnrichment>;

const ENRICHMENTS_PATH = path.join(os.homedir(), '.claude', 'hook-enrichments.json');

export function computeHookKey(command: string, event: string, matcher: string): string {
  const input = `${command}::${event}::${matcher}`;
  return createHash('sha256').update(input).digest('hex').slice(0, 12);
}

export async function loadEnrichments(): Promise<EnrichmentMap> {
  try {
    const raw = await readFile(ENRICHMENTS_PATH, 'utf-8');
    return JSON.parse(raw) as EnrichmentMap;
  } catch {
    return {};
  }
}

export async function saveEnrichments(enrichments: EnrichmentMap): Promise<void> {
  const dir = path.dirname(ENRICHMENTS_PATH);
  // ~/.claude/ should already exist, but be safe
  const { mkdir } = await import('fs/promises');
  await mkdir(dir, { recursive: true });
  await writeFile(ENRICHMENTS_PATH, JSON.stringify(enrichments, null, 2) + '\n', 'utf-8');
}

export async function mergeEnrichments(incoming: EnrichmentMap): Promise<EnrichmentMap> {
  const existing = await loadEnrichments();
  const merged = { ...existing, ...incoming };
  await saveEnrichments(merged);
  return merged;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd <project-path> && npx tsc --noEmit src/lib/enrichment.ts 2>&1 | head -20`

Expected: No errors (or only errors about missing module resolution that bun handles).

- [ ] **Step 3: Commit**

```bash
git add src/lib/enrichment.ts
git commit -m "feat: add hook enrichment module with key hashing and file I/O"
```

---

### Task 2: Extend Hook Type with Enrichment Fields

**Files:**
- Modify: `src/lib/types.ts:44-53`

- [ ] **Step 1: Add enrichment fields to the Hook interface**

In `src/lib/types.ts`, replace the existing Hook interface (lines 44-53):

```typescript
export interface Hook {
  name: string;
  scope: 'global' | 'local' | 'custom';
  source: string;
  sourcePath?: string;
  type: string;
  command: string;
  event?: string;
  matcher?: string;
  // Enrichment fields (populated from ~/.claude/hook-enrichments.json)
  description?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  contextImpact?: 'none' | 'injects' | 'modifies';
  origin?: string;
  tags?: string[];
  enrichedAt?: string;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd <project-path> && bunx tsc --noEmit 2>&1 | head -20`

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add enrichment fields to Hook interface"
```

---

### Task 3: Scanner Merges Enrichments at Scan Time

**Files:**
- Modify: `src/lib/scanner.ts`

- [ ] **Step 1: Import enrichment utilities at the top of scanner.ts**

Add after the existing imports (around line 5):

```typescript
import { computeHookKey, loadEnrichments } from './enrichment';
```

- [ ] **Step 2: Add enrichment merging after all hooks are collected**

In `scanContext()`, after the final `allHooks` array is assembled (after the session hooks dedup block around line 770), add:

```typescript
  // Merge enrichments from ~/.claude/hook-enrichments.json
  const enrichments = await loadEnrichments();
  if (Object.keys(enrichments).length > 0) {
    for (const hook of allHooks) {
      const key = computeHookKey(hook.command, hook.event || hook.name, hook.matcher || '');
      const enrichment = enrichments[key];
      if (enrichment) {
        hook.description = enrichment.description;
        hook.riskLevel = enrichment.riskLevel;
        hook.contextImpact = enrichment.contextImpact;
        hook.origin = enrichment.origin;
        hook.tags = enrichment.tags;
        hook.enrichedAt = enrichment.enrichedAt;
      }
    }
  }
```

- [ ] **Step 3: Verify it compiles**

Run: `cd <project-path> && bunx tsc --noEmit 2>&1 | head -20`

Expected: No type errors.

- [ ] **Step 4: Test manually — scan with no enrichments file**

Run: `cd <project-path> && bun run scan -s hooks --pretty 2>&1 | head -30`

Expected: Hooks output as before, no enrichment fields present.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scanner.ts
git commit -m "feat: merge hook enrichments at scan time"
```

---

### Task 4: CLI — `--dump-hooks` Flag

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Add `dumpHooks` to CliArgs interface and parser**

In `src/cli.ts`, add to the `CliArgs` interface (around line 53):

```typescript
  dumpHooks: boolean;
```

Initialize it in `parseArgs` (around line 64):

```typescript
  dumpHooks: false,
```

Add a clause in the parsing loop (around line 90, before the positional arg check):

```typescript
    } else if (arg === '--dump-hooks') {
      args.dumpHooks = true;
```

- [ ] **Step 2: Add the dump-hooks dispatch logic**

Add a new handler block in the main dispatch section of `cli.ts` (before the default `scanContext` call, around line 451). This needs to:
1. Scan context to get hooks
2. For each hook, read its `sourcePath` file if it exists
3. Output JSON with hook metadata + inlined source code

```typescript
  if (args.dumpHooks) {
    const effectivePath = args.projectPath || process.cwd();
    const context = await scanContext(effectivePath, args.customSources);
    const { readFile } = await import('fs/promises');
    const { computeHookKey } = await import('./lib/enrichment');

    const dumpedHooks = await Promise.all(
      context.hooks.map(async (hook) => {
        let sourceCode: string | null = null;
        if (hook.sourcePath) {
          try {
            sourceCode = await readFile(hook.sourcePath, 'utf-8');
          } catch {
            sourceCode = null;
          }
        }
        return {
          key: computeHookKey(hook.command, hook.event || hook.name, hook.matcher || ''),
          event: hook.event || hook.name,
          matcher: hook.matcher || '',
          command: hook.command,
          scope: hook.scope,
          source: hook.source,
          sourcePath: hook.sourcePath || null,
          sourceCode,
        };
      }),
    );

    console.log(JSON.stringify(dumpedHooks, null, 2));
    process.exit(0);
  }
```

- [ ] **Step 3: Test the dump-hooks flag**

Run: `cd <project-path> && bun run scan --dump-hooks -p . 2>&1 | head -40`

Expected: JSON array with hook objects, each having `key`, `event`, `matcher`, `command`, `scope`, `source`, `sourcePath`, `sourceCode` fields.

- [ ] **Step 4: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add --dump-hooks CLI flag to output hooks with source code"
```

---

### Task 5: CLI — `--write-enrichments` Flag

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Add `writeEnrichments` to CliArgs and parser**

Add to `CliArgs` interface:

```typescript
  writeEnrichments: boolean;
```

Initialize in `parseArgs`:

```typescript
  writeEnrichments: false,
```

Add parser clause:

```typescript
    } else if (arg === '--write-enrichments') {
      args.writeEnrichments = true;
```

- [ ] **Step 2: Add the write-enrichments dispatch logic**

Add before the dump-hooks handler:

```typescript
  if (args.writeEnrichments) {
    const { mergeEnrichments } = await import('./lib/enrichment');

    // Read JSON from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    const input = Buffer.concat(chunks).toString('utf-8').trim();

    if (!input) {
      console.error('Error: no JSON provided on stdin');
      process.exit(1);
    }

    try {
      const incoming = JSON.parse(input);
      const merged = await mergeEnrichments(incoming);
      console.log(`Wrote ${Object.keys(incoming).length} enrichments (${Object.keys(merged).length} total)`);
      process.exit(0);
    } catch (err) {
      console.error('Error: invalid JSON on stdin', err);
      process.exit(1);
    }
  }
```

- [ ] **Step 3: Test the write-enrichments flag end-to-end**

Run:
```bash
cd <project-path>
echo '{"test123": {"description": "test hook", "riskLevel": "low", "contextImpact": "none", "scope": "global", "origin": "user", "event": "SessionStart", "matcher": "", "command": "echo test", "tags": ["test"], "enrichedAt": "2026-03-29T00:00:00Z"}}' | bun run scan --write-enrichments
```

Expected: `Wrote 1 enrichments (1 total)`

Verify the file was created:
```bash
cat ~/.claude/hook-enrichments.json
```

Clean up the test entry after verifying.

- [ ] **Step 4: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add --write-enrichments CLI flag to persist hook metadata"
```

---

### Task 6: Update Help Text

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Add new flags to the help output**

Find the `printHelp()` function in `src/cli.ts` (around line 110) and add to the flags section:

```
  --dump-hooks             Output all hooks with source code as JSON (for agent analysis)
  --write-enrichments      Read enrichment JSON from stdin, merge into ~/.claude/hook-enrichments.json
```

- [ ] **Step 2: Commit**

```bash
git add src/cli.ts
git commit -m "docs: add --dump-hooks and --write-enrichments to CLI help"
```

---

### Task 7: HooksTab UI — Show Enrichment Data and Info Tooltip

**Files:**
- Modify: `src/components/HooksTab.tsx`

- [ ] **Step 1: Add risk badge colors and enrichment display**

Replace the hook card rendering in `HooksTab.tsx`. The current card (lines 22-49) shows name, type badge, command, and source. Update it to also show description, risk badge, origin, and context impact when enrichment is present:

```tsx
{items.map((hook, i) => (
  <button
    key={`${hook.name}-${i}`}
    onClick={() => onSelectItem(hook as unknown as Record<string, unknown>)}
    className="w-full text-left bg-card border border-border rounded-lg p-4 hover:border-ring/50 transition-colors duration-150"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">{hook.name}</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-100">
            {hook.type}
          </span>
          {hook.riskLevel && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
              hook.riskLevel === 'high'
                ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-100'
                : hook.riskLevel === 'medium'
                  ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-100'
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-100'
            }`}>
              {hook.riskLevel} risk
            </span>
          )}
          {hook.contextImpact && hook.contextImpact !== 'none' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-100">
              {hook.contextImpact === 'injects' ? 'injects context' : 'modifies output'}
            </span>
          )}
        </div>
        {hook.description ? (
          <p className="text-xs text-muted-foreground mt-1">{hook.description}</p>
        ) : (
          <p className="text-xs font-mono text-muted-foreground mt-1">{hook.command}</p>
        )}
        {hook.origin && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Origin: {hook.origin}
          </p>
        )}
      </div>
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase flex-shrink-0 ${
          hook.scope === 'global'
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-100'
            : 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-100'
        }`}
      >
        {hook.scope === 'local' ? 'app' : hook.scope}
      </span>
    </div>
  </button>
))}
```

- [ ] **Step 2: Add info tooltip at the top of the tab**

Add before the hook groups in the return statement (before `{renderGroup(globalHooks, ...)}`, around line 66):

```tsx
<div className="flex items-center gap-2 mb-4 px-1">
  <div className="group relative">
    <svg className="w-4 h-4 text-muted-foreground cursor-help" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
    <div className="absolute left-0 top-6 z-50 hidden group-hover:block w-72 p-3 rounded-lg bg-popover border border-border shadow-lg text-xs text-popover-foreground">
      <p className="font-semibold mb-1">Analyze your hooks</p>
      <p className="text-muted-foreground">Ask your agent to run:</p>
      <code className="block mt-1 text-[11px] font-mono bg-muted px-2 py-1 rounded break-all">
        bun run scan --dump-hooks -p .
      </code>
      <p className="text-muted-foreground mt-1">Then pipe the analysis into:</p>
      <code className="block mt-1 text-[11px] font-mono bg-muted px-2 py-1 rounded break-all">
        bun run scan --write-enrichments
      </code>
    </div>
  </div>
  <span className="text-xs text-muted-foreground">
    {hooks.filter(h => h.enrichedAt).length}/{hooks.length} hooks analyzed
  </span>
</div>
```

- [ ] **Step 3: Verify it compiles**

Run: `cd <project-path> && bunx tsc --noEmit 2>&1 | head -20`

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/HooksTab.tsx
git commit -m "feat: show hook enrichment data and analysis tooltip in HooksTab"
```

---

### Task 8: DetailPanel — Show Enrichment in Hook Detail View

**Files:**
- Modify: `src/components/DetailPanel.tsx`

- [ ] **Step 1: Add enrichment section to hook detail**

In `DetailPanel.tsx`, inside the hook configuration section (after the existing Scope row, around line 550), add an enrichment block that shows when enrichment data exists:

```tsx
{/* Hook Enrichment */}
{(item?.description || item?.riskLevel) && (
  <div className="mt-3 pt-3 border-t border-border space-y-1.5">
    <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
      Analysis
    </h4>
    {item?.description && (
      <div className="flex items-start gap-2">
        <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Summary</span>
        <span className="text-sm text-foreground">{item.description as string}</span>
      </div>
    )}
    {item?.riskLevel && (
      <div className="flex items-start gap-2">
        <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Risk</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
          item.riskLevel === 'high'
            ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-100'
            : item.riskLevel === 'medium'
              ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-100'
              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-100'
        }`}>
          {item.riskLevel as string}
        </span>
      </div>
    )}
    {item?.contextImpact && item.contextImpact !== 'none' && (
      <div className="flex items-start gap-2">
        <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Context</span>
        <span className="text-sm text-foreground">
          {item.contextImpact === 'injects' ? 'Injects into context window' : 'Modifies tool output'}
        </span>
      </div>
    )}
    {item?.origin && (
      <div className="flex items-start gap-2">
        <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Origin</span>
        <span className="text-sm text-foreground">{item.origin as string}</span>
      </div>
    )}
    {Array.isArray(item?.tags) && (item.tags as string[]).length > 0 && (
      <div className="flex items-start gap-2">
        <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Tags</span>
        <div className="flex flex-wrap gap-1">
          {(item.tags as string[]).map((tag: string) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      </div>
    )}
    {item?.enrichedAt && (
      <div className="flex items-start gap-2">
        <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Analyzed</span>
        <span className="text-xs text-muted-foreground">
          {new Date(item.enrichedAt as string).toLocaleDateString()}
        </span>
      </div>
    )}
  </div>
)}
```

This goes inside the existing `{isHook && (...)}` block, right before the closing `</div>` of the Hook Configuration section.

- [ ] **Step 2: Verify it compiles**

Run: `cd <project-path> && bunx tsc --noEmit 2>&1 | head -20`

Expected: No type errors.

- [ ] **Step 3: Visual test — start dev server and check**

Run: `cd <project-path> && bun run dev`

Open http://localhost:3000, navigate to Hooks tab:
- Verify hooks display as before (no enrichment data yet)
- Verify the info tooltip appears on hover
- Verify the "0/N hooks analyzed" counter shows

- [ ] **Step 4: Commit**

```bash
git add src/components/DetailPanel.tsx
git commit -m "feat: show hook enrichment details in DetailPanel"
```

---

### Task 9: End-to-End Verification

- [ ] **Step 1: Run the full pipeline manually**

```bash
cd <project-path>

# Dump hooks
bun run scan --dump-hooks -p . > /tmp/hooks-dump.json

# Check the dump looks correct
cat /tmp/hooks-dump.json | head -30

# Write a manual enrichment for one hook (grab a key from the dump)
# Replace KEY with an actual key from the dump output
echo '{"KEY": {"description": "Test enrichment", "riskLevel": "low", "contextImpact": "none", "scope": "global", "origin": "user", "event": "SessionStart", "matcher": "", "command": "test", "tags": ["test"], "enrichedAt": "2026-03-29T00:00:00Z"}}' | bun run scan --write-enrichments

# Verify the enrichment file exists
cat ~/.claude/hook-enrichments.json

# Scan and verify enrichment appears on the hook
bun run scan -s hooks --pretty | head -40
```

- [ ] **Step 2: Verify in the UI**

Start the dev server, load a project, go to Hooks tab:
- The enriched hook should show description, risk badge, origin
- Click it — the detail panel should show the Analysis section
- Counter should show "1/N hooks analyzed"

- [ ] **Step 3: Clean up test enrichment**

```bash
rm ~/.claude/hook-enrichments.json
```

- [ ] **Step 4: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: final cleanup for hook enrichment feature"
```
