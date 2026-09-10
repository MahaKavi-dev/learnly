from app.adaptive.engine import next_difficulty
from app.schemas.assessment import Difficulty

def test_adaptive_score_below_60():
    assert next_difficulty(50, Difficulty.hard) == Difficulty.medium
    assert next_difficulty(40, Difficulty.medium) == Difficulty.easy
    assert next_difficulty(0, Difficulty.easy) == Difficulty.easy

def test_adaptive_score_60_to_80():
    assert next_difficulty(60, Difficulty.easy) == Difficulty.easy
    assert next_difficulty(70, Difficulty.medium) == Difficulty.medium
    assert next_difficulty(80, Difficulty.hard) == Difficulty.hard

def test_adaptive_score_above_80():
    assert next_difficulty(85, Difficulty.easy) == Difficulty.medium
    assert next_difficulty(90, Difficulty.medium) == Difficulty.hard
    assert next_difficulty(100, Difficulty.hard) == Difficulty.hard
