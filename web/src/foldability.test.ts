import { describe, it, expect } from "vitest";
import {
  analyze,
  checkKawasaki,
  checkMaekawa,
  normalizeDeg,
  sectorAngles,
  type Crease,
} from "./foldability";

// Build creases from sector angles (mirrors the Python from_sectors helper).
function fromSectors(sectors: number[], assignments?: Assignment[]): Crease[] {
  const total = sectors.reduce((a, b) => a + b, 0);
  if (Math.abs(total - 360) > 1e-6) throw new Error(`sectors must sum to 360, got ${total}`);
  const creases: Crease[] = [];
  let a = 0;
  for (let i = 0; i < sectors.length; i++) {
    creases.push({ angle: a, assignment: assignments ? assignments[i] : null });
    a += sectors[i];
  }
  return creases;
}
type Assignment = "M" | "V" | null;

describe("Kawasaki", () => {
  it("four equal sectors pass", () => {
    const r = checkKawasaki(fromSectors([90, 90, 90, 90]));
    expect(r.ok).toBe(true);
    expect(r.alternatingSum).toBeCloseTo(0);
  });

  it("odd number of creases fails", () => {
    expect(checkKawasaki(fromSectors([120, 120, 120])).ok).toBe(false);
  });

  it("unequal alternating sectors fail", () => {
    const r = checkKawasaki(fromSectors([60, 120, 60, 120]));
    expect(r.ok).toBe(false);
    expect(r.alternatingSum).toBeCloseTo(-120);
  });

  it("classic foldable six-crease passes", () => {
    expect(checkKawasaki(fromSectors([30, 60, 90, 90, 60, 30])).ok).toBe(true);
  });

  it("is rotation invariant", () => {
    const base = [40, 50, 80, 60, 90, 40];
    const a = fromSectors(base).map((c) => ({ ...c, angle: c.angle + 37 }));
    expect(checkKawasaki(a).ok).toBe(checkKawasaki(fromSectors(base)).ok);
  });
});

describe("Maekawa", () => {
  it("skipped without assignment", () => {
    expect(checkMaekawa(fromSectors([90, 90, 90, 90]))).toBeNull();
  });
  it("holds for MMMV", () => {
    expect(checkMaekawa(fromSectors([90, 90, 90, 90], ["M", "M", "M", "V"]))).toBe(true);
  });
  it("fails for MVMV", () => {
    expect(checkMaekawa(fromSectors([90, 90, 90, 90], ["M", "V", "M", "V"]))).toBe(false);
  });
  it("partial assignment is null", () => {
    expect(checkMaekawa(fromSectors([90, 90, 90, 90], ["M", "M", null, "V"]))).toBeNull();
  });
});

describe("analyze", () => {
  it("foldable with angles only", () => {
    const r = analyze(fromSectors([90, 90, 90, 90]));
    expect(r.flatFoldable).toBe(true);
    expect(r.maekawa).toBeNull();
  });
  it("Kawasaki pass but Maekawa fail is not foldable", () => {
    const r = analyze(fromSectors([90, 90, 90, 90], ["M", "V", "M", "V"]));
    expect(r.kawasaki).toBe(true);
    expect(r.maekawa).toBe(false);
    expect(r.flatFoldable).toBe(false);
  });
  it("full foldable", () => {
    const r = analyze(fromSectors([90, 90, 90, 90], ["M", "M", "M", "V"]));
    expect(r.flatFoldable).toBe(true);
  });
});

describe("helpers", () => {
  it("normalizeDeg wraps", () => {
    expect(normalizeDeg(-90)).toBeCloseTo(270);
    expect(normalizeDeg(450)).toBeCloseTo(90);
  });
  it("sectors sum to 360", () => {
    const s = sectorAngles(fromSectors([40, 50, 80, 60, 90, 40]));
    expect(s.reduce((a, b) => a + b, 0)).toBeCloseTo(360);
  });
  it("duplicate direction throws", () => {
    expect(() => sectorAngles([{ angle: 0, assignment: null }, { angle: 0, assignment: null }])).toThrow();
  });
});
