"""
Comprehensive Logging Module for Perfect Fit Backend

This module provides structured, colored logging for different components:
- api_logger: HTTP requests and responses
- error_logger: Exceptions and critical errors  
- ai_logger: AI pipeline events (Speech, OpenAI)
- db_logger: Database queries and connection status

Configuration:
- LOG_LEVEL: Set via environment variable (default: INFO)
- ENVIRONMENT: 'development' or 'production' (affects formatting)
"""

import logging
import sys
import os
from datetime import datetime
from typing import Optional

try:
    from colorlog import ColoredFormatter
    COLORLOG_AVAILABLE = True
except ImportError:
    COLORLOG_AVAILABLE = False

# Configuration from environment
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development").lower()
IS_DEVELOPMENT = ENVIRONMENT == "development"

# Format strings
DEV_FORMAT = "%(log_color)s%(asctime)s | %(levelname)-8s | %(name)-12s | %(message)s%(reset)s"
PROD_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)-12s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Color configuration for colorlog
LOG_COLORS = {
    'DEBUG': 'cyan',
    'INFO': 'green',
    'WARNING': 'yellow',
    'ERROR': 'red',
    'CRITICAL': 'red,bg_white',
}

# Emoji prefixes for visual clarity (dev mode only)
LEVEL_EMOJIS = {
    'DEBUG': '🔍',
    'INFO': '✅',
    'WARNING': '⚠️',
    'ERROR': '❌',
    'CRITICAL': '🔥',
}

# Logger name prefixes
LOGGER_EMOJIS = {
    'api': '🌐',
    'error': '💥',
    'ai': '🤖',
    'db': '🗄️',
    'auth': '🔐',
}


class EmojiFormatter(logging.Formatter):
    """Custom formatter that adds emojis in development mode."""
    
    def __init__(self, fmt: str, datefmt: str, use_emojis: bool = True):
        super().__init__(fmt, datefmt)
        self.use_emojis = use_emojis
    
    def format(self, record: logging.LogRecord) -> str:
        # Add emoji prefix based on logger name and level
        if self.use_emojis and IS_DEVELOPMENT:
            logger_emoji = LOGGER_EMOJIS.get(record.name, '📋')
            level_emoji = LEVEL_EMOJIS.get(record.levelname, '')
            record.msg = f"{logger_emoji} {level_emoji} {record.msg}"
        return super().format(record)


def get_console_handler() -> logging.StreamHandler:
    """Create and configure console handler with appropriate formatter."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(LOG_LEVEL)
    
    if IS_DEVELOPMENT and COLORLOG_AVAILABLE:
        # Use colored formatter in development
        formatter = ColoredFormatter(
            DEV_FORMAT,
            datefmt=DATE_FORMAT,
            reset=True,
            log_colors=LOG_COLORS,
            secondary_log_colors={},
            style='%'
        )
    else:
        # Use plain formatter in production
        formatter = EmojiFormatter(
            PROD_FORMAT,
            datefmt=DATE_FORMAT,
            use_emojis=False
        )
    
    handler.setFormatter(formatter)
    return handler


def get_logger(name: str) -> logging.Logger:
    """
    Get or create a logger with the specified name.
    
    Args:
        name: Logger name (e.g., 'api', 'error', 'ai', 'db')
    
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    
    # Only configure if not already configured
    if not logger.handlers:
        logger.setLevel(LOG_LEVEL)
        logger.addHandler(get_console_handler())
        logger.propagate = False
    
    return logger


# Pre-configured loggers for different components
api_logger = get_logger("api")
error_logger = get_logger("error")
ai_logger = get_logger("ai")
db_logger = get_logger("db")
auth_logger = get_logger("auth")


# Utility functions for structured logging
def log_request(method: str, path: str, client_ip: Optional[str] = None) -> None:
    """Log incoming HTTP request."""
    api_logger.info(f"→ {method} {path} [from: {client_ip or 'unknown'}]")


def log_response(method: str, path: str, status_code: int, duration_ms: float) -> None:
    """Log HTTP response with timing."""
    level = logging.INFO if status_code < 400 else logging.WARNING if status_code < 500 else logging.ERROR
    api_logger.log(level, f"← {method} {path} [{status_code}] ({duration_ms:.2f}ms)")


def log_db_query(query: str, table: str, duration_ms: Optional[float] = None) -> None:
    """Log database query."""
    duration_str = f" ({duration_ms:.2f}ms)" if duration_ms else ""
    db_logger.debug(f"Query: {query} on {table}{duration_str}")


def log_db_result(table: str, count: int) -> None:
    """Log database query result."""
    db_logger.debug(f"Result: {count} records from {table}")


def log_error(error: Exception, context: Optional[str] = None) -> None:
    """Log exception with context."""
    context_str = f"[{context}] " if context else ""
    error_logger.error(f"{context_str}{type(error).__name__}: {str(error)}", exc_info=True)


def log_ai_event(event: str, details: Optional[str] = None) -> None:
    """Log AI pipeline event."""
    detail_str = f": {details}" if details else ""
    ai_logger.info(f"{event}{detail_str}")


def log_auth_event(event: str, user_id: Optional[str] = None, success: bool = True) -> None:
    """Log authentication event."""
    status = "✓" if success else "✗"
    user_str = f" (user: {user_id})" if user_id else ""
    level = logging.INFO if success else logging.WARNING
    auth_logger.log(level, f"{status} {event}{user_str}")


# Initialize logging on module import
def setup_logging() -> None:
    """Initialize logging configuration."""
    # Configure root logger to catch any unconfigured loggers
    root_logger = logging.getLogger()
    root_logger.setLevel(LOG_LEVEL)
    
    if not root_logger.handlers:
        root_logger.addHandler(get_console_handler())
    
    # Suppress noisy third-party loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    
    api_logger.info(f"Logging initialized | Level: {LOG_LEVEL} | Environment: {ENVIRONMENT}")


# Auto-setup when module is imported
setup_logging()
