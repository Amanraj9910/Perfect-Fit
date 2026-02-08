import asyncio
import os
from openai import AsyncAzureOpenAI
from dotenv import load_dotenv

load_dotenv()

async def test_openai():
    api_key = os.environ.get("AZURE_OPENAI_API_KEY")
    api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview")
    azure_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
    deployment_name = os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o")

    print(f"Endpoint: {azure_endpoint}")
    print(f"Deployment: {deployment_name}")
    print(f"Version: {api_version}")

    if not api_key or not azure_endpoint:
        print("Missing API Key or Endpoint")
        return

    try:
        client = AsyncAzureOpenAI(
            api_key=api_key,
            api_version=api_version,
            azure_endpoint=azure_endpoint
        )

        response = await client.chat.completions.create(
            model=deployment_name,
            messages=[
                {"role": "user", "content": "Hello, are you working?"}
            ]
        )
        print("Response received:")
        print(response.choices[0].message.content)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_openai())
