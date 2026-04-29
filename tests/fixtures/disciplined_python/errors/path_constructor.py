# dpy: examples[DPY004]
from pathlib import Path


def load_config(path_name, read_text):
    return read_text(Path(path_name), encoding="utf-8")
