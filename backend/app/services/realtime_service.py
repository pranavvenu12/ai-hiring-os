"""
Tenant-scoped realtime event manager for WebSocket notifications.
"""

from __future__ import annotations

import json
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket


class RealtimeManager:
    def __init__(self) -> None:
        self._connections: dict[uuid.UUID, set[WebSocket]] = defaultdict(set)

    async def connect(self, company_id: uuid.UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[company_id].add(websocket)

    def disconnect(self, company_id: uuid.UUID, websocket: WebSocket) -> None:
        connections = self._connections.get(company_id)
        if not connections:
            return
        connections.discard(websocket)
        if not connections:
            self._connections.pop(company_id, None)

    async def broadcast(self, company_id: uuid.UUID, event_type: str, payload: dict[str, Any]) -> None:
        connections = list(self._connections.get(company_id, set()))
        if not connections:
            return

        message = json.dumps({
            "type": event_type,
            "payload": payload,
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }, default=str)

        stale: list[WebSocket] = []
        for websocket in connections:
            try:
                await websocket.send_text(message)
            except Exception:
                stale.append(websocket)

        for websocket in stale:
            self.disconnect(company_id, websocket)


manager = RealtimeManager()


async def publish_event(company_id: uuid.UUID, event_type: str, payload: dict[str, Any]) -> None:
    await manager.broadcast(company_id, event_type, payload)
