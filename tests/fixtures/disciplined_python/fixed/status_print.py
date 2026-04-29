import logging


def sync_items(count):
    logging.info("syncing %s items", count)
    return count


if __name__ == "__main__":
    def _script_io():
        import sys

        logging.basicConfig(stream=sys.stderr, level=logging.INFO)
        sync_items(3)

    _script_io()
