# dpy: examples[DPY005]
import random


def choose_winner(candidates):
    index = int(random.random() * len(candidates))
    return candidates[index]
