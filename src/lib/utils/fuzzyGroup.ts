import { distance } from 'fastest-levenshtein';
import { normalizeText, stripped, tokenize } from './normalize';
import type { NameAlias } from '../types';

const MERGE_THRESHOLD = 0.82;

function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distance(a, b) / maxLen;
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function similarity(a: string, b: string): number {
  const strippedSim = levenshteinSimilarity(stripped(a), stripped(b));
  const tokenSim = jaccardSimilarity(tokenize(a), tokenize(b));
  return Math.max(strippedSim, tokenSim);
}

class UnionFind {
  private parent = new Map<string, string>();

  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    const p = this.parent.get(x)!;
    if (p === x) return x;
    const root = this.find(p);
    this.parent.set(x, root);
    return root;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootA, rootB);
  }
}

export interface NameCluster {
  canonicalName: string;
  members: string[];
}

/**
 * Groups similar distinct names for stats purposes (query-time only, never
 * rewrites source data). `counts` picks the most-frequent name per cluster as
 * the canonical label. Persisted `aliases` always win and skip clustering.
 */
export function clusterNames(
  distinctNames: string[],
  counts: Record<string, number>,
  aliases: NameAlias[] = [],
): NameCluster[] {
  const aliasedTo = new Map<string, string>();
  for (const alias of aliases) {
    for (const name of alias.names) aliasedTo.set(name, alias.canonicalName);
  }

  const toCluster = distinctNames.filter((n) => !aliasedTo.has(n));
  const uf = new UnionFind();
  for (const name of toCluster) uf.find(name);

  for (let i = 0; i < toCluster.length; i++) {
    for (let j = i + 1; j < toCluster.length; j++) {
      if (similarity(toCluster[i], toCluster[j]) >= MERGE_THRESHOLD) {
        uf.union(toCluster[i], toCluster[j]);
      }
    }
  }

  const groups = new Map<string, string[]>();
  for (const name of toCluster) {
    const root = uf.find(name);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(name);
  }

  const clusters: NameCluster[] = [];
  for (const members of groups.values()) {
    const canonicalName = [...members].sort(
      (a, b) => (counts[b] ?? 0) - (counts[a] ?? 0),
    )[0];
    clusters.push({ canonicalName, members });
  }

  const aliasGroups = new Map<string, string[]>();
  for (const [name, canonical] of aliasedTo) {
    if (!aliasGroups.has(canonical)) aliasGroups.set(canonical, []);
    aliasGroups.get(canonical)!.push(name);
  }
  for (const [canonicalName, members] of aliasGroups) {
    clusters.push({ canonicalName, members });
  }

  return clusters;
}

/** Resolves a single expense name to its display label given known clusters. */
export function canonicalNameFor(name: string, clusters: NameCluster[]): string {
  const cluster = clusters.find((c) => c.members.includes(name));
  return cluster ? cluster.canonicalName : name;
}
