import logging


def main(argv, cwd):
    text = (cwd / argv[1]).read_text(encoding="utf-8")
    logging.info("read %d characters", len(text))


if __name__ == "__main__":
    def _script_io():
        from pathlib import Path
        from sys import argv

        main(list(argv), Path.cwd())

    _script_io()
