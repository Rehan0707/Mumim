"""Global exception handlers → consistent JSON error envelope.

All errors return:  {"error": {"type", "status", "detail"}}

Domain exceptions from the service layer map to the right HTTP status so routers
don't each re-handle them, and any unhandled error is logged with a traceback and
returned as a safe 500 (never leaks internals).
"""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .services.orders import OrderError, OutOfStock
from .services.payments import PaymentProviderError

log = logging.getLogger("munim.errors")


def _envelope(status: int, err_type: str, detail) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"type": err_type, "status": status, "detail": detail}},
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException):
        return _envelope(exc.status_code, "http_error", exc.detail)

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        return _envelope(422, "validation_error", jsonable_encoder(exc.errors()))

    @app.exception_handler(OutOfStock)
    async def _out_of_stock(request: Request, exc: OutOfStock):
        return _envelope(409, "out_of_stock", str(exc))

    @app.exception_handler(OrderError)
    async def _order_error(request: Request, exc: OrderError):
        return _envelope(400, "order_error", str(exc))

    @app.exception_handler(PaymentProviderError)
    async def _payment_error(request: Request, exc: PaymentProviderError):
        return _envelope(502, "payment_provider_error", str(exc))

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        log.exception("unhandled error on %s %s", request.method, request.url.path)
        return _envelope(500, "internal_error", "internal server error")
