"""Live dashboard websocket (spec T3: WS /ws/dashboard)."""
from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..ws import manager

router = APIRouter()


@router.websocket("/ws/dashboard")
async def dashboard(ws: WebSocket, business_id: str):
    await manager.connect(business_id, ws)
    try:
        await ws.send_json({"type": "connected", "data": {"business_id": business_id}})
        while True:
            await ws.receive_text()  # keep-alive; client may ping
    except WebSocketDisconnect:
        manager.disconnect(business_id, ws)
    except Exception:
        manager.disconnect(business_id, ws)
