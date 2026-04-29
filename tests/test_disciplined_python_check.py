from __future__ import annotations

import io
from importlib import resources
from importlib.resources.abc import Traversable
import re
import unittest

from tools import disciplined_python_check
from tools.disciplined_python_check import EXAMPLES_BY_CODE, check_source, collect_references, main


ERROR_FIXTURES = "tests.fixtures.disciplined_python.errors"
FIXED_FIXTURES = "tests.fixtures.disciplined_python.fixed"
EXAMPLE_METADATA_RE = re.compile(r"# dpy: examples\[([^\]]+)\]")


def python_resources(package: str) -> list[Traversable]:
    return sorted(
        (
            resource
            for resource in resources.files(anchor=package).iterdir()
            if resource.name.endswith(".py") and resource.name != "__init__.py"
        ),
        key=lambda resource: resource.name,
    )


def example_codes(source: str) -> set[str]:
    codes: set[str] = set()
    for match in EXAMPLE_METADATA_RE.finditer(source):
        codes.update(code.strip() for code in match.group(1).split(","))
    return codes


class DisciplinedPythonCheckTests(unittest.TestCase):
    def test_checker_documents_current_scope_limits(self) -> None:
        source = disciplined_python_check.__doc__ or ""
        self.assertIn("Alias tracking is out of scope", source)
        self.assertIn("Dynamic name lookup is out of scope", source)

    def test_error_fixtures_have_findings(self) -> None:
        fixtures = python_resources(ERROR_FIXTURES)
        self.assertGreater(len(fixtures), 0)
        for fixture in fixtures:
            with self.subTest(fixture=fixture.name):
                findings = check_source(fixture.read_text(encoding="utf-8"), path=fixture.name)
                self.assertGreater(len(findings), 0)
                self.assertTrue(all(finding.code.startswith("DPY") for finding in findings))

    def test_example_map_matches_fixture_metadata(self) -> None:
        metadata_examples: dict[str, set[str]] = {}
        for fixture in python_resources(ERROR_FIXTURES):
            source = fixture.read_text(encoding="utf-8")
            codes = example_codes(source)
            self.assertGreater(codes, set(), fixture.name)
            for code in codes:
                metadata_examples.setdefault(code, set()).add(fixture.name)

        mapped_examples = {
            code: set(examples)
            for code, examples in EXAMPLES_BY_CODE.items()
        }
        self.assertEqual(mapped_examples, metadata_examples)

    def test_collects_builtin_and_import_references(self) -> None:
        source = "import random\n\n\ndef choose(open):\n    return random.random(), open\n"
        references = collect_references(source)
        resolved_names = {reference.resolved_name for reference in references}
        self.assertIn("random.random", resolved_names)
        self.assertNotIn("builtins.open", resolved_names)

    def test_common_stdlib_authority_surfaces_are_flagged(self) -> None:
        cases = {
            "filesystem tempfile": ("import tempfile\n\ndef f():\n    return tempfile.NamedTemporaryFile()\n", "DPY004"),
            "filesystem glob": ("import glob\n\ndef f():\n    return glob.glob('*.py')\n", "DPY004"),
            "entropy os": ("import os\n\ndef f():\n    return os.urandom(8)\n", "DPY005"),
            "clock date": ("from datetime import date\n\ndef f():\n    return date.today()\n", "DPY006"),
            "network socket alias": ("from socket import socket as make_socket\n\ndef f():\n    return make_socket()\n", "DPY007"),
            "subprocess popen": ("import subprocess\n\ndef f():\n    return subprocess.Popen(['true'])\n", "DPY008"),
            "stdio getpass": ("import getpass\n\ndef f():\n    return getpass.getpass()\n", "DPY009"),
            "dynamic import": ("import importlib\n\ndef f():\n    return importlib.import_module('json')\n", "DPY011"),
            "process state": ("import platform\n\ndef f():\n    return platform.uname()\n", "DPY012"),
        }
        for name, (source, code) in cases.items():
            with self.subTest(name=name):
                findings = check_source(source)
                self.assertTrue(any(finding.code == code for finding in findings), findings)

    def test_dpy_ignore_suppresses_only_the_named_code(self) -> None:
        source = (
            "from pathlib import Path\n\n"
            "def f():\n"
            "    return Path('data')  # dpy: ignore[DPY004]\n"
            "def g():\n"
            "    return open('data')  # dpy: ignore[DPY004]\n"
        )
        findings = check_source(source)
        self.assertEqual([finding.code for finding in findings], ["DPY001"])

    def test_fixed_fixtures_have_no_findings(self) -> None:
        error_names = {fixture.name for fixture in python_resources(ERROR_FIXTURES)}
        fixed_fixtures = python_resources(FIXED_FIXTURES)
        fixed_names = {fixture.name for fixture in fixed_fixtures}
        self.assertGreater(len(fixed_names), 0)
        self.assertTrue(error_names.issubset(fixed_names))
        for fixture in fixed_fixtures:
            with self.subTest(fixture=fixture.name):
                findings = check_source(fixture.read_text(encoding="utf-8"), path=fixture.name)
                self.assertEqual(findings, [])

    def test_cli_returns_nonzero_for_errors(self) -> None:
        resource = resources.files(ERROR_FIXTURES) / "open_builtin.py"
        with resources.as_file(resource) as fixture:
            stdout = io.StringIO()
            result = main(["disciplined_python_check.py", str(fixture)], stdout, fixture.parents[4])
        self.assertEqual(result, 1)
        self.assertIn("DPY001", stdout.getvalue())
        self.assertIn("open()", stdout.getvalue())
        self.assertIn("tests/fixtures/disciplined_python", stdout.getvalue())
        self.assertIn("general script boundary: fixed/script_entry.py", stdout.getvalue())
        self.assertIn("DPY001: main_guard_bare_authority.py, open_builtin.py, path_read_text.py", stdout.getvalue())

    def test_cli_returns_zero_for_fixed_script(self) -> None:
        resource = resources.files(FIXED_FIXTURES) / "open_builtin.py"
        with resources.as_file(resource) as fixture:
            stdout = io.StringIO()
            result = main(["disciplined_python_check.py", str(fixture)], stdout, fixture.parent)
        self.assertEqual(result, 0)
        self.assertEqual(stdout.getvalue(), "")


if __name__ == "__main__":
    unittest.main()
