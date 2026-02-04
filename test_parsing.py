from urllib.parse import unquote
CONTAINER_NAME = "soft-skill-check"
saved_url = "https://ai102ml.blob.core.windows.net/soft-skill-check/user_68e05335-e896-489b-9018-a38b5b4e00e5_introduction.wav?sv=2024-02-04&st=2024-02-04T12%3A00%3A00Z&se=2024-02-04T13%3A00%3A00Z&sr=b&sp=r&sig=some_signature"

print(f"Testing URL: {saved_url}")

blob_name = saved_url
if "core.windows.net" in saved_url:
    # Extract path after container name
    container_part = f"/{CONTAINER_NAME}/"
    if container_part in saved_url:
        file_part = saved_url.split(container_part)[-1]
    else:
        # Try alternative container format (without leading slash)
        file_part = saved_url.split(f"{CONTAINER_NAME}/")[-1]
    
    # Remove SAS token query params
    blob_name = file_part.split("?")[0]
    
    # Decode URL encoding (e.g., %20 -> space)
    blob_name = unquote(blob_name)

print(f"Parsed blob name: {blob_name}")
expected = "user_68e05335-e896-489b-9018-a38b5b4e00e5_introduction.wav"
print(f"Match: {blob_name == expected}")
