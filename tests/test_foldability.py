"""Tests for single-vertex flat-foldability (Kawasaki + Maekawa)."""

import math

import pytest

from origami import (
    Crease,
    SingleVertex,
    analyze_single_vertex,
    check_kawasaki,
    check_maekawa,
)


# --- Kawasaki -------------------------------------------------------------

def test_four_equal_sectors_passes_kawasaki():
    v = SingleVertex.from_sectors([90, 90, 90, 90])
    ok, alt = check_kawasaki(v)
    assert ok
    assert alt == pytest.approx(0.0)


def test_odd_number_of_creases_fails():
    v = SingleVertex.from_sectors([120, 120, 120])  # 3 creases
    ok, _ = check_kawasaki(v)
    assert not ok


def test_unequal_alternating_sectors_fails():
    v = SingleVertex.from_sectors([60, 120, 60, 120])
    ok, alt = check_kawasaki(v)
    assert not ok
    assert alt == pytest.approx(-120.0)


def test_classic_flat_foldable_six_crease():
    # odd-index sectors (30+90+60) = 180, even-index (60+90+30) = 180
    v = SingleVertex.from_sectors([30, 60, 90, 90, 60, 30])
    ok, alt = check_kawasaki(v)
    assert ok
    assert alt == pytest.approx(0.0)


def test_degenerate_two_collinear_creases():
    v = SingleVertex.from_sectors([180, 180])
    ok, _ = check_kawasaki(v)
    assert ok


def test_kawasaki_is_rotation_invariant():
    base = [40, 50, 80, 60, 90, 40]
    assert sum(base) == 360
    v0 = SingleVertex.from_sectors(base, start_angle=0)
    v1 = SingleVertex.from_sectors(base, start_angle=37)  # rotate whole pattern
    assert check_kawasaki(v0)[0] == check_kawasaki(v1)[0]


def test_kawasaki_independent_of_starting_sector():
    # Same cyclic pattern, different first crease -> same verdict.
    v_a = SingleVertex.from_sectors([90, 90, 90, 90])
    rotated = [c.angle + 90 for c in v_a.creases]
    v_b = SingleVertex(tuple(Crease(a) for a in rotated))
    assert check_kawasaki(v_a)[0] == check_kawasaki(v_b)[0]


# --- Maekawa --------------------------------------------------------------

def test_maekawa_skipped_without_assignment():
    v = SingleVertex.from_sectors([90, 90, 90, 90])
    assert check_maekawa(v) is None


def test_maekawa_holds_for_mmmv():
    v = SingleVertex.from_sectors([90, 90, 90, 90], assignments=["M", "M", "M", "V"])
    assert check_maekawa(v) is True


def test_maekawa_fails_for_mvmv():
    v = SingleVertex.from_sectors([90, 90, 90, 90], assignments=["M", "V", "M", "V"])
    assert check_maekawa(v) is False


def test_maekawa_partial_assignment_is_none():
    v = SingleVertex.from_sectors([90, 90, 90, 90], assignments=["M", "M", None, "V"])
    assert check_maekawa(v) is None


# --- Combined verdict -----------------------------------------------------

def test_analyze_foldable_angles_only():
    r = analyze_single_vertex(SingleVertex.from_sectors([90, 90, 90, 90]))
    assert r.flat_foldable
    assert r.kawasaki
    assert r.maekawa is None


def test_analyze_kawasaki_pass_but_maekawa_fail():
    v = SingleVertex.from_sectors([90, 90, 90, 90], assignments=["M", "V", "M", "V"])
    r = analyze_single_vertex(v)
    assert r.kawasaki
    assert r.maekawa is False
    assert not r.flat_foldable


def test_analyze_full_foldable():
    v = SingleVertex.from_sectors([90, 90, 90, 90], assignments=["M", "M", "M", "V"])
    r = analyze_single_vertex(v)
    assert r.flat_foldable
    assert r.kawasaki and r.maekawa


def test_reasons_are_populated():
    r = analyze_single_vertex(SingleVertex.from_sectors([60, 120, 60, 120]))
    assert any("Kawasaki FAILS" in s for s in r.reasons)
    assert not r.flat_foldable


# --- Construction helpers + validation ------------------------------------

def test_from_points_right_angles():
    pts = [(1, 0), (0, 1), (-1, 0), (0, -1)]
    v = SingleVertex.from_points(pts)
    assert v.num_creases == 4
    assert all(s == pytest.approx(90.0) for s in v.sector_angles())


def test_duplicate_direction_raises():
    with pytest.raises(ValueError):
        SingleVertex([Crease(0), Crease(0)])


def test_too_few_creases_raises():
    with pytest.raises(ValueError):
        SingleVertex([Crease(0)])


def test_sectors_must_sum_to_360():
    with pytest.raises(ValueError):
        SingleVertex.from_sectors([90, 90, 90])


def test_bad_assignment_raises():
    with pytest.raises(ValueError):
        Crease(0, "X")


def test_sectors_sum_to_360_property():
    v = SingleVertex.from_sectors([40, 50, 80, 60, 90, 40])
    assert sum(v.sector_angles()) == pytest.approx(360.0)
