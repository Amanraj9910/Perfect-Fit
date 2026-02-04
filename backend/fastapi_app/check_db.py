
import os
import asyncio
from postgrest import AsyncPostgrestClient
from dotenv import load_dotenv

# Load env from parent dir
load_dotenv(dotenv_path="../../.env")

async def check_schema():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("Missing env vars")
        return

    client = AsyncPostgrestClient(
        f"{url}/rest/v1", 
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}"
        }
    )
    
    try:
        # Get one record or just column names if possible. 
        # select(*) and check keys is easy.
        res = await client.from_("job_applications").select("*").limit(1).execute()
        if res.data:
            print(f"Columns: {list(res.data[0].keys())}")
            if 'feedback' in res.data[0]:
                print("Column 'feedback' EXISTS")
            else:
                print("Column 'feedback' MISSING")
        else:
            print("No data in job_applications, attempting to insert mock to check")
            # Try to insert and catch error or just assume missing if we can't tell.
            # actually we can just check if we can select it explicitly
            try:
                res2 = await client.from_("job_applications").select("feedback").limit(1).execute()
                print("Column 'feedback' EXISTS (explicit select)")
            except Exception as e:
                print(f"Column 'feedback' MISSING or error: {e}")
                
    except Exception as e:
        print(f"Error checking: {e}")

if __name__ == "__main__":
    asyncio.run(check_schema())
