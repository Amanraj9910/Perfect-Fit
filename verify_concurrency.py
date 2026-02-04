import asyncio
import httpx
import time

async def fetch(client, url):
    start = time.time()
    try:
        resp = await client.get(url)
        print(f"GET {url}: {resp.status_code} in {time.time()-start:.2f}s")
        return resp.status_code
    except Exception as e:
        print(f"GET {url} failed: {e}")
        return 0

async def main():
    async with httpx.AsyncClient() as client:
        # Fire 5 concurrent requests
        urls = ["http://127.0.0.1:8001/admin/stats"] * 5
        print(f"Firing {len(urls)} concurrent requests...")
        start_total = time.time()
        tasks = [fetch(client, url) for url in urls]
        await asyncio.gather(*tasks)
        print(f"Total time: {time.time()-start_total:.2f}s")

if __name__ == "__main__":
    asyncio.run(main())
