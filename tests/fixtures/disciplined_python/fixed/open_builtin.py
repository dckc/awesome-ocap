def line_count(path, open_text):
    with open_text(path) as handle:
        return len(handle.readlines())
