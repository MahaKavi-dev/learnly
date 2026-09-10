from datetime import date, datetime, timezone

def update_child_streak(client, child_id: str, activity_date: date | str | None = None):
    """
    Updates or creates a child's daily activity streak in Supabase.
    - First activity day: current_streak = 1, longest_streak = 1.
    - Consecutive calendar day (delta_days == 1): current_streak += 1, update longest_streak.
    - Same calendar day (delta_days == 0): streak maintained without double-incrementing.
    - Missed 1 or more days (delta_days > 1): current_streak reset to 1, preserve longest_streak.
    """
    if client is None or not child_id:
        return None

    if activity_date is None:
        target_date = datetime.now(timezone.utc).date()
    elif isinstance(activity_date, str):
        target_date = date.fromisoformat(activity_date)
    elif isinstance(activity_date, date):
        target_date = activity_date
    else:
        target_date = datetime.now(timezone.utc).date()

    date_str = target_date.isoformat()

    # Query existing streak
    res = (
        client
        .table("streaks")
        .select("id, current_streak, longest_streak, last_activity_date")
        .eq("child_id", child_id)
        .limit(1)
        .execute()
    )
    existing = res.data or []

    if not existing:
        # First activity day
        new_row = {
            "child_id": child_id,
            "current_streak": 1,
            "longest_streak": 1,
            "last_activity_date": date_str,
        }
        insert_res = client.table("streaks").insert(new_row).execute()
        return insert_res.data[0] if insert_res.data else new_row

    streak_record = existing[0]
    record_id = streak_record["id"]
    current_streak = streak_record.get("current_streak", 0) or 0
    longest_streak = streak_record.get("longest_streak", 0) or 0
    last_date_str = streak_record.get("last_activity_date")

    if not last_date_str:
        delta_days = 1
    else:
        last_date = date.fromisoformat(last_date_str)
        delta_days = (target_date - last_date).days

    if delta_days == 0:
        # Same day: streak does not increment
        return streak_record
    elif delta_days == 1:
        # Consecutive day: increment streak
        new_current = current_streak + 1
        new_longest = max(longest_streak, new_current)
    elif delta_days > 1:
        # Missed one or more days: reset current streak to 1
        new_current = 1
        new_longest = max(longest_streak, 1)
    else:
        # Out-of-order date: leave as is
        return streak_record

    update_payload = {
        "current_streak": new_current,
        "longest_streak": new_longest,
        "last_activity_date": date_str,
    }
    update_res = client.table("streaks").update(update_payload).eq("id", record_id).execute()
    return update_res.data[0] if update_res.data else update_payload
