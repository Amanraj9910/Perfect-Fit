"""
Core module for Perfect Fit Backend.
Contains logging configuration and other core utilities.
"""

from .logging import (
    api_logger,
    error_logger,
    ai_logger,
    db_logger,
    auth_logger,
    log_request,
    log_response,
    log_db_query,
    log_db_result,
    log_error,
    log_ai_event,
    log_auth_event,
    setup_logging,
)

__all__ = [
    "api_logger",
    "error_logger",
    "ai_logger",
    "db_logger",
    "auth_logger",
    "log_request",
    "log_response",
    "log_db_query",
    "log_db_result",
    "log_error",
    "log_ai_event",
    "log_auth_event",
    "setup_logging",
]
