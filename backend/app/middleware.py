"""HTTP middleware: request id + timing + access logging.

Assigns/propagates an `X-Request-ID`, times each request, logs a single access
line, and returns `X-Request-ID` / `X-Process-Time-ms` response headers. WebSocket
connections use a different ASGI scope and pass through untouched.
"""
from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from .logging_config import request_id_var

log = logging.getLogger("munim.access")


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
        token = request_id_var.set(rid)
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            elapsed = (time.perf_counter() - start) * 1000
            log.exception("%s %s -> ERROR (%.1fms)", request.method, request.url.path, elapsed)
            raise
        finally:
            request_id_var.reset(token)

        elapsed = (time.perf_counter() - start) * 1000
        response.headers["X-Request-ID"] = rid
        response.headers["X-Process-Time-ms"] = f"{elapsed:.1f}"
        log.info("%s %s -> %s (%.1fms)", request.method, request.url.path, response.status_code, elapsed)
        return response
