"""Authentication helpers for owner-only API surfaces.

The app intentionally avoids a heavyweight auth dependency here: OTP verification
issues a short signed bearer token, and production deployments require that token
for owner dashboard APIs and websocket connections.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any, Optional

from fastapi import Header, HTTPException, Request, status

from .config import settings


class AuthError(Exception):
    pass


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64d(value: str) -> bytes:
    pad = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + pad).encode("ascii"))


def _signature(payload: str) -> str:
    secret = settings.signing_secret().encode("utf-8")
    digest = hmac.new(secret, payload.encode("ascii"), hashlib.sha256).digest()
    return _b64e(digest)


def create_access_token(phone: str, role: str = "owner") -> str:
    now = int(time.time())
    payload = {
        "sub": phone,
        "phone": phone,
        "role": role,
        "iat": now,
        "exp": now + settings.TOKEN_TTL_SECONDS,
        "scope": "owner",
    }
    body = _b64e(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    return f"{body}.{_signature(body)}"


def verify_access_token(token: str) -> dict[str, Any]:
    try:
        body, sent_sig = token.split(".", 1)
    except ValueError as exc:
        raise AuthError("malformed token") from exc

    expected = _signature(body)
    if not hmac.compare_digest(expected, sent_sig):
        raise AuthError("invalid token signature")

    try:
        payload = json.loads(_b64d(body))
    except Exception as exc:
        raise AuthError("invalid token payload") from exc

    if int(payload.get("exp", 0)) < int(time.time()):
        raise AuthError("token expired")
    if payload.get("scope") != "owner":
        raise AuthError("insufficient token scope")
    return payload


def verify_authorization_header(authorization: Optional[str]) -> dict[str, Any]:
    if not settings.auth_required:
        return {"sub": "dev-owner", "role": "owner", "scope": "owner"}

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1].strip()
    try:
        return verify_access_token(token)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def require_owner_auth(authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    return verify_authorization_header(authorization)


def require_owner_request(request: Request) -> dict[str, Any]:
    return verify_authorization_header(request.headers.get("authorization"))


def verify_ws_token(token: Optional[str]) -> dict[str, Any]:
    if not settings.auth_required:
        return {"sub": "dev-owner", "role": "owner", "scope": "owner"}
    if not token:
        raise AuthError("missing websocket token")
    return verify_access_token(token)
