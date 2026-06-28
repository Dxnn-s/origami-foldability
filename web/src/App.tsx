import { useEffect, useMemo, useState } from "react";
import { analyze, normalizeDeg, sortedCreases, type Assignment, type Crease } from "./foldability";

const SIZE = 380;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 150;

// math angle (deg, CCW from +x) -> screen coords (SVG y points down).
function toXY(angleDeg: number, radius = R): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY - radius * Math.sin(rad)];
}

// Wedge polygon from a0 to a1 (a1 > a0), sampled along the arc.
function wedgePath(a0: number, a1: number): string {
  const steps = Math.max(2, Math.ceil((a1 - a0) / 4));
  const pts: string[] = [`${CX},${CY}`];
  for (let k = 0; k <= steps; k++) {
    const [x, y] = toXY(a0 + ((a1 - a0) * k) / steps);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return "M " + pts.join(" L ") + " Z";
}

const PRESETS: { label: string; creases: Crease[] }[] = [
  {
    label: "Square (MMMV)",
    creases: [
      { angle: 0, assignment: "M" },
      { angle: 90, assignment: "M" },
      { angle: 180, assignment: "M" },
      { angle: 270, assignment: "V" },
    ],
  },
  {
    label: "Square (MVMV — Maekawa fails)",
    creases: [
      { angle: 0, assignment: "M" },
      { angle: 90, assignment: "V" },
      { angle: 180, assignment: "M" },
      { angle: 270, assignment: "V" },
    ],
  },
  {
    label: "6-crease foldable",
    creases: [0, 30, 90, 180, 270, 330].map((a) => ({ angle: a, assignment: null })),
  },
  {
    label: "Not Kawasaki",
    creases: [0, 60, 180, 240].map((a) => ({ angle: a, assignment: null })),
  },
];

type HighlightTarget = "pattern" | "verdict" | "creases" | null;

const TOUR_STEPS: {
  title: string;
  body: string;
  preset?: Crease[];
  highlight?: HighlightTarget;
}[] = [
  {
    title: "Welcome",
    body: "This tool checks whether a single-vertex origami crease pattern can fold flat. Six quick steps and you will know how to drive it.",
  },
  {
    title: "The vertex and its creases",
    body: "Every line runs from the center vertex out to the edge: that is a crease. The angle between two neighboring creases is a sector (labeled in degrees). Here is a simple 4-crease square.",
    preset: PRESETS[0].creases,
    highlight: "pattern",
  },
  {
    title: "Kawasaki's theorem",
    body: "A vertex can fold flat only if it has an even number of creases AND the alternating sum of sectors is zero (odd-position and even-position sectors each total 180 degrees). Watch the Kawasaki chip in the verdict.",
    highlight: "verdict",
  },
  {
    title: "When Kawasaki fails",
    body: "These sectors do not alternate to zero, so Kawasaki fails: this vertex cannot fold flat no matter how you fold it. The verdict explains exactly why.",
    preset: PRESETS[3].creases,
    highlight: "verdict",
  },
  {
    title: "Add your own crease",
    body: "Click anywhere on the disc to add a crease (angles snap to 1 degree). Try adding one or two now: the verdict updates instantly.",
    highlight: "pattern",
  },
  {
    title: "Mountain / Valley and Maekawa",
    body: "Click a crease dot to cycle Mountain to Valley to unassigned, or use the M/V buttons in the list. Maekawa's theorem says a flat-foldable vertex needs |M - V| = 2. This MVMV square PASSES Kawasaki but FAILS Maekawa: a subtle non-foldable case.",
    preset: PRESETS[1].creases,
    highlight: "creases",
  },
  {
    title: "Read the verdict",
    body: "The verdict combines both theorems and spells out the reasoning. Green means the necessary conditions hold (layer ordering is future work, see Scope). That's it: explore freely.",
    highlight: "verdict",
  },
];

const STYLE_FOR: Record<"M" | "V" | "null", { stroke: string; width: number; dash?: string }> = {
  M: { stroke: "var(--mountain)", width: 3 },
  V: { stroke: "var(--valley)", width: 2.5, dash: "7 5" },
  null: { stroke: "var(--unassigned)", width: 1.8, dash: "2 4" },
};

function cycle(a: Assignment): Assignment {
  return a === null ? "M" : a === "M" ? "V" : null;
}

export function App() {
  const [creases, setCreases] = useState<Crease[]>(PRESETS[0].creases);
  const [tourStep, setTourStep] = useState<number | null>(null);

  // When a tour step carries a preset, load it on entering that step.
  useEffect(() => {
    if (tourStep === null) return;
    const preset = TOUR_STEPS[tourStep].preset;
    if (preset) setCreases(preset);
  }, [tourStep]);

  const tourHighlight: HighlightTarget = tourStep !== null ? TOUR_STEPS[tourStep].highlight ?? null : null;

  const result = useMemo(() => {
    try {
      return analyze(creases);
    } catch {
      return null;
    }
  }, [creases]);

  const ordered = useMemo(() => {
    try {
      return sortedCreases(creases);
    } catch {
      return creases;
    }
  }, [creases]);

  function addAtAngle(angleDeg: number) {
    const a = normalizeDeg(Math.round(angleDeg));
    if (creases.some((c) => Math.abs(normalizeDeg(c.angle) - a) < 5)) return; // avoid near-duplicates
    setCreases((prev) => [...prev, { angle: a, assignment: null }]);
  }

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * SIZE - CX;
    const y = CY - ((e.clientY - rect.top) / rect.height) * SIZE;
    if (Math.hypot(x, y) < 18) return; // ignore clicks on the vertex itself
    addAtAngle((Math.atan2(y, x) * 180) / Math.PI);
  }

  function updateAngle(i: number, value: number) {
    setCreases((prev) => prev.map((c, j) => (j === i ? { ...c, angle: normalizeDeg(value) } : c)));
  }
  function setAssignment(i: number, a: Assignment) {
    setCreases((prev) => prev.map((c, j) => (j === i ? { ...c, assignment: a } : c)));
  }
  function remove(i: number) {
    setCreases((prev) => prev.filter((_, j) => j !== i));
  }

  // Sectors aligned to the sorted creases for shading + labels.
  const sortedAngles = ordered.map((c) => normalizeDeg(c.angle));
  const sectorSpans = sortedAngles.map((a, i) => {
    const next = i < sortedAngles.length - 1 ? sortedAngles[i + 1] : sortedAngles[0] + 360;
    return { a0: a, a1: next };
  });

  return (
    <div className="app">
      <header>
        <h1>Flat-Foldability Analyzer</h1>
        <p>
          Build a single-vertex crease pattern and check whether it folds flat, using Kawasaki's
          and Maekawa's theorems. Click the disc to add a crease; click a crease to cycle
          mountain / valley / unassigned.
        </p>
        <button className="tour-start" onClick={() => setTourStep(0)}>
          ▶ Guided tour
        </button>
      </header>

      <div className="layout">
        {/* ---- Pattern editor ---- */}
        <div className={`card ${tourHighlight === "pattern" ? "tour-highlight" : ""}`}>
          <h2>Crease pattern</h2>
          <svg
            className="pattern"
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            onClick={handleSvgClick}
            role="img"
            aria-label="single-vertex crease pattern editor"
          >
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border)" strokeWidth={1} />
            {sectorSpans.map((s, i) => (
              <path
                key={`wedge-${i}`}
                d={wedgePath(s.a0, s.a1)}
                fill={i % 2 === 0 ? "rgba(245,158,11,0.06)" : "rgba(34,211,238,0.05)"}
                stroke="none"
              />
            ))}
            {sectorSpans.map((s, i) => {
              const mid = (s.a0 + s.a1) / 2;
              const [lx, ly] = toXY(mid, R * 0.62);
              const span = +(s.a1 - s.a0).toFixed(1);
              return (
                <text
                  key={`lbl-${i}`}
                  x={lx}
                  y={ly}
                  fill="var(--muted)"
                  fontSize="11"
                  fontFamily="Geist Mono, monospace"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {span}&deg;
                </text>
              );
            })}
            {ordered.map((c, i) => {
              const a = normalizeDeg(c.angle);
              const [ex, ey] = toXY(a);
              const st = STYLE_FOR[c.assignment ?? "null"];
              return (
                <g key={`crease-${i}`}>
                  <line
                    x1={CX}
                    y1={CY}
                    x2={ex}
                    y2={ey}
                    stroke={st.stroke}
                    strokeWidth={st.width}
                    strokeDasharray={st.dash}
                  />
                  <circle
                    cx={ex}
                    cy={ey}
                    r={7}
                    fill="var(--surface-solid)"
                    stroke={st.stroke}
                    strokeWidth={2}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // find this crease's index in the unsorted source array
                      const srcIdx = creases.findIndex(
                        (x) => normalizeDeg(x.angle) === a && x.assignment === c.assignment,
                      );
                      if (srcIdx >= 0) setAssignment(srcIdx, cycle(c.assignment));
                    }}
                  />
                </g>
              );
            })}
            <circle cx={CX} cy={CY} r={4} fill="var(--accent)" />
          </svg>

          <div className="legend">
            <span>
              <span className="swatch" style={{ borderTopColor: "var(--mountain)" }} /> Mountain
            </span>
            <span>
              <span
                className="swatch"
                style={{ borderTopColor: "var(--valley)", borderTopStyle: "dashed" }}
              />{" "}
              Valley
            </span>
            <span>
              <span
                className="swatch"
                style={{ borderTopColor: "var(--unassigned)", borderTopStyle: "dotted" }}
              />{" "}
              Unassigned
            </span>
          </div>

          <div className="toolbar">
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => setCreases(p.creases)}>
                {p.label}
              </button>
            ))}
            <button className="ghost" onClick={() => setCreases([])}>
              clear
            </button>
          </div>
          <p className="hint">Tip: angles snap to 1&deg; on click; fine-tune any crease below.</p>
        </div>

        {/* ---- Analysis + crease list ---- */}
        <div>
          <div className={`card ${tourHighlight === "verdict" ? "tour-highlight" : ""}`}>
            <h2>Verdict</h2>
            {result && creases.length >= 2 ? (
              <>
                <div className="verdict">
                  <span className={`badge ${result.flatFoldable ? "yes" : "no"}`}>
                    {result.flatFoldable ? "FLAT-FOLDABLE" : "NOT FLAT-FOLDABLE"}
                  </span>
                  <div className="chips">
                    <span className={`chip ${result.kawasaki ? "pass" : "fail"}`}>
                      Kawasaki {result.kawasaki ? "OK" : "X"}
                    </span>
                    <span
                      className={`chip ${
                        result.maekawa === null ? "skip" : result.maekawa ? "pass" : "fail"
                      }`}
                    >
                      Maekawa {result.maekawa === null ? "—" : result.maekawa ? "OK" : "X"}
                    </span>
                    <span className="chip">alt sum {+result.alternatingSum.toFixed(3)}&deg;</span>
                  </div>
                </div>
                <ul className="reasons">
                  {result.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="hint">Add at least two creases to analyze a vertex.</p>
            )}
          </div>

          <div className={`card ${tourHighlight === "creases" ? "tour-highlight" : ""}`}>
            <h2>Creases ({ordered.length})</h2>
            {ordered.map((c, i) => {
              const srcIdx = creases.findIndex(
                (x) => normalizeDeg(x.angle) === normalizeDeg(c.angle) && x.assignment === c.assignment,
              );
              return (
                <div className="crease-row" key={`row-${i}`}>
                  <span className="idx">#{i + 1}</span>
                  <input
                    type="number"
                    value={+normalizeDeg(c.angle).toFixed(2)}
                    min={0}
                    max={359.99}
                    step={1}
                    onChange={(e) => updateAngle(srcIdx, parseFloat(e.target.value) || 0)}
                  />
                  <span className="mv-toggle">
                    <button
                      className={c.assignment === "M" ? "active-m" : ""}
                      onClick={() => setAssignment(srcIdx, c.assignment === "M" ? null : "M")}
                    >
                      M
                    </button>
                    <button
                      className={c.assignment === "V" ? "active-v" : ""}
                      onClick={() => setAssignment(srcIdx, c.assignment === "V" ? null : "V")}
                    >
                      V
                    </button>
                  </span>
                  <button className="icon-btn" onClick={() => remove(srcIdx)} aria-label="remove">
                    ✕
                  </button>
                </div>
              );
            })}
            {ordered.length === 0 && <p className="hint">No creases. Click the disc or load a preset.</p>}
          </div>

          <div className="card">
            <h2>Scope</h2>
            <p className="scope-note">
              This certifies the <strong>necessary</strong> conditions for a{" "}
              <code>single interior vertex</code>. A valid layer ordering (the big-little-big lemma)
              is not yet checked, so a positive verdict means "satisfies Kawasaki, and Maekawa if
              an assignment is given," not a proven fold. Global multi-vertex flat-foldability is{" "}
              <strong>NP-hard</strong> (Bern &amp; Hayes, 1996) and is out of scope by design.
            </p>
          </div>
        </div>
      </div>

      {tourStep !== null && (
        <div className="tour-card" role="dialog" aria-modal="false" aria-label="guided tour">
          <button className="tour-close" onClick={() => setTourStep(null)} aria-label="close tour">
            ✕
          </button>
          <h3>{TOUR_STEPS[tourStep].title}</h3>
          <p>{TOUR_STEPS[tourStep].body}</p>
          <div className="tour-dots">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                className={`dot ${i === tourStep ? "active" : ""}`}
                onClick={() => setTourStep(i)}
                aria-label={`go to step ${i + 1}`}
              />
            ))}
          </div>
          <div className="tour-nav">
            <button className="ghost" disabled={tourStep === 0} onClick={() => setTourStep(tourStep - 1)}>
              Back
            </button>
            <span className="tour-count">
              {tourStep + 1} / {TOUR_STEPS.length}
            </span>
            {tourStep < TOUR_STEPS.length - 1 ? (
              <button onClick={() => setTourStep(tourStep + 1)}>Next</button>
            ) : (
              <button onClick={() => setTourStep(null)}>Done</button>
            )}
          </div>
        </div>
      )}

      <footer>
        Reference Python implementation and tests live alongside this app. Two independent
        implementations (TS + Python) agree on every verdict.
      </footer>
    </div>
  );
}
