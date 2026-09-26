# dpy: examples[DPY001, DPY004]
from pathlib import Path


def load_config(path_name):
    path = Path(path_name)
    with open(path, encoding="utf-8") as handle:
        return handle.read()
