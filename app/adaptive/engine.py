from app.schemas.assessment import Difficulty

def next_difficulty(score: int, current: Difficulty = Difficulty.medium) -> Difficulty:
    if score < 60:
        return Difficulty.easy
    if score > 80:
        return Difficulty.hard
    return current
