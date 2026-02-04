try:
    from gotrue import AsyncGoTrueClient
    print("AsyncGoTrueClient imported successfully")
except ImportError as e:
    print(f"Failed to import AsyncGoTrueClient: {e}")

try:
    from postgrest import AsyncPostgrestClient
    print("AsyncPostgrestClient imported successfully")
except ImportError as e:
    print(f"Failed to import AsyncPostgrestClient: {e}")
