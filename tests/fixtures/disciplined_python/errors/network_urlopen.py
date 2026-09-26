# dpy: examples[DPY007]
import urllib.request


def main(argv):
    status = fetch_status(argv[1])
    return status


def fetch_status(url: str) -> int:
    with urllib.request.urlopen(url) as response:
        return response.status


if __name__ == "__main__":
    import sys

    raise SystemExit(0 if main(sys.argv) == 200 else 1)
