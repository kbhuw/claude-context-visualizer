import { createHash } from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
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
  await mkdir(dir, { recursive: true });
  await writeFile(ENRICHMENTS_PATH, JSON.stringify(enrichments, null, 2) + '\n', 'utf-8');
}

export async function mergeEnrichments(incoming: EnrichmentMap): Promise<EnrichmentMap> {
  const existing = await loadEnrichments();
  const merged = { ...existing, ...incoming };
  await saveEnrichments(merged);
  return merged;
}
