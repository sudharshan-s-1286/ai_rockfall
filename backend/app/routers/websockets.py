from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

router = APIRouter(prefix="/ws", tags=["WebSockets"])

class ConnectionManager:
    def __init__(self):
        # A dictionary mapping channel names to a list of active websocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {
            "alerts": [],
            "worker-location": [],
            "device-health": [],
            "ai-detections": []
        }

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel in self.active_connections:
            self.active_connections[channel].append(websocket)
        else:
            self.active_connections[channel] = [websocket]

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections and websocket in self.active_connections[channel]:
            self.active_connections[channel].remove(websocket)

    async def broadcast(self, message: str, channel: str):
        if channel in self.active_connections:
            # We copy the list to avoid modifying during iteration if a disconnect happens
            for connection in list(self.active_connections[channel]):
                try:
                    await connection.send_text(message)
                except Exception as e:
                    print(f"Failed to send to websocket on {channel}: {e}")
                    self.disconnect(connection, channel)

manager = ConnectionManager()

@router.websocket("/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    await manager.connect(websocket, channel)
    try:
        while True:
            # We don't expect the client to send much, mostly we broadcast to them
            data = await websocket.receive_text()
            # Echoing or handling client to server messages if necessary
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
