import { useMemo, useRef, useState } from "react";
import { analyze, normalizeDeg, sortedCreases, type Assignment, type Crease } from "./foldability";
import { FoldCanvas } from "./fold3d";
import { Reveal, useScrollProgress } from "./scroll";

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

const PRESETS: { label: string; note: string; creases: Crease[] }[] = [
  {
    label: "Square · MMMV",
    note: "folds flat",
    creases: [
      { angle: 0, assignment: "M" },
      { angle: 90, assignment: "M" },
      { angle: 180, assignment: "M" },
      { angle: 270, assignment: "V" },
    ],
  },
  {
    label: "Square · MVMV",
    note: "Maekawa fails",
    creases: [
      { angle: 0, assignment: "M" },
      { angle: 90, assignment: "V" },
      { angle: 180, assignment: "M" },
      { angle: 270, assignment: "V" },
    ],
  },
  {
    label: "Six creases",
    note: "Kawasaki holds",
    creases: [0, 30, 90, 180, 270, 330].map((a) => ({ angle: a, assignment: null as Assignment })),
  },
  {
    label: "Off-balance",
    note: "not Kawasaki",
    creases: [0, 60, 180, 240].map((a) => ({ angle: a, assignment: null as Assignment })),
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
  const [foldPct, setFoldPct] = useState(0);
  const foldRef = useRef(0);
  const scroll = useScrollProgress();

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
  function setFold(v: number) {
    foldRef.current = v / 100;
    setFoldPct(v);
  }

  // Sectors aligned to the sorted creases for shading + labels.
  const sortedAngles = ordered.map((c) => normalizeDeg(c.angle));
  const sectorSpans = sortedAngles.map((a, i) => {
    const next = i < sortedAngles.length - 1 ? sortedAngles[i + 1] : sortedAngles[0] + 360;
    return { a0: a, a1: next };
  });

  return (
    <div className="page">
      {/* ============================ HERO ============================ */}
      <section className="hero">
        <div className="hero-canvas" style={{ transform: `translateY(${scroll * 90}px)`, opacity: 1 - scroll * 1.4 }}>
          <FoldCanvas creases={PRESETS[0].creases} auto />
        </div>
        <span className="kanji" aria-hidden>折</span>
        <div className="hero-copy">
          <p className="eyebrow">Single-vertex origami · Kawasaki × Maekawa</p>
          <h1>
            When does a<br />
            crease pattern
            <br />
            <em>fold flat?</em>
          </h1>
          <p className="lede">
            Draw creases around a point, mark the mountains and valleys, and watch two classical
            theorems decide whether the paper can collapse to a plane. The verdict is live; the fold
            is real geometry.
          </p>
          <div className="hero-actions">
            <a className="btn primary" href="#analyzer">
              Open the analyzer
            </a>
            <a className="btn ghost" href="#theory">
              How it works
            </a>
          </div>
        </div>
        <div className="scroll-cue" style={{ opacity: 1 - scroll * 6 }}>
          <span>scroll</span>
          <span className="line" />
        </div>
      </section>

      {/* ============================ THESIS ============================ */}
      <section className="strip" id="theory">
        <Reveal as="p" className="section-kicker">
          The question
        </Reveal>
        <Reveal as="h2" className="big-line" delay={80}>
          A flat fold is a promise the geometry either keeps or breaks.
        </Reveal>
        <Reveal as="p" className="section-body" delay={140}>
          Around one interior vertex, whether paper can fold flat is fully decided by two rules:
          one about the angles between creases, one about how many fold each way. This tool checks
          both, explains the reasoning line by line, and folds the result in 3D. Global,
          multi-vertex flat-foldability is a different beast entirely: it's NP-hard, and out of
          scope by design.
        </Reveal>
      </section>

      {/* ============================ THE TWO THEOREMS ============================ */}
      <section className="theorems">
        <Reveal className="theorem">
          <div className="theorem-index">01</div>
          <h3>Kawasaki's theorem</h3>
          <p>
            Sweep around the vertex and label the sectors between creases. A vertex can fold flat
            only if there's an <strong>even</strong> number of creases and the alternating sum of
            sector angles is zero: odd-position and even-position sectors each total 180°.
          </p>
          <p className="theorem-formula">α₁ − α₂ + α₃ − α₄ + ⋯ = 0°</p>
        </Reveal>
        <Reveal className="theorem" delay={120}>
          <div className="theorem-index">02</div>
          <h3>Maekawa's theorem</h3>
          <p>
            Once every crease is assigned a fold direction, count them. A flat-foldable vertex
            always has <strong>exactly two more</strong> of one kind than the other: the mountain
            and valley counts differ by two, no matter the pattern.
          </p>
          <p className="theorem-formula">| M − V | = 2</p>
        </Reveal>
      </section>

      {/* ============================ ANALYZER ============================ */}
      <section className="analyzer" id="analyzer">
        <Reveal as="p" className="section-kicker">
          The analyzer
        </Reveal>
        <Reveal as="h2" className="big-line" delay={60}>
          Build a vertex. Read the verdict. Fold it.
        </Reveal>

        <Reveal className="toolbar" delay={120}>
          {PRESETS.map((p) => (
            <button key={p.label} onClick={() => setCreases(p.creases)}>
              {p.label}
              <span className="preset-note">{p.note}</span>
            </button>
          ))}
          <button className="ghost" onClick={() => setCreases([])}>
            clear
          </button>
        </Reveal>

        <div className="studio">
          {/* ---- 2D crease editor ---- */}
          <Reveal className="card editor" delay={60}>
            <h4>Crease pattern</h4>
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
            <p className="hint">Click the disc to add a crease · click a dot to cycle M / V / none</p>
          </Reveal>

          {/* ---- 3D fold ---- */}
          <Reveal className="card fold" delay={120}>
            <h4>Live fold · 3D</h4>
            <div className="fold-stage">
              {ordered.length >= 2 ? (
                <FoldCanvas creases={creases} foldRef={foldRef} />
              ) : (
                <div className="fold-empty">Add at least two creases to fold.</div>
              )}
            </div>
            <div className="fold-control">
              <span className="fold-label">flat</span>
              <input
                type="range"
                min={0}
                max={100}
                value={foldPct}
                onChange={(e) => setFold(+e.target.value)}
                aria-label="fold amount"
              />
              <span className="fold-label">folded</span>
            </div>
            <p className="hint">
              Drag to orbit · slide to fold. Mountains and valleys pleat in opposite directions.
              This illustrates the fold; a certified layer ordering is future work (see scope).
            </p>
          </Reveal>
        </div>

        {/* ---- Verdict ---- */}
        <Reveal className="card verdict-card" delay={60}>
          <h4>Verdict</h4>
          {result && creases.length >= 2 ? (
            <>
              <div className="verdict">
                <span className={`badge ${result.flatFoldable ? "yes" : "no"}`}>
                  {result.flatFoldable ? "FLAT-FOLDABLE" : "NOT FLAT-FOLDABLE"}
                </span>
                <div className="chips">
                  <span className={`chip ${result.kawasaki ? "pass" : "fail"}`}>
                    Kawasaki {result.kawasaki ? "OK" : "✕"}
                  </span>
                  <span
                    className={`chip ${
                      result.maekawa === null ? "skip" : result.maekawa ? "pass" : "fail"
                    }`}
                  >
                    Maekawa {result.maekawa === null ? "n/a" : result.maekawa ? "OK" : "✕"}
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
        </Reveal>

        {/* ---- Crease list + scope ---- */}
        <div className="ledger">
          <Reveal className="card creases-card" delay={60}>
            <h4>Creases · {ordered.length}</h4>
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
          </Reveal>

          <Reveal className="card scope-card" delay={120}>
            <h4>Scope · honesty</h4>
            <p className="scope-note">
              This certifies the <strong>necessary</strong> conditions for a{" "}
              <code>single interior vertex</code>. A valid layer ordering (the big-little-big
              lemma) isn't checked yet, so a positive verdict means "satisfies Kawasaki, and
              Maekawa if an assignment is given", not a proven fold. Global multi-vertex
              flat-foldability is <strong>NP-hard</strong> (Bern &amp; Hayes, 1996) and is out of
              scope by design.
            </p>
          </Reveal>
        </div>
      </section>

      <footer>
        <span>折 · flat-foldability analyzer</span>
        <span className="foot-note">
          A TypeScript core and a Python reference implementation agree on every verdict. The
          same test suite runs against both.
        </span>
      </footer>
    </div>
  );
}
