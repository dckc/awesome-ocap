#!/usr/bin/env python3
"""Static checks for DisciplinedPython source files.

DisciplinedPython code receives authority such as I/O explicitly. This checker
reports common ambient authority uses involving filesystem, environment,
randomness, clock, network, subprocess, stdio, database, dynamic import, and
process-state access.

Current limits:

- Alias tracking is out of scope. For example, ``my_open = open`` followed by
  ``my_open(path)`` is not reported.
- Dynamic name lookup is out of scope. For example, ``globals()["open"](path)``
  is not reported.
"""

from __future__ import annotations

import argparse
import ast
import builtins
from importlib import resources
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence, TextIO


@dataclass(frozen=True)
class Finding:
    path: str
    line: int
    column: int
    code: str
    message: str
    source: str


@dataclass(frozen=True)
class Reference:
    node: ast.AST
    source: str
    name: str
    resolved_name: str
    in_script_boundary: bool


@dataclass(frozen=True)
class Policy:
    code: str
    category: str
    message: str


BUILTIN_NAMES = frozenset(dir(builtins))

BUILTIN_POLICIES = {
    "builtins.open": Policy("DPY001", "filesystem", "inject file I/O instead of calling built-in open()"),
    "builtins.input": Policy("DPY002", "stdio", "inject stdin instead of calling built-in input()"),
    "builtins.print": Policy("DPY009", "stdio", "use logging or inject stdout instead of calling print() without file="),
}

