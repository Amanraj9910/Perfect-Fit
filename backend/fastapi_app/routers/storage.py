from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, HttpUrl
from core.storage import sign_blob_url
from dependencies import get_current_user

router = APIRouter()

class SignUrlRequest(BaseModel):
    url: str
    download: bool = False

class SignUrlResponse(BaseModel):
    url: str

@router.post("/sign", response_model=SignUrlResponse)
async def sign_url(request: SignUrlRequest, user = Depends(get_current_user)):
    """
    Sign a blob URL with a SAS token.
    Requires authentication.
    """
    # Extract filename correctly, ignoring query params
    filename = None
    if request.download:
        from urllib.parse import urlparse, unquote
        parsed = urlparse(request.url)
        path = parsed.path
        filename = unquote(path.split('/')[-1])

    signed_url = sign_blob_url(
        request.url,
        as_attachment=request.download,
        filename=filename
    )
    
    return {"url": signed_url}
