"""Single-vertex flat-foldability checks.

Implements the two classical necessary conditions:

Kawasaki's theorem
    A single interior vertex is flat-foldable (an MV assignment exists that folds
    flat) iff it has an even number of creases AND the alternating sum of its
    consecutive sector angles is zero, equivalently the sum of the odd-indexed
    sectors equals the sum of the even-indexed sectors equals 180 degrees.
    The zero-alternating-sum condition is independent of which sector you start
    from for an even number of sectors.

Maekawa's theorem
    For any flat folding of a single interior vertex, |M - V| = 2, where M and V
    are the counts of mountain and valley creases. This constrains a *given* MV
    assignment; it requires the assignment to be complete to evaluate.

Scope note: a valid local layer ordering (the big-little-big lemma and related
conditions) is NOT checked here. That is P3. So `flat_foldable` here means
"satisfies Kawasaki, and Maekawa if an MV assignment is supplied" — necessary,
not yet fully sufficient.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from .crease_pattern import SingleVertex

_DEG_TOL = 1e-6


@dataclass
class VertexFoldability:
    """Result of analyzing a single vertex."""

    flat_foldable: bool
    kawasaki: bool
    maekawa: Optional[bool]  # None when no/partial MV assignment
    sector_angles: list[float]
    alternating_sum: float
    reasons: list[str] = field(default_factory=list)


def check_kawasaki(vertex: SingleVertex, tol: float = _DEG_TOL) -> tuple[bool, float]:
    """Return (passes, alternating_sum). Requires an even number of creases."""
    sectors = vertex.sector_angles()
    if len(sectors) % 2 != 0:
        # Odd number of creases can never flat-fold at a single vertex.
        alt = sum(sectors[0::2]) - sum(sectors[1::2])
        return False, alt
    alt = sum(sectors[0::2]) - sum(sectors[1::2])
    return abs(alt) <= tol, alt


def check_maekawa(vertex: SingleVertex) -> Optional[bool]:
    """Return whether |M - V| == 2 for a fully-assigned vertex, else None."""
    assigns = vertex.assignments()
    if any(a is None for a in assigns):
        return None
    m = assigns.count("M")
    v = assigns.count("V")
    return abs(m - v) == 2


def analyze_single_vertex(vertex: SingleVertex, tol: float = _DEG_TOL) -> VertexFoldability:
    """Run both theorems and produce an explained verdict."""
    sectors = vertex.sector_angles()
    reasons: list[str] = []

    kawasaki, alt = check_kawasaki(vertex, tol)
    if len(sectors) % 2 != 0:
        reasons.append(
            f"Kawasaki FAILS: {len(sectors)} creases is odd; a flat-foldable single "
            f"vertex must have an even number of creases."
        )
    elif kawasaki:
        reasons.append(
            f"Kawasaki HOLDS: alternating sum of sectors = {alt:.6g} deg (= 0); "
            f"odd-index sectors sum to {sum(sectors[0::2]):.6g}, even-index to "
            f"{sum(sectors[1::2]):.6g} (each should be 180)."
        )
    else:
        reasons.append(
            f"Kawasaki FAILS: alternating sum of sectors = {alt:.6g} deg (should be 0)."
        )

    maekawa = check_maekawa(vertex)
    if maekawa is None:
        reasons.append("Maekawa SKIPPED: no complete mountain/valley assignment supplied.")
    else:
        m = vertex.assignments().count("M")
        v = vertex.assignments().count("V")
        if maekawa:
            reasons.append(f"Maekawa HOLDS: |M - V| = |{m} - {v}| = 2.")
        else:
            reasons.append(f"Maekawa FAILS: |M - V| = |{m} - {v}| = {abs(m - v)} (should be 2).")

    flat_foldable = kawasaki and (maekawa is not False)
    if flat_foldable:
        reasons.append(
            "VERDICT: necessary conditions satisfied. NOTE: layer-ordering "
            "(big-little-big) not yet checked — P1 does not certify sufficiency."
        )
    else:
        reasons.append("VERDICT: not flat-foldable (a necessary condition failed).")

    return VertexFoldability(
        flat_foldable=flat_foldable,
        kawasaki=kawasaki,
        maekawa=maekawa,
        sector_angles=sectors,
        alternating_sum=alt,
        reasons=reasons,
    )
