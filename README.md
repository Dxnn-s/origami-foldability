# origami-foldability

A flat-foldability analyzer for origami crease patterns.

**P1 (current):** single-vertex flat-foldability via the two classical theorems.

- **Kawasaki's theorem** - even crease count and zero alternating sum of sector angles (odd-index sectors and even-index sectors each total 180°).
- **Maekawa's theorem** - for a given mountain/valley assignment, |M − V| = 2.

The analyzer returns a verdict plus human-readable reasons explaining *which*
condition passed or failed - built so a forthcoming interactive simulator (P2)
and the accompanying writeup can surface the "why."

## Scope and honesty about the boundary

Single-vertex flat-foldability is tractable. **Global, multi-vertex flat-foldability
is NP-hard** (Bern & Hayes, 1996), so this project deliberately stops at:

1. single-vertex Kawasaki + Maekawa (P1, done),
2. local layer-ordering / big-little-big lemma (P3, planned).

P1 verdicts report *necessary* conditions; they do not yet certify a valid layer
ordering, so a `flat_foldable=True` result means "satisfies Kawasaki (and Maekawa
if an MV assignment is given)," not "proven foldable."

## Usage

```python
from origami import SingleVertex, analyze_single_vertex

# A vertex described by its sector angles (must sum to 360).
v = SingleVertex.from_sectors([90, 90, 90, 90], assignments=["M", "M", "M", "V"])
result = analyze_single_vertex(v)

print(result.flat_foldable)   # True
for line in result.reasons:
    print(line)
```

You can also build from 2D crease endpoints:

```python
v = SingleVertex.from_points([(1, 0), (0, 1), (-1, 0), (0, -1)])
```

## Develop

```bash
python -m pytest        # run the suite (pythonpath=src is configured in pyproject)
```

## Interactive web app (`web/`)

A static React + TypeScript app: build a single-vertex crease pattern by clicking,
assign mountain/valley folds, and see the Kawasaki/Maekawa verdict live with
human-readable reasons. The foldability core is re-implemented in TypeScript and
its test suite mirrors the Python one, so the two implementations agree on every
verdict (a cross-validation point for the writeup).

```bash
cd web
npm install
npm run dev      # local dev server
npm test         # vitest unit tests (15)
npm run build    # static production build -> web/dist (deployable to Vercel / GH Pages)
```

## Roadmap

- [x] **P1** - single-vertex Kawasaki + Maekawa + tests (Python reference)
- [x] **P2** - interactive crease-pattern analyzer (React + TS, static deploy)
- [x] **P2b** - 3D fold animation (Three.js / react-three-fiber): an accordion hinge-chain that pleats the sectors along the user's creases, mountain/valley driving fold direction. Illustrative fold - a *certified* layer ordering (needs P3) is still future work, and the UI says so.
- [ ] **P3** - local layer ordering (big-little-big lemma); empirical study over generated patterns
- [ ] **P4** - writeup + release polish

## References

- T. Kawasaki, "On the relation between mountain-creases and valley-creases of a flat origami" (1989).
- J. Maekawa, via T. Hull, "The combinatorics of flat folds: a survey."
- M. Bern, B. Hayes, "The complexity of flat origami" (SODA 1996) - global flat-foldability is NP-hard.
- E. Demaine, J. O'Rourke, *Geometric Folding Algorithms* (2007).
