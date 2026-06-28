"""origami-foldability — flat-foldability analysis for crease patterns.

P1 scope: single-vertex flat-foldability via Kawasaki's and Maekawa's theorems.
Global (multi-vertex) flat-foldability is NP-hard (Bern & Hayes, 1996) and is
intentionally out of scope here.
"""

from .crease_pattern import Crease, SingleVertex
from .foldability import (
    VertexFoldability,
    analyze_single_vertex,
    check_kawasaki,
    check_maekawa,
)

__all__ = [
    "Crease",
    "SingleVertex",
    "VertexFoldability",
    "analyze_single_vertex",
    "check_kawasaki",
    "check_maekawa",
]
