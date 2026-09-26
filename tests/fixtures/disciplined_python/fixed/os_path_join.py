from pathlib import PurePosixPath


def metadata_path(out_dir):
    return PurePosixPath(out_dir) / "rules.metadata.json"
