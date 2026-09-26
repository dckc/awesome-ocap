# dpy: examples[DPY001]
def line_count(path):
    with open(path, encoding="utf-8") as handle:
        return len(handle.readlines())
