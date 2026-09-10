from app.schemas.assessment import Difficulty


def next_difficulty(
    score: int,
    current: Difficulty = Difficulty.medium
) -> Difficulty:

    if score < 60:
        if current == Difficulty.hard:
            return Difficulty.medium
        return Difficulty.easy

    if score <= 80:
        return current

    if current == Difficulty.easy:
        return Difficulty.medium

    if current == Difficulty.medium:
        return Difficulty.hard

    return Difficulty.hard