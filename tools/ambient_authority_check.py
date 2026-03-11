#!/usr/bin/env python3
"""Report likely ambient-authority uses in a Python source file.

This is a focused checker for issue #55 style refactors, not a general
security analyzer. It looks for common ambient entry points such as env,
clock, network, subprocess, and stdio.
"""

from __future__ import annotations

import ast
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Finding:
    line: int
    kind: str
    detail: str
    source: str


def dotted_name(node: ast.AST) -> str | None:
    parts: list[str] = []
    cur = node
    while isinstance(cur, ast.Attribute):
        parts.append(cur.attr)
        cur = cur.value
    if isinstance(cur, ast.Name):
        parts.append(cur.id)
        return ".".join(reversed(parts))
    return None


def is_main_guard(node: ast.If) -> bool:
    test = node.test
    return (
        isinstance(test, ast.Compare)
        and isinstance(test.left, ast.Name)
        and test.left.id == "__name__"
        and len(test.ops) == 1
        and isinstance(test.ops[0], ast.Eq)
        and len(test.comparators) == 1
        and isinstance(test.comparators[0], ast.Constant)
        and test.comparators[0].value == "__main__"
    )


class ScriptBoundaryCollector(ast.NodeVisitor):
    def __init__(self) -> None:
        self.boundary_depth = 0
        self.boundary_defs: set[str] = set()
        self.calls_outside_boundary: set[str] = set()

    def visit_If(self, node: ast.If) -> None:
        is_boundary = is_main_guard(node)
        if is_boundary:
            self.boundary_depth += 1
        self.generic_visit(node)
        if is_boundary:
            self.boundary_depth -= 1

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        if self.boundary_depth > 0:
            self.boundary_defs.add(node.name)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        if self.boundary_depth > 0:
            self.boundary_defs.add(node.name)
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        if self.boundary_depth == 0 and isinstance(node.func, ast.Name):
            self.calls_outside_boundary.add(node.func.id)
        self.generic_visit(node)

    def exempt_boundary_functions(self) -> set[str]:
        return self.boundary_defs - self.calls_outside_boundary


class AmbientAuthorityVisitor(ast.NodeVisitor):
    def __init__(self, source_lines: list[str], exempt_boundary_funcs: set[str]) -> None:
        self.findings: list[Finding] = []
        self.scope_depth = 0
        self.source_lines = source_lines
        self.boundary_depth = 0
        self.exempt_boundary_funcs = exempt_boundary_funcs

    def add(self, node: ast.AST, kind: str, detail: str) -> None:
        source = self.source_lines[node.lineno - 1].rstrip("\n")
        self.findings.append(Finding(node.lineno, kind, detail, source))

    def visit_If(self, node: ast.If) -> None:
        is_boundary = is_main_guard(node)
        if is_boundary:
            self.boundary_depth += 1
        self.generic_visit(node)
        if is_boundary:
            self.boundary_depth -= 1

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        if self.boundary_depth > 0 and node.name in self.exempt_boundary_funcs:
            return
        self.scope_depth += 1
        self.generic_visit(node)
        self.scope_depth -= 1

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        if self.boundary_depth > 0 and node.name in self.exempt_boundary_funcs:
            return
        self.scope_depth += 1
        self.generic_visit(node)
        self.scope_depth -= 1

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        self.scope_depth += 1
        self.generic_visit(node)
        self.scope_depth -= 1

    def visit_Call(self, node: ast.Call) -> None:
        name = dotted_name(node.func)
        if name == "datetime.now":
            self.add(node, "ambient-clock", name)
        elif name == "Path.home":
            self.add(node, "ambient-filesystem-root", name)
        elif name == "Path.cwd":
            self.add(node, "ambient-filesystem-root", name)
        elif name == "urllib.request.urlopen":
            self.add(node, "ambient-network", name)
        elif name == "subprocess.run":
            self.add(node, "ambient-subprocess", name)
        elif name == "uuid.uuid4":
            self.add(node, "ambient-entropy", name)
        elif name == "print":
            if not any(kw.arg == "file" for kw in node.keywords):
                self.add(node, "ambient-stdio", "print")
        elif name in {"open", "Path"}:
            self.add(node, "data-to-authority", name)
        self.generic_visit(node)

    def visit_Attribute(self, node: ast.Attribute) -> None:
        name = dotted_name(node)
        if name == "os.environ":
            self.add(node, "ambient-env", name)
        elif name in {"sys.stdout", "sys.stderr"}:
            self.add(node, "ambient-stdio", name)
        self.generic_visit(node)


def check_source(source: str) -> list[Finding]:
    tree = ast.parse(source)
    boundaries = ScriptBoundaryCollector()
    boundaries.visit(tree)
    visitor = AmbientAuthorityVisitor(
        source.splitlines(), boundaries.exempt_boundary_functions()
    )
    visitor.visit(tree)
    return sorted(visitor.findings, key=lambda f: (f.line, f.kind, f.detail))


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(f"usage: {Path(argv[0]).name} PATH", file=sys.stderr)
        return 2

    source_path = Path(argv[1])
    findings = check_source(source_path.read_text())
    for finding in findings:
        print(f"{source_path}:{finding.line}: {finding.kind}: {finding.detail}")
        print(f"  {finding.source}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
