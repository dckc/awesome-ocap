# dpy: examples[DPY008]
import subprocess


def main(argv, stdout):
    result = subprocess.run(argv[1:], check=False)
    print(result.returncode, file=stdout)
    return result.returncode


if __name__ == "__main__":
    import sys

    raise SystemExit(main(sys.argv, sys.stdout))
