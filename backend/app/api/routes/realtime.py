"""
WebSocket endpoint for tenant-scoped realtime updates.
"""

from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.auth.supabase_auth import verify_jwt
from app.db.session import AsyncSessionLocal
from app.services import realtime_service, user_service

router = APIRouter(tags=["Realtime"])


@router.websocket("/ws")
async def websocket_updates(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    try:
        token_payload = verify_jwt(token)
        async with AsyncSessionLocal() as db:
            user = await user_service.get_user_by_supabase_uid(db, token_payload.sub)
            if user is None and token_payload.email:
                user = await user_service.get_user_by_email(db, token_payload.email)
        if user is None:
            await websocket.close(code=1008)
            return
    except Exception:
        await websocket.close(code=1008)
        return

    await realtime_service.manager.connect(user.company_id, websocket)
    try:
        await websocket.send_json({
            "type": "connected",
            "payload": {"company_id": str(user.company_id), "user_id": str(user.id)},
        })
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        realtime_service.manager.disconnect(user.company_id, websocket)
    except Exception:
        realtime_service.manager.disconnect(user.company_id, websocket)
