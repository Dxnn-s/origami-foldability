"""Crease-pattern data model for a single interior vertex.

A single-vertex pattern is a set of creases (rays) emanating from one interior
vertex. What matters for flat-foldability is the cyclic sequence of *sector
angles* between consecutive creases, plus (optionally) a mountain/valley
assignment per crease.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional, Sequence

Assignment = Optional[str]  # "M", "V", or None (unassigned)

_ANGLE_TOL = 1e-9


def _normalize_deg(angle: float) -> float:
    """Wrap an angle into [0, 360)."""
    a = math.fmod(angle, 360.0)
    return a + 360.0 if a < 0 else a


@dataclass(frozen=True)
class Crease:
    """A single crease (ray from the vertex).

    angle: direction of the crease in degrees, measured from the +x axis.
    assignment: "M" (mountain), "V" (valley), or None if unassigned.
    """

    angle: float
    assignment: Assignment = None

    def __post_init__(self) -> None:
        if self.assignment not in (None, "M", "V"):
            raise ValueError(f"assignment must be 'M', 'V', or None, got {self.assignment!r}")
        object.__setattr__(self, "angle", _normalize_deg(self.angle))


class SingleVertex:
    """An interior vertex with creases sorted by direction.

    Construct directly from creases, or via `from_sectors` / `from_points`.
    """

    def __init__(self, creases: Sequence[Crease]):
        if len(creases) < 2:
            raise ValueError("a single-vertex pattern needs at least 2 creases")
        ordered = sorted(creases, key=lambda c: c.angle)
        for a, b in zip(ordered, ordered[1:]):
            if abs(a.angle - b.angle) < _ANGLE_TOL:
                raise ValueError(f"duplicate crease direction at {a.angle} degrees")
        self.creases: list[Crease] = ordered

    @property
    def num_creases(self) -> int:
        return len(self.creases)

    def sector_angles(self) -> list[float]:
        """Consecutive sector angles (degrees) around the vertex, summing to 360."""
        angles = [c.angle for c in self.creases]
        sectors = [b - a for a, b in zip(angles, angles[1:])]
        sectors.append(360.0 - angles[-1] + angles[0])  # wrap-around sector
        return sectors

    def assignments(self) -> list[Assignment]:
        return [c.assignment for c in self.creases]

    @classmethod
    def from_sectors(
        cls,
        sectors: Sequence[float],
        assignments: Optional[Sequence[Assignment]] = None,
        start_angle: float = 0.0,
    ) -> "SingleVertex":
        """Build a vertex from sector angles. Sectors must sum to 360 degrees.

        The i-th crease bounds the start of the i-th sector.
        """
        if abs(sum(sectors) - 360.0) > 1e-6:
            raise ValueError(f"sector angles must sum to 360, got {sum(sectors)}")
        if assignments is not None and len(assignments) != len(sectors):
            raise ValueError("assignments length must match number of creases (= number of sectors)")
        creases: list[Crease] = []
        a = start_angle
        for i, sec in enumerate(sectors):
            assign = assignments[i] if assignments is not None else None
            creases.append(Crease(a, assign))
            a += sec
        return cls(creases)

    @classmethod
    def from_points(
        cls,
        points: Sequence[tuple[float, float]],
        assignments: Optional[Sequence[Assignment]] = None,
    ) -> "SingleVertex":
        """Build a vertex from 2D crease endpoints relative to the vertex at origin."""
        if assignments is not None and len(assignments) != len(points):
            raise ValueError("assignments length must match number of points")
        creases: list[Crease] = []
        for i, (x, y) in enumerate(points):
            assign = assignments[i] if assignments is not None else None
            creases.append(Crease(math.degrees(math.atan2(y, x)), assign))
        return cls(creases)

    def __repr__(self) -> str:
        return f"SingleVertex(num_creases={self.num_creases}, sectors={self.sector_angles()})"
