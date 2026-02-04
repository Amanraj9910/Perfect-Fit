from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
import time

from routers import admin
from routers import jobs
from routers import candidates
from routers import applications
from core.logging import (
    api_logger,
    error_logger,
    log_request,
    log_response,
    log_error,
    setup_logging,
)

# Load environment variables
load_dotenv(dotenv_path="../../.env")

# Initialize logging
setup_logging()

app = FastAPI(title="Perfect Fit Admin API")

# CORS Configuration
# Note: When allow_credentials=True, "*" is not allowed for allow_origins.
# Use explicit origins (comma-separated) via CORS_ALLOW_ORIGINS env var.
default_origins = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000"
origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ALLOW_ORIGINS", default_origins).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Logging Middleware
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Log all HTTP requests and responses with timing."""
    start_time = time.time()
    
    # Get client IP
    client_ip = request.client.host if request.client else "unknown"
    
    # Log incoming request
    log_request(request.method, str(request.url.path), client_ip)
    
    try:
        response = await call_next(request)
        
        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000
        
        # Log response
        log_response(request.method, str(request.url.path), response.status_code, duration_ms)
        
        return response
        
    except Exception as e:
        # Log error and re-raise
        duration_ms = (time.time() - start_time) * 1000
        log_error(e, context=f"{request.method} {request.url.path}")
        raise


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions with logging."""
    log_error(exc, context=f"Unhandled exception in {request.method} {request.url.path}")
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."}
    )


# Include Routers
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(candidates.router, prefix="/api/candidates", tags=["candidates"])
app.include_router(applications.router, prefix="/api/applications", tags=["applications"])


@app.get("/")
def read_root():
    api_logger.info("Health check endpoint called")
    return {"message": "Perfect Fit Admin API is running"}


@app.on_event("startup")
async def startup_event():
    """Log application startup."""
    api_logger.info("🚀 Perfect Fit Admin API starting up...")
    api_logger.info(f"📍 Environment: {os.environ.get('ENVIRONMENT', 'development')}")


@app.on_event("shutdown")
async def shutdown_event():
    """Log application shutdown."""
    api_logger.info("👋 Perfect Fit Admin API shutting down...")

