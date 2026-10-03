"""
The Markdown importer, and the seed's claim that its sections are real docs.

scripts/import_markdown.py and web/lib/markdown.mjs (the site's "Start a
program" form) must cut the same file into the same sections; both run here
over every docs page. The seed's source texts must still appear verbatim in the
docs pages they say they were copied from.
"""

from __future__ import annotations

import ast
import importlib.util
import json
import shutil
import subprocess

import pytest

from harness import ROOT

DOCS = sorted((ROOT / "web" / "content" / "docs").rglob("*.mdx"))


def _load(name: str, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


IMPORT = _load("import_markdown", ROOT / "scripts" / "import_markdown.py")


def test_a_long_page_is_cut_at_headings_and_blank_lines_and_never_inside_code():
    code = "```bash\n" + "\n".join(f"echo {i}" for i in range(400)) + "\n```"
    text = "---\ntitle: x\n---\nimport { A } from 'b';\n\n# One\n\nShort.\n\n## Two\n\n" + ("Paragraph. " * 150 + "\n\n") * 3 + "## Three\n\n" + code
    sections = IMPORT.split_sections(text)
    assert [s["title"] for s in sections[:2]] == ["One", "Two"]
    assert all(len(s["text"]) <= 2500 for s in sections if not s["tooLong"])
    assert sections[2]["title"] == "Two (2)"
    assert sections[-1]["tooLong"] and sections[-1]["text"].startswith("```bash") and sections[-1]["text"].endswith("```")
    assert "import" not in sections[0]["text"] and "title: x" not in sections[0]["text"]


@pytest.mark.skipif(shutil.which("node") is None, reason="node is not installed")
def test_the_site_and_the_script_cut_every_docs_page_the_same_way():
    script = (
        "import { splitSections } from './web/lib/markdown.mjs';"
        "import { readFileSync } from 'node:fs';"
        "const files = JSON.parse(process.argv[1]);"
        "console.log(JSON.stringify(files.map((f) => splitSections(readFileSync(f, 'utf8')))));"
    )
    files = [str(p) for p in DOCS]
    result = subprocess.run(
        ["node", "--input-type=module", "-e", script, json.dumps(files)], cwd=ROOT, capture_output=True, text=True, encoding="utf-8"
    )
    assert result.returncode == 0, result.stderr
    js = json.loads(result.stdout)
    py = [IMPORT.split_sections(p.read_text(encoding="utf-8")) for p in DOCS]
    assert js == py


def test_the_seed_sections_are_copied_from_the_docs():
    tree = ast.parse((ROOT / "scripts" / "seed.py").read_text(encoding="utf-8"))
    node = next(n for n in tree.body if isinstance(n, ast.Assign) and getattr(n.targets[0], "id", "") == "SECTIONS")
    rows = ast.literal_eval(node.value)
    assert len(rows) == 4
    for key, _title, page, text in rows:
        assert text in (ROOT / page).read_text(encoding="utf-8"), f"seed section {key} is no longer in {page}"
