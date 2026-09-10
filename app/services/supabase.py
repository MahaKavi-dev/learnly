import os

try:
    from supabase import Client, create_client
except ImportError:
    Client = object
    create_client = None

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key or create_client is None:
        return None
    return create_client(url, key)

def supabase_status():
    client = get_supabase()
    if client is None:
        return {"configured": False, "connected": False}
    try:
        client.table("exercises").select("id").limit(1).execute()
        return {
            "configured": True,
            "connected": True,
            "table": "exercises",
            "message": "Connected to M4's existing Learnly Supabase project"
        }
    except Exception as exc:
        return {
            "configured": True,
            "connected": False,
            "message": f"Supabase query failed: {type(exc).__name__}"
        }
