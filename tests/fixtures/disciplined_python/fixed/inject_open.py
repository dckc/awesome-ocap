def load_config(path_name, open):
    with open(path_name, encoding="utf-8") as file:
        return file.read()
