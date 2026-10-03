"""
The exact pre-checks: contracts/precheck.py against the shared cases, the
contract's copy against precheck.py, and the editor's port against the same
cases, so the live checks a translator sees are the ones submit() runs.
"""

from __future__ import annotations

import importlib.util
import json
import shutil
import subprocess
import sys

import pytest

from harness import ROOT, World, load
import genvm_double as D

CASES = json.loads((ROOT / "tests" / "precheck_cases.json").read_text(encoding="utf-8"))


def _module():
    spec = importlib.util.spec_from_file_location("precheck_source", ROOT / "contracts" / "precheck.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


PRE = _module()


@pytest.mark.parametrize("case", CASES, ids=[c["name"] for c in CASES])
def test_the_source_of_truth_gives_the_recorded_answer(case):
    assert PRE.precheck(case["source"], case["translation"]) == case["problems"]


@pytest.mark.parametrize("case", CASES, ids=[c["name"] for c in CASES])
def test_the_contract_gives_the_same_answer(case):
    mod = load(D.GL())
    assert mod.precheck(case["source"], case["translation"]) == case["problems"]


def test_the_contract_carries_precheck_py_byte_for_byte():
    result = subprocess.run([sys.executable, str(ROOT / "scripts" / "gen_precheck.py"), "--check"], capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr


@pytest.mark.skipif(shutil.which("node") is None, reason="node is not installed")
def test_the_editor_gives_the_same_answer():
    result = subprocess.run(
        ["node", str(ROOT / "web" / "scripts" / "precheck-parity.mjs")], capture_output=True, text=True, encoding="utf-8"
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert f"{len(CASES)} of {len(CASES)} cases agree" in result.stdout


def test_the_cases_cover_every_check():
    found = " ".join(p for case in CASES for p in case["problems"])
    for phrase in ("code block", "inline code", "link", "number", "heading", "times the length"):
        assert phrase in found, phrase
    assert sum(1 for case in CASES if case["problems"] == []) >= 8


def test_digits_are_normalised():
    assert PRE.normalise_digits("۰۱۲۳۴۵۶۷۸۹ ٠١٢٣٤٥٦٧٨٩") == "0123456789 0123456789"
    assert PRE.numbers("۲٬۵۰۰ و ۰٫۴") == ["2", "500", "0", "4"]


def test_the_ratio_bounds_are_inclusive():
    source = "x" * 100
    assert PRE.precheck(source, "y" * 40) == []
    assert PRE.precheck(source, "y" * 250) == []
    assert PRE.precheck(source, "y" * 39) != []
    assert PRE.precheck(source, "y" * 251) != []


def test_a_submission_stores_every_problem_the_case_lists():
    w = World()
    w.create(langs=["de"], glossary={})
    case = next(c for c in CASES if c["name"] == "several problems at once")
    w.add([case["source"]])
    w.claim(World.LENA, 1, "de")
    w.submit(World.LENA, case["translation"], 1, "de")
    assert w.section()["submissions"][0]["problems"] == case["problems"]
