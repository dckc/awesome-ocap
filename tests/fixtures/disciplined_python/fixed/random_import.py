def choose_winner(candidates, random_fraction):
    index = int(random_fraction() * len(candidates))
    return candidates[index]
