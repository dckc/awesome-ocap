# dpy: examples[DPY010]
import sqlite3


def count_items(db_name):
    with sqlite3.connect(db_name) as connection:
        row = connection.execute("select count(*) from items").fetchone()
    return row[0]


def main(argv, stdout):
    count = count_items(argv[1])
    print(count, file=stdout)
    return 0


if __name__ == "__main__":
    import sys

    raise SystemExit(main(sys.argv, sys.stdout))
