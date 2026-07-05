"""WebSocket connection manager — live push to the owner dashboard (spec A1 step 7).

Events broadcast per business_id: new_message, new_order, order_update,
stock_update, low_stock. The dashboard subscribes on /ws/dashboard?business_id=...
"""
from __future__ import annotations

from typing import Dict, List

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, business_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._rooms.setdefault(business_id, []).append(ws)

    def disconnect(self, business_id: str, ws: WebSocket) -> None:
        conns = self._rooms.get(business_id)
        if conns and ws in conns:
            conns.remove(ws)

    async def broadcast(self, business_id: str, event: dict) -> None:
        dead = []
        for ws in self._rooms.get(business_id, []):
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(business_id, ws)


manager = ConnectionManager()
