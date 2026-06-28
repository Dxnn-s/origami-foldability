// Single-vertex flat-foldability core (TypeScript).
//
// This mirrors the Python reference implementation in ../../src/origami so the
// two agree on every verdict (a cross-validation point for the writeup).
//
//  - Kawasaki's theorem: even crease count AND zero alternating sum of sector
//    angles (odd-index sectors and even-index sectors each total 180 degrees).
//  - Maekawa's theorem: for a complete M/V assignment, |M - V| = 2.
//
// Global multi-vertex flat-foldability is NP-hard (Bern & Hayes, 1996) and is
// intentionally out of scope. Layer ordering (big-little-big) is P3.

export type Assignment = "M" | "V" | null;

export interface Crease {
  angle: number; // degrees, normalized to [0, 360)
  assignment: Assignment;
}

const DEG_TOL = 1e-6;

export function normalizeDeg(angle: number): number {
  const a = angle % 360;
  return a < 0 ? a + 360 : a;
}

/** Sort creases by direction; throws on duplicate directions. */
export function sortedCreases(creases: Crease[]): Crease[] {
  const norm = creases.map((c) => ({ ...c, angle: normalizeDeg(c.angle) }));
  const ordered = [...norm].sort((a, b) => a.angle - b.angle);
  for (let i = 1; i < ordered.length; i++) {
    if (Math.abs(ordered[i].angle - ordered[i - 1].angle) < 1e-9) {
      throw new Error(`duplicate crease direction at ${ordered[i].angle} degrees`);
    }
  }
  return ordered;
}

/** Consecutive sector angles (degrees) around the vertex; sums to 360. */
export function sectorAngles(creases: Crease[]): number[] {
  const ordered = sortedCreases(creases);
  const angles = ordered.map((c) => c.angle);
  const sectors: number[] = [];
  for (let i = 0; i < angles.length - 1; i++) sectors.push(angles[i + 1] - angles[i]);
  sectors.push(360 - angles[angles.length - 1] + angles[0]);
  return sectors;
}

export interface KawasakiResult {
  ok: boolean;
  alternatingSum: number;
}

export function checkKawasaki(creases: Crease[], tol = DEG_TOL): KawasakiResult {
  const sectors = sectorAngles(creases);
  let alt = 0;
  for (let i = 0; i < sectors.length; i++) alt += (i % 2 === 0 ? 1 : -1) * sectors[i];
  if (sectors.length % 2 !== 0) return { ok: false, alternatingSum: alt };
  return { ok: Math.abs(alt) <= tol, alternatingSum: alt };
}

/** |M - V| === 2 for a complete assignment, else null. */
export function checkMaekawa(creases: Crease[]): boolean | null {
  if (creases.some((c) => c.assignment === null)) return null;
  const m = creases.filter((c) => c.assignment === "M").length;
  const v = creases.filter((c) => c.assignment === "V").length;
  return Math.abs(m - v) === 2;
}

export interface Foldability {
  flatFoldable: boolean;
  kawasaki: boolean;
  maekawa: boolean | null;
  sectors: number[];
  alternatingSum: number;
  reasons: string[];
}

const fmt = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/\.?0+$/, "");

export function analyze(creases: Crease[], tol = DEG_TOL): Foldability {
  const sectors = sectorAngles(creases);
  const reasons: string[] = [];

  const { ok: kawasaki, alternatingSum: alt } = checkKawasaki(creases, tol);
  const oddSum = sectors.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0);
  const evenSum = sectors.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0);

  if (sectors.length % 2 !== 0) {
    reasons.push(
      `Kawasaki FAILS: ${sectors.length} creases is odd; a flat-foldable single vertex must have an even number of creases.`,
    );
  } else if (kawasaki) {
    reasons.push(
      `Kawasaki HOLDS: alternating sum = ${fmt(alt)} deg (= 0); odd-index sectors sum to ${fmt(oddSum)}, even-index to ${fmt(evenSum)} (each should be 180).`,
    );
  } else {
    reasons.push(`Kawasaki FAILS: alternating sum = ${fmt(alt)} deg (should be 0).`);
  }

  const maekawa = checkMaekawa(creases);
  if (maekawa === null) {
    reasons.push("Maekawa SKIPPED: no complete mountain/valley assignment supplied.");
  } else {
    const m = creases.filter((c) => c.assignment === "M").length;
    const v = creases.filter((c) => c.assignment === "V").length;
    reasons.push(
      maekawa
        ? `Maekawa HOLDS: |M - V| = |${m} - ${v}| = 2.`
        : `Maekawa FAILS: |M - V| = |${m} - ${v}| = ${Math.abs(m - v)} (should be 2).`,
    );
  }

  const flatFoldable = kawasaki && maekawa !== false;
  reasons.push(
    flatFoldable
      ? "VERDICT: necessary conditions satisfied. NOTE: layer ordering (big-little-big) not yet checked, so sufficiency is not certified."
      : "VERDICT: not flat-foldable (a necessary condition failed).",
  );

  return { flatFoldable, kawasaki, maekawa, sectors, alternatingSum: alt, reasons };
}
