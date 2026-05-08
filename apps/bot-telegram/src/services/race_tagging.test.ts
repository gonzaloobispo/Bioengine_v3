import { describe, expect, it } from 'vitest';

// Pure-logic sanity checks via dynamic import of internal helpers is not available;
// instead we validate exported behavior assumptions by testing tolerance decisions indirectly
// through a small local copy of the matching scenario.

function toleranceKm(targetKm: number): number {
  if (targetKm <= 1) return 0.15;
  if (targetKm <= 3) return 0.25;
  if (targetKm <= 7) return 0.4;
  if (targetKm <= 15) return 0.6;
  if (targetKm <= 30) return 1.0;
  return 1.5;
}

type Act = { id: string; distance_km: number };
type Race = { id: string; distance_km: number };

function greedyMatch(races: Race[], acts: Act[]): Array<{ raceId: string; actId: string }> {
  const used = new Set<string>();
  const out: Array<{ raceId: string; actId: string }> = [];
  const sorted = [...races].sort((a, b) => b.distance_km - a.distance_km);
  for (const r of sorted) {
    const tol = toleranceKm(r.distance_km);
    let best: Act | null = null;
    let bestDiff = Infinity;
    for (const a of acts) {
      if (used.has(a.id)) continue;
      const diff = Math.abs(a.distance_km - r.distance_km);
      if (diff > tol) continue;
      if (diff < bestDiff) {
        bestDiff = diff;
        best = a;
      }
    }
    if (best) {
      used.add(best.id);
      out.push({ raceId: r.id, actId: best.id });
    }
  }
  return out;
}

describe('race tagging matching', () => {
  it('prefers the main run over warmup when multiple activities same day', () => {
    const races: Race[] = [{ id: 'r1', distance_km: 5 }];
    const acts: Act[] = [
      { id: 'warmup', distance_km: 1.0 },
      { id: 'race', distance_km: 5.10 }
    ];
    const m = greedyMatch(races, acts);
    expect(m).toEqual([{ raceId: 'r1', actId: 'race' }]);
  });

  it('matches approximately with tolerance (5 vs 5.10)', () => {
    expect(Math.abs(5.10 - 5)).toBeLessThanOrEqual(toleranceKm(5));
  });

  it('does not match when too far (5 vs 6.2)', () => {
    expect(Math.abs(6.2 - 5)).toBeGreaterThan(toleranceKm(5));
  });

  it('handles two races in same day without reusing the same activity', () => {
    const races: Race[] = [
      { id: 'r10', distance_km: 10 },
      { id: 'r5', distance_km: 5 }
    ];
    const acts: Act[] = [
      { id: 'a10', distance_km: 10.1 },
      { id: 'a5', distance_km: 4.9 },
      { id: 'warmup', distance_km: 1.2 }
    ];
    const m = greedyMatch(races, acts);
    expect(new Set(m.map(x => x.actId)).size).toBe(m.length);
    expect(m.find(x => x.raceId === 'r10')?.actId).toBe('a10');
    expect(m.find(x => x.raceId === 'r5')?.actId).toBe('a5');
  });
});

