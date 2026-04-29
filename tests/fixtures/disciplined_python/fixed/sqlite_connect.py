def count_items(connection):
    row = connection.execute("select count(*) from items").fetchone()
    return row[0]


def main(argv, stdout, cwd, connect):
    db_path = cwd / argv[1]
    with connect(db_path) as connection:
        count = count_items(connection)
    print(count, file=stdout)
    return 0


if __name__ == "__main__":
    def _script_io():
        from pathlib import Path
        from sqlite3 import connect
        from sys import argv, stdout

        return main(
            argv=list(argv),
            stdout=stdout,
            cwd=Path.cwd(),
            connect=connect,
        )

    raise SystemExit(_script_io())
