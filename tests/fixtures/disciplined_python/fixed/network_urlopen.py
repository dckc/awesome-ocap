from urllib.parse import urljoin


class WebPath:
    def __init__(self, base_url, urlopen):
        self.base_url = base_url
        self.__urlopen = urlopen

    def join(self, relative_url):
        return WebPath(urljoin(self.base_url, relative_url), self.__urlopen)

    def __truediv__(self, relative_url):
        return self.join(relative_url)

    def open(self):
        return self.__urlopen(self.base_url)


def main(argv, urlopen):
    root = WebPath(argv[1], urlopen)
    with (root / "status").open() as response:
        return response.status


if __name__ == "__main__":
    def _script_io():
        from sys import argv
        from urllib.request import urlopen

        return main(
            argv=list(argv),
            urlopen=urlopen,
        )

    raise SystemExit(0 if _script_io() == 200 else 1)
