from pathlib import Path


def load_config(path: Path):
    return path.read_text(encoding="utf-8")
