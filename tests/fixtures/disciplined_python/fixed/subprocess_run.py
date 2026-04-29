def main(argv, stdout, run):
    result = run(argv[1:], check=False)
    print(result.returncode, file=stdout)
    return result.returncode


if __name__ == "__main__":
    def _script_io():
        from subprocess import run
        from sys import argv, stdout

        return main(
            argv=list(argv),
            stdout=stdout,
            run=run,
        )

    raise SystemExit(_script_io())
