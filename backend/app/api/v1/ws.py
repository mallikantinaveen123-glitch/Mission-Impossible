from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import json
import asyncio
import datetime
import time

router = APIRouter()

class ConnectionManager:
    """
    Manages active WebSocket telemetry connections for real-time traffic command deck,
    BOLO inter-station alerts, flood level shifts, and camera ANPR feeds.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcasts a JSON serializable dict to all active subscribers."""
        dead_connections = []
        payload = json.dumps(message)
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)

# Global manager instance
manager = ConnectionManager()

async def broadcast_telemetry(event_type: str, data: Dict[str, Any]):
    """Helper accessible from any router or detector module to dispatch real-time events."""
    message = {
        "event": event_type,
        "timestamp": int(time.time() * 1000),
        "data": data
    }
    await manager.broadcast(message)

@router.websocket("/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial handshake and state snapshot
        await websocket.send_text(json.dumps({
            "event": "CONNECTED",
            "message": "Real-time Traffic AI Telemetry Stream connected.",
            "timestamp": int(time.time() * 1000),
            "system_status": "ONLINE",
            "protocol_version": "2.0-WS"
        }))

        # Keep connection open and respond to heartbeats or client subscriptions
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type", "").upper()

                if msg_type == "PING":
                    await websocket.send_text(json.dumps({
                        "event": "PONG",
                        "timestamp": int(time.time() * 1000)
                    }))
                elif msg_type == "SUBSCRIBE":
                    # Client can subscribe to specific camera or alert feeds
                    await websocket.send_text(json.dumps({
                        "event": "SUBSCRIBED",
                        "topic": msg.get("topic", "ALL"),
                        "timestamp": int(time.time() * 1000)
                    }))
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
