"""Structured logging setup.

One consistent line format across the app + uvicorn, with a per-request `rid`
(request id) pulled from a contextvar so every log line is traceable to a request.
This is the observability backbone the TRD asks for ("log every message + intent
+ latency"). The message pipeline logs conversations to the DB; this handles the
operational/access logs.
"""
from __future__ import annotations

import logging
import sys
from contextvars import ContextVar

# Set by the request middleware; defaults to "-" for startup/background logs.
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

_LOG_FORMAT = "%(asctime)s | %(levelname)-7s | %(name)-16s | rid=%(request_id)s | %(message)s"
_DATE_FORMAT = "%H:%M:%S"


class _RequestIdFilter(logging.Filter):
    """Inject the current request id onto every record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def setup_logging(level: str = "INFO") -> logging.Logger:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT))
    handler.addFilter(_RequestIdFilter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)

    # Route uvicorn logs through the same handler/format (no duplicate lines).
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        lg = logging.getLogger(name)
        lg.handlers = [handler]
        lg.propagate = False
        lg.setLevel(level)

    return logging.getLogger("munim")