IMPORT_POLICIES = {
    "os.environ": Policy("DPY003", "environment", "inject environment access instead of using os.environ"),
    "os.getenv": Policy("DPY003", "environment", "inject environment access instead of calling os.getenv()"),
    "os.getenvb": Policy("DPY003", "environment", "inject environment access instead of calling os.getenvb()"),
    "os.putenv": Policy("DPY003", "environment", "inject environment access instead of calling os.putenv()"),
    "os.unsetenv": Policy("DPY003", "environment", "inject environment access instead of calling os.unsetenv()"),
    "fileinput.input": Policy("DPY004", "filesystem", "inject file input instead of calling fileinput.input()"),
    "glob.glob": Policy("DPY004", "filesystem", "inject glob results instead of calling glob.glob()"),
    "glob.iglob": Policy("DPY004", "filesystem", "inject glob results instead of calling glob.iglob()"),
    "os.access": Policy("DPY004", "filesystem", "inject filesystem access instead of calling os.access()"),
    "os.chdir": Policy("DPY004", "filesystem", "inject current-directory access instead of calling os.chdir()"),
    "os.chmod": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling os.chmod()"),
    "os.chown": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling os.chown()"),
    "os.getcwd": Policy("DPY004", "filesystem", "inject current-directory access instead of calling os.getcwd()"),
    "os.getcwdb": Policy("DPY004", "filesystem", "inject current-directory access instead of calling os.getcwdb()"),
    "os.link": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling os.link()"),
    "os.listdir": Policy("DPY004", "filesystem", "inject directory access instead of calling os.listdir()"),
    "os.lstat": Policy("DPY004", "filesystem", "inject filesystem metadata access instead of calling os.lstat()"),
    "os.makedirs": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling os.makedirs()"),
    "os.mkdir": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling os.mkdir()"),
    "os.open": Policy("DPY004", "filesystem", "inject file I/O instead of calling os.open()"),
    "os.remove": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling os.remove()"),
    "os.removedirs": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling os.removedirs()"),
    "os.rename": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling os.rename()"),
    "os.replace": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling os.replace()"),
    "os.rmdir": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling os.rmdir()"),
    "os.scandir": Policy("DPY004", "filesystem", "inject directory access instead of calling os.scandir()"),
    "os.stat": Policy("DPY004", "filesystem", "inject filesystem metadata access instead of calling os.stat()"),
    "os.symlink": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling os.symlink()"),
    "os.truncate": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling os.truncate()"),
    "os.unlink": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling os.unlink()"),
    "os.walk": Policy("DPY004", "filesystem", "inject directory access instead of calling os.walk()"),
    "os.path.exists": Policy("DPY004", "filesystem", "inject filesystem metadata instead of calling os.path.exists()"),
    "os.path.getatime": Policy("DPY004", "filesystem", "inject filesystem metadata instead of calling os.path.getatime()"),
    "os.path.getctime": Policy("DPY004", "filesystem", "inject filesystem metadata instead of calling os.path.getctime()"),
    "os.path.getmtime": Policy("DPY004", "filesystem", "inject filesystem metadata instead of calling os.path.getmtime()"),
    "os.path.getsize": Policy("DPY004", "filesystem", "inject filesystem metadata instead of calling os.path.getsize()"),
    "os.path.isdir": Policy("DPY004", "filesystem", "inject filesystem metadata instead of calling os.path.isdir()"),
    "os.path.isfile": Policy("DPY004", "filesystem", "inject filesystem metadata instead of calling os.path.isfile()"),
    "os.path.islink": Policy("DPY004", "filesystem", "inject filesystem metadata instead of calling os.path.islink()"),
    "os.path.abspath": Policy("DPY013", "platform-path", "inject path semantics or use an explicit path flavor instead of os.path.abspath()"),
    "os.path.basename": Policy("DPY013", "platform-path", "inject path semantics or use an explicit path flavor instead of os.path.basename()"),
    "os.path.dirname": Policy("DPY013", "platform-path", "inject path semantics or use an explicit path flavor instead of os.path.dirname()"),
    "os.path.join": Policy("DPY013", "platform-path", "inject path semantics or use an explicit path flavor instead of os.path.join()"),
    "os.path.normpath": Policy("DPY013", "platform-path", "inject path semantics or use an explicit path flavor instead of os.path.normpath()"),
    "os.path.relpath": Policy("DPY013", "platform-path", "inject path semantics or use an explicit path flavor instead of os.path.relpath()"),
    "os.path.split": Policy("DPY013", "platform-path", "inject path semantics or use an explicit path flavor instead of os.path.split()"),
    "os.path.splitext": Policy("DPY013", "platform-path", "inject path semantics or use an explicit path flavor instead of os.path.splitext()"),
    "pathlib.Path": Policy("DPY004", "filesystem", "inject path authority instead of constructing Path() from data"),
    "pathlib.Path.cwd": Policy("DPY004", "filesystem", "inject current-directory access instead of calling Path.cwd()"),
    "pathlib.Path.home": Policy("DPY004", "filesystem", "inject home-directory access instead of calling Path.home()"),
    "shutil.copy": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling shutil.copy()"),
    "shutil.copy2": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling shutil.copy2()"),
    "shutil.copyfile": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling shutil.copyfile()"),
    "shutil.copytree": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling shutil.copytree()"),
    "shutil.move": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling shutil.move()"),
    "shutil.rmtree": Policy("DPY004", "filesystem", "inject filesystem mutation instead of calling shutil.rmtree()"),
    "tempfile.NamedTemporaryFile": Policy("DPY004", "filesystem", "inject temporary-file access instead of calling tempfile.NamedTemporaryFile()"),
    "tempfile.TemporaryDirectory": Policy("DPY004", "filesystem", "inject temporary-directory access instead of calling tempfile.TemporaryDirectory()"),
    "tempfile.TemporaryFile": Policy("DPY004", "filesystem", "inject temporary-file access instead of calling tempfile.TemporaryFile()"),
    "tempfile.mkdtemp": Policy("DPY004", "filesystem", "inject temporary-directory access instead of calling tempfile.mkdtemp()"),
    "tempfile.mkstemp": Policy("DPY004", "filesystem", "inject temporary-file access instead of calling tempfile.mkstemp()"),
    "os.urandom": Policy("DPY005", "entropy", "inject randomness instead of calling os.urandom()"),
    "random.SystemRandom": Policy("DPY005", "entropy", "inject randomness instead of constructing random.SystemRandom()"),
    "random.choice": Policy("DPY005", "entropy", "inject randomness instead of calling random.choice()"),
    "random.choices": Policy("DPY005", "entropy", "inject randomness instead of calling random.choices()"),
    "random.randint": Policy("DPY005", "entropy", "inject randomness instead of calling random.randint()"),
    "random.random": Policy("DPY005", "entropy", "inject randomness instead of calling random.random()"),
    "random.randrange": Policy("DPY005", "entropy", "inject randomness instead of calling random.randrange()"),
    "random.sample": Policy("DPY005", "entropy", "inject randomness instead of calling random.sample()"),
    "random.shuffle": Policy("DPY005", "entropy", "inject randomness instead of calling random.shuffle()"),
    "random.uniform": Policy("DPY005", "entropy", "inject randomness instead of calling random.uniform()"),
    "secrets.choice": Policy("DPY005", "entropy", "inject randomness instead of calling secrets.choice()"),
    "secrets.randbelow": Policy("DPY005", "entropy", "inject randomness instead of calling secrets.randbelow()"),
    "secrets.token_bytes": Policy("DPY005", "entropy", "inject randomness instead of calling secrets.token_bytes()"),
    "secrets.token_hex": Policy("DPY005", "entropy", "inject randomness instead of calling secrets.token_hex()"),
    "secrets.token_urlsafe": Policy("DPY005", "entropy", "inject randomness instead of calling secrets.token_urlsafe()"),
    "uuid.uuid4": Policy("DPY005", "entropy", "inject randomness instead of calling uuid.uuid4()"),
    "datetime.date.today": Policy("DPY006", "clock", "inject the clock instead of calling date.today()"),
    "datetime.datetime.now": Policy("DPY006", "clock", "inject the clock instead of calling datetime.now()"),
    "datetime.datetime.utcnow": Policy("DPY006", "clock", "inject the clock instead of calling datetime.utcnow()"),
    "time.monotonic": Policy("DPY006", "clock", "inject the clock instead of calling time.monotonic()"),
    "time.monotonic_ns": Policy("DPY006", "clock", "inject the clock instead of calling time.monotonic_ns()"),
    "time.perf_counter": Policy("DPY006", "clock", "inject the clock instead of calling time.perf_counter()"),
    "time.perf_counter_ns": Policy("DPY006", "clock", "inject the clock instead of calling time.perf_counter_ns()"),
    "time.process_time": Policy("DPY006", "clock", "inject the clock instead of calling time.process_time()"),
    "time.process_time_ns": Policy("DPY006", "clock", "inject the clock instead of calling time.process_time_ns()"),
    "time.sleep": Policy("DPY006", "clock", "inject sleep/timer authority instead of calling time.sleep()"),
    "time.time": Policy("DPY006", "clock", "inject the clock instead of calling time.time()"),
    "time.time_ns": Policy("DPY006", "clock", "inject the clock instead of calling time.time_ns()"),
    "ftplib.FTP": Policy("DPY007", "network", "inject network access instead of constructing ftplib.FTP()"),
    "ftplib.FTP_TLS": Policy("DPY007", "network", "inject network access instead of constructing ftplib.FTP_TLS()"),
    "http.client.HTTPConnection": Policy("DPY007", "network", "inject network access instead of constructing HTTPConnection()"),
    "http.client.HTTPSConnection": Policy("DPY007", "network", "inject network access instead of constructing HTTPSConnection()"),
    "imaplib.IMAP4": Policy("DPY007", "network", "inject network access instead of constructing imaplib.IMAP4()"),
    "imaplib.IMAP4_SSL": Policy("DPY007", "network", "inject network access instead of constructing imaplib.IMAP4_SSL()"),
    "poplib.POP3": Policy("DPY007", "network", "inject network access instead of constructing poplib.POP3()"),
    "poplib.POP3_SSL": Policy("DPY007", "network", "inject network access instead of constructing poplib.POP3_SSL()"),
    "smtplib.LMTP": Policy("DPY007", "network", "inject network access instead of constructing smtplib.LMTP()"),
    "smtplib.SMTP": Policy("DPY007", "network", "inject network access instead of constructing smtplib.SMTP()"),
    "smtplib.SMTP_SSL": Policy("DPY007", "network", "inject network access instead of constructing smtplib.SMTP_SSL()"),
    "socket.create_connection": Policy("DPY007", "network", "inject network access instead of calling socket.create_connection()"),
    "socket.fromfd": Policy("DPY007", "network", "inject socket authority instead of calling socket.fromfd()"),
    "socket.getaddrinfo": Policy("DPY007", "network", "inject DNS access instead of calling socket.getaddrinfo()"),
    "socket.gethostbyaddr": Policy("DPY007", "network", "inject DNS access instead of calling socket.gethostbyaddr()"),
    "socket.gethostbyname": Policy("DPY007", "network", "inject DNS access instead of calling socket.gethostbyname()"),
    "socket.gethostname": Policy("DPY007", "network", "inject hostname access instead of calling socket.gethostname()"),
    "socket.socket": Policy("DPY007", "network", "inject network access instead of constructing socket.socket()"),
    "telnetlib.Telnet": Policy("DPY007", "network", "inject network access instead of constructing telnetlib.Telnet()"),
    "urllib.request.build_opener": Policy("DPY007", "network", "inject network access instead of calling build_opener()"),
    "urllib.request.urlopen": Policy("DPY007", "network", "inject network access instead of calling urlopen()"),
    "urllib.request.urlretrieve": Policy("DPY007", "network", "inject network access instead of calling urlretrieve()"),
    "xmlrpc.client.ServerProxy": Policy("DPY007", "network", "inject network access instead of constructing ServerProxy()"),
    "multiprocessing.Pool": Policy("DPY008", "subprocess", "inject process execution instead of constructing multiprocessing.Pool()"),
    "multiprocessing.Process": Policy("DPY008", "subprocess", "inject process execution instead of constructing multiprocessing.Process()"),
    "os.execl": Policy("DPY008", "subprocess", "inject process execution instead of calling os.execl()"),
    "os.execle": Policy("DPY008", "subprocess", "inject process execution instead of calling os.execle()"),
    "os.execlp": Policy("DPY008", "subprocess", "inject process execution instead of calling os.execlp()"),
    "os.execlpe": Policy("DPY008", "subprocess", "inject process execution instead of calling os.execlpe()"),
    "os.execv": Policy("DPY008", "subprocess", "inject process execution instead of calling os.execv()"),
    "os.execve": Policy("DPY008", "subprocess", "inject process execution instead of calling os.execve()"),
    "os.execvp": Policy("DPY008", "subprocess", "inject process execution instead of calling os.execvp()"),
    "os.execvpe": Policy("DPY008", "subprocess", "inject process execution instead of calling os.execvpe()"),
    "os.popen": Policy("DPY008", "subprocess", "inject process execution instead of calling os.popen()"),
    "os.posix_spawn": Policy("DPY008", "subprocess", "inject process execution instead of calling os.posix_spawn()"),
    "os.posix_spawnp": Policy("DPY008", "subprocess", "inject process execution instead of calling os.posix_spawnp()"),
    "os.spawnl": Policy("DPY008", "subprocess", "inject process execution instead of calling os.spawnl()"),
    "os.spawnle": Policy("DPY008", "subprocess", "inject process execution instead of calling os.spawnle()"),
    "os.spawnlp": Policy("DPY008", "subprocess", "inject process execution instead of calling os.spawnlp()"),
    "os.spawnlpe": Policy("DPY008", "subprocess", "inject process execution instead of calling os.spawnlpe()"),
    "os.spawnv": Policy("DPY008", "subprocess", "inject process execution instead of calling os.spawnv()"),
    "os.spawnve": Policy("DPY008", "subprocess", "inject process execution instead of calling os.spawnve()"),
    "os.spawnvp": Policy("DPY008", "subprocess", "inject process execution instead of calling os.spawnvp()"),
    "os.spawnvpe": Policy("DPY008", "subprocess", "inject process execution instead of calling os.spawnvpe()"),
    "os.system": Policy("DPY008", "subprocess", "inject process execution instead of calling os.system()"),
    "subprocess.Popen": Policy("DPY008", "subprocess", "inject process execution instead of constructing subprocess.Popen()"),
    "subprocess.call": Policy("DPY008", "subprocess", "inject process execution instead of calling subprocess.call()"),
    "subprocess.check_call": Policy("DPY008", "subprocess", "inject process execution instead of calling subprocess.check_call()"),
    "subprocess.check_output": Policy("DPY008", "subprocess", "inject process execution instead of calling subprocess.check_output()"),
    "subprocess.run": Policy("DPY008", "subprocess", "inject process execution instead of calling subprocess.run()"),
    "curses.initscr": Policy("DPY009", "stdio", "inject terminal access instead of calling curses.initscr()"),
    "getpass.getpass": Policy("DPY009", "stdio", "inject secret input instead of calling getpass.getpass()"),
    "sys.stdin": Policy("DPY009", "stdio", "inject stdin instead of using sys.stdin"),
    "sys.stdout": Policy("DPY009", "stdio", "inject stdout instead of using sys.stdout"),
    "sys.stderr": Policy("DPY009", "stdio", "inject stderr instead of using sys.stderr"),
    "sqlite3.connect": Policy("DPY010", "database", "inject database access instead of calling sqlite3.connect()"),
    "importlib.import_module": Policy("DPY011", "dynamic-import", "inject loaded modules instead of calling importlib.import_module()"),
    "os.getegid": Policy("DPY012", "process-state", "inject process identity instead of calling os.getegid()"),
    "os.geteuid": Policy("DPY012", "process-state", "inject process identity instead of calling os.geteuid()"),
    "os.getgid": Policy("DPY012", "process-state", "inject process identity instead of calling os.getgid()"),
    "os.getgroups": Policy("DPY012", "process-state", "inject process identity instead of calling os.getgroups()"),
    "os.getpid": Policy("DPY012", "process-state", "inject process identity instead of calling os.getpid()"),
    "os.getppid": Policy("DPY012", "process-state", "inject process identity instead of calling os.getppid()"),
    "os.getuid": Policy("DPY012", "process-state", "inject process identity instead of calling os.getuid()"),
    "platform.machine": Policy("DPY012", "process-state", "inject platform information instead of calling platform.machine()"),
    "platform.node": Policy("DPY012", "process-state", "inject platform information instead of calling platform.node()"),
    "platform.platform": Policy("DPY012", "process-state", "inject platform information instead of calling platform.platform()"),
    "platform.processor": Policy("DPY012", "process-state", "inject platform information instead of calling platform.processor()"),
    "platform.python_version": Policy("DPY012", "process-state", "inject platform information instead of calling platform.python_version()"),
    "platform.release": Policy("DPY012", "process-state", "inject platform information instead of calling platform.release()"),
    "platform.system": Policy("DPY012", "process-state", "inject platform information instead of calling platform.system()"),
    "platform.uname": Policy("DPY012", "process-state", "inject platform information instead of calling platform.uname()"),
    "platform.version": Policy("DPY012", "process-state", "inject platform information instead of calling platform.version()"),
}


