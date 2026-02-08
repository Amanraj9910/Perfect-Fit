import os
from datetime import datetime, timedelta
from urllib.parse import urlparse, unquote
from azure.storage.blob import generate_blob_sas, BlobSasPermissions, BlobServiceClient
from core.logging import api_logger, log_error

AZURE_CONNECTION_STRING = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")

def get_blob_service_client():
    if not AZURE_CONNECTION_STRING:
        raise ValueError("AZURE_STORAGE_CONNECTION_STRING not set")
    return BlobServiceClient.from_connection_string(AZURE_CONNECTION_STRING)

def sign_blob_url(blob_url: str, expiry_hours: int = 1, as_attachment: bool = False, filename: str = None) -> str:
    """
    Appends a SAS token to the blob URL to allow secure read access.
    
    Args:
        blob_url: The full URL to the blob
        expiry_hours: How long the token should be valid
        as_attachment: If True, sets Content-Disposition to attachment (force download)
        filename: Optional filename for Content-Disposition
    """
    if not blob_url:
        return blob_url
        
    try:
        if not AZURE_CONNECTION_STRING:
            # Attempt to reload from os.environ in case it was set after module load
            from os import environ
            conn_str = environ.get("AZURE_STORAGE_CONNECTION_STRING")
            if conn_str:
                # Update module level variable
                globals()['AZURE_CONNECTION_STRING'] = conn_str
            else:
                api_logger.critical("AZURE_STORAGE_CONNECTION_STRING not set - cannot sign Blob URL")
                return blob_url

        # Parse connection string to get account name and key
        params = dict(item.split('=', 1) for item in AZURE_CONNECTION_STRING.split(';') if '=' in item)
        account_name = params.get('AccountName')
        account_key = params.get('AccountKey')

        if not account_name or not account_key:
             api_logger.critical("Could not parse AccountName or AccountKey from connection string")
             return blob_url

        # Extract container and blob name from URL
        try:
            parsed = urlparse(blob_url)
            path_parts = parsed.path.lstrip('/').split('/', 1)
            if len(path_parts) != 2:
                # Try handling cases where container is not first path segment (unlikely in standard Azure URLs but possible)
                return blob_url
            
            container_name, blob_name = path_parts
            
            # Handle encoded characters (spaces, etc)
            blob_name = unquote(blob_name)
            
        except Exception:
            return blob_url

        # content_disposition configuration
        content_disposition = None
        if as_attachment:
            content_disposition = f"attachment; filename={filename}" if filename else "attachment"
        elif filename:
            content_disposition = f"inline; filename={filename}"

        sas_token = generate_blob_sas(
            account_name=account_name,
            container_name=container_name,
            blob_name=blob_name,
            account_key=account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.utcnow() + timedelta(hours=expiry_hours),
            content_disposition=content_disposition
        )
        
        # Strip existing query parameters to avoid duplication/conflict
        base_url = blob_url.split('?')[0]
        return f"{base_url}?{sas_token}"
        
    except Exception as e:
        # print to stdout to ensure we see it
        print(f"ERROR in sign_blob_url: {e}")
        import traceback
        traceback.print_exc()
        log_error(e, context="sign_blob_url")
        return blob_url