def dotted_name(node: ast.AST) -> str | None:
    parts: list[str] = []
    current = node
    while isinstance(current, ast.Attribute):
        parts.append(current.attr)
        current = current.value
    if isinstance(current, ast.Name):
        parts.append(current.id)
        return ".".join(reversed(parts))
    return None


def root_name(node: ast.AST) -> str | None:
    current = node
    while isinstance(current, ast.Attribute):
        current = current.value
    if isinstance(current, ast.Name):
        return current.id
    return None


def is_call_function(node: ast.AST) -> bool:
    return isinstance(node, (ast.Name, ast.Attribute))


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


class ReferenceCollector(ast.NodeVisitor):
    """Collect references to builtins and imports."""

    def __init__(self, path: str, source_lines: Sequence[str]) -> None:
        self.path = path
        self.source_lines = source_lines
        self.references: list[Reference] = []
        self.imports_stack: list[dict[str, str]] = [{}]
        self.local_names_stack: list[set[str]] = [set()]
        self.main_guard_depth = 0
        self.script_boundary_depth = 0

    def bind_local(self, name: str) -> None:
        self.local_names_stack[-1].add(name)

    def visible_import(self, name: str) -> str | None:
        for imports in reversed(self.imports_stack):
            if name in imports:
                return imports[name]
        return None

    def is_local_name(self, name: str) -> bool:
        return any(name in names for names in reversed(self.local_names_stack))

    def push_scope(self, arguments: ast.arguments | None = None) -> None:
        self.imports_stack.append({})
        self.local_names_stack.append(set())
        if arguments is not None:
            self.local_names_stack[-1].update(argument_names(arguments))

    def pop_scope(self) -> None:
        self.imports_stack.pop()
        self.local_names_stack.pop()

    def add_reference(self, node: ast.AST, source: str, name: str, resolved_name: str) -> None:
        self.references.append(
            Reference(
                node,
                source,
                name,
                resolved_name,
                in_script_boundary=self.script_boundary_depth > 0,
            )
        )

    def visit_If(self, node: ast.If) -> None:
        guarded = is_main_guard(node)
        self.visit(node.test)
        if guarded:
            self.main_guard_depth += 1
        for statement in node.body:
            self.visit(statement)
        if guarded:
            self.main_guard_depth -= 1
        for statement in node.orelse:
            self.visit(statement)

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self.bind_local(node.name)
        self.visit_decorators_and_defaults(node)
        self.push_scope(node.args)
        boundary_body = self.main_guard_depth > 0
        if boundary_body:
            self.script_boundary_depth += 1
        for statement in node.body:
            self.visit(statement)
        if boundary_body:
            self.script_boundary_depth -= 1
        self.pop_scope()

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self.bind_local(node.name)
        self.visit_decorators_and_defaults(node)
        self.push_scope(node.args)
        boundary_body = self.main_guard_depth > 0
        if boundary_body:
            self.script_boundary_depth += 1
        for statement in node.body:
            self.visit(statement)
        if boundary_body:
            self.script_boundary_depth -= 1
        self.pop_scope()

    def visit_Lambda(self, node: ast.Lambda) -> None:
        self.push_scope(node.args)
        self.visit(node.body)
        self.pop_scope()

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        self.bind_local(node.name)
        for decorator in node.decorator_list:
            self.visit(decorator)
        for base in node.bases:
            self.visit(base)
        for keyword in node.keywords:
            self.visit(keyword)
        self.push_scope()
        for statement in node.body:
            self.visit(statement)
        self.pop_scope()

    def visit_decorators_and_defaults(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> None:
        for decorator in node.decorator_list:
            self.visit(decorator)
        for default in node.args.defaults:
            self.visit(default)
        for default in node.args.kw_defaults:
            if default is not None:
                self.visit(default)
        if node.returns is not None:
            self.visit(node.returns)

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            binding = alias.asname or alias.name.split(".", 1)[0]
            self.bind_local(binding)
            self.imports_stack[-1][binding] = alias.name if alias.asname else binding

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        if node.module is None:
            return
        for alias in node.names:
            if alias.name == "*":
                continue
            binding = alias.asname or alias.name
            self.bind_local(binding)
            self.imports_stack[-1][binding] = f"{node.module}.{alias.name}"

    def visit_Assign(self, node: ast.Assign) -> None:
        self.visit(node.value)
        for target in node.targets:
            self.bind_target(target)

    def visit_AnnAssign(self, node: ast.AnnAssign) -> None:
        self.visit(node.annotation)
        if node.value is not None:
            self.visit(node.value)
        self.bind_target(node.target)

    def visit_AugAssign(self, node: ast.AugAssign) -> None:
        self.visit(node.target)
        self.visit(node.value)
        self.bind_target(node.target)

    def visit_For(self, node: ast.For) -> None:
        self.visit(node.iter)
        self.bind_target(node.target)
        for statement in node.body:
            self.visit(statement)
        for statement in node.orelse:
            self.visit(statement)

    def visit_AsyncFor(self, node: ast.AsyncFor) -> None:
        self.visit(node.iter)
        self.bind_target(node.target)
        for statement in node.body:
            self.visit(statement)
        for statement in node.orelse:
            self.visit(statement)

    def visit_With(self, node: ast.With) -> None:
        for item in node.items:
            self.visit(item.context_expr)
            if item.optional_vars is not None:
                self.bind_target(item.optional_vars)
        for statement in node.body:
            self.visit(statement)

    def visit_AsyncWith(self, node: ast.AsyncWith) -> None:
        for item in node.items:
            self.visit(item.context_expr)
            if item.optional_vars is not None:
                self.bind_target(item.optional_vars)
        for statement in node.body:
            self.visit(statement)

    def visit_ExceptHandler(self, node: ast.ExceptHandler) -> None:
        if node.type is not None:
            self.visit(node.type)
        if node.name is not None:
            self.bind_local(node.name)
        for statement in node.body:
            self.visit(statement)

    def visit_Call(self, node: ast.Call) -> None:
        if is_call_function(node.func):
            self.collect_reference(node.func)
            if dotted_name(node.func) is None:
                self.visit(node.func)
        for arg in node.args:
            self.visit(arg)
        for keyword in node.keywords:
            self.visit(keyword)

    def visit_Attribute(self, node: ast.Attribute) -> None:
        self.collect_reference(node)
        if dotted_name(node) is not None and root_name(node) is not None:
            return
        self.generic_visit(node)

    def visit_Name(self, node: ast.Name) -> None:
        if isinstance(node.ctx, ast.Load):
            self.collect_reference(node)

    def collect_reference(self, node: ast.AST) -> None:
        name = dotted_name(node)
        root = root_name(node)
        if name is None or root is None:
            return

        imported_name = self.visible_import(root)
        if imported_name is not None:
            suffix = name[len(root) :]
            self.add_reference(node, "import", name, f"{imported_name}{suffix}")
            return

        if root in BUILTIN_NAMES and self.visible_import(root) is None and not self.is_local_name(root):
            self.add_reference(node, "builtin", name, f"builtins.{name}")

    def bind_target(self, node: ast.AST) -> None:
        if isinstance(node, ast.Name):
            self.bind_local(node.id)
        elif isinstance(node, (ast.Tuple, ast.List)):
            for element in node.elts:
                self.bind_target(element)
        elif isinstance(node, ast.Starred):
            self.bind_target(node.value)


class DisciplinedPythonPolicy:
    """Flag authority-bearing builtin and import references."""

    def __init__(self, path: str, source_lines: Sequence[str]) -> None:
        self.path = path
        self.source_lines = source_lines
        self.findings: list[Finding] = []

    def add(self, node: ast.AST, code: str, message: str) -> None:
        line = getattr(node, "lineno", 1)
        column = getattr(node, "col_offset", 0) + 1
        source = self.source_lines[line - 1].rstrip("\n") if self.source_lines else ""
        self.findings.append(Finding(self.path, line, column, code, message, source))

    def check(self, references: Iterable[Reference]) -> list[Finding]:
        for reference in references:
            if reference.in_script_boundary:
                continue
            policy = policy_for_reference(reference)
            if policy is not None:
                self.add(reference.node, policy.code, policy.message)
        return self.findings


def policy_for_reference(reference: Reference) -> Policy | None:
    if reference.resolved_name == "builtins.print" and print_has_explicit_file(reference.node):
        return None
    if reference.source == "builtin":
        return BUILTIN_POLICIES.get(reference.resolved_name)
    if reference.source == "import":
        return IMPORT_POLICIES.get(reference.resolved_name)
    return None


def print_has_explicit_file(node: ast.AST) -> bool:
    parent = getattr(node, "_disciplined_python_parent", None)
    return isinstance(parent, ast.Call) and any(keyword.arg == "file" for keyword in parent.keywords)


def collect_references(source: str, *, path: str = "<string>") -> list[Reference]:
    tree = ast.parse(source, filename=path)
    attach_parent_links(tree)
    collector = ReferenceCollector(path, source.splitlines())
    collector.visit(tree)
    return collector.references


def attach_parent_links(tree: ast.AST) -> None:
    for parent in ast.walk(tree):
        for child in ast.iter_child_nodes(parent):
            setattr(child, "_disciplined_python_parent", parent)


def argument_names(arguments: ast.arguments) -> set[str]:
    args = [
        *arguments.posonlyargs,
        *arguments.args,
        *arguments.kwonlyargs,
    ]
    names = {arg.arg for arg in args}
    if arguments.vararg is not None:
        names.add(arguments.vararg.arg)
    if arguments.kwarg is not None:
        names.add(arguments.kwarg.arg)
    return names


def check_source(source: str, *, path: str = "<string>") -> list[Finding]:
    source_lines = source.splitlines()
    references = collect_references(source, path=path)
    policy = DisciplinedPythonPolicy(path, source_lines)
    findings = policy.check(references)
    unsuppressed_findings = [
        finding for finding in findings if not finding_suppressed(finding, source_lines)
    ]
    return sorted(unsuppressed_findings, key=lambda finding: (finding.line, finding.column, finding.code))


def finding_suppressed(finding: Finding, source_lines: Sequence[str]) -> bool:
    if finding.line < 1 or finding.line > len(source_lines):
        return False
    line = source_lines[finding.line - 1]
    return f"dpy: ignore[{finding.code}]" in line


def check_paths(paths: Iterable[Path]) -> list[Finding]:
    findings: list[Finding] = []
    for path in paths:
        try:
            source = path.read_text(encoding="utf-8")
            findings.extend(check_source(source, path=str(path)))
        except SyntaxError as error:
            text = error.text.rstrip("\n") if error.text else ""
            findings.append(
                Finding(
                    str(path),
                    error.lineno or 1,
                    error.offset or 1,
                    "DPY000",
                    f"syntax error: {error.msg}",
                    text,
                )
            )
    return sorted(findings, key=lambda finding: (finding.path, finding.line, finding.column, finding.code))


def format_finding(finding: Finding) -> str:
    return (
        f"{finding.path}:{finding.line}:{finding.column}: {finding.code}: {finding.message}\n"
        f"  {finding.source}"
    )


EXAMPLES_BY_CODE = {
    "DPY001": ("main_guard_bare_authority.py", "open_builtin.py", "path_read_text.py"),
    "DPY003": ("environ_import.py",),
    "DPY004": ("path_constructor.py", "path_read_text.py"),
    "DPY005": ("random_import.py",),
    "DPY007": ("network_urlopen.py",),
    "DPY008": ("subprocess_run.py",),
    "DPY009": ("print_builtin.py", "status_print.py"),
    "DPY010": ("sqlite_connect.py",),
    "DPY013": ("os_path_join.py",),
}
EXAMPLE_ROOT = "tests.fixtures.disciplined_python"


def format_examples_hint(findings: Iterable[Finding]) -> str:
    try:
        example_root = str(resources.files(anchor=EXAMPLE_ROOT))
    except (ImportError, ModuleNotFoundError):
        example_root = EXAMPLE_ROOT

    lines = [
        f"See DisciplinedPython error/fix examples in {example_root}",
        "  general script boundary: fixed/script_entry.py",
    ]
    for code in sorted({finding.code for finding in findings}):
        examples = EXAMPLES_BY_CODE.get(code)
        if examples:
            lines.append(f"  {code}: {', '.join(examples)}")
    return "\n".join(lines)


def main(argv: Sequence[str], stdout: TextIO, cwd: Path) -> int:
    parser = argparse.ArgumentParser(
        prog=argv[0],
        description="Check DisciplinedPython source files for ambient I/O.",
    )
    parser.add_argument("paths", nargs="+")
    args = parser.parse_args(argv[1:])
    paths = [cwd / path_name for path_name in args.paths]
    findings = check_paths(paths)
    for finding in findings:
        print(format_finding(finding), file=stdout)
    if findings:
        print(format_examples_hint(findings), file=stdout)
        return 1
    return 0


if __name__ == "__main__":
    def _script_io() -> int:
        return main(list(sys.argv), sys.stdout, Path.cwd())

    raise SystemExit(_script_io())
