import asyncio
import json
from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from typing import Dict, List

# FastAPI() ke bajaaye APIRouter() ka istemaal karein
router = APIRouter()

# Template directory ko "templates" set karein
templates = Jinja2Templates(directory="templates")

class ConnectionManager:
    def __init__(self):
        # Ab hum rooms ko manage karenge
        self.rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_name: str):
        await websocket.accept()
        if room_name not in self.rooms:
            self.rooms[room_name] = []
        self.rooms[room_name].append(websocket)

    def disconnect(self, websocket: WebSocket, room_name: str):
        if room_name in self.rooms:
            self.rooms[room_name].remove(websocket)
            if not self.rooms[room_name]:
                del self.rooms[room_name]

    async def broadcast(self, message: str, sender: WebSocket, room_name: str):
        if room_name in self.rooms:
            for connection in self.rooms[room_name]:
                if connection is not sender:
                    await connection.send_text(message)

manager = ConnectionManager()

# @app.get ko @router.get se badlein
@router.get("/", response_class=HTMLResponse)
async def get_home(request: Request):
    """
    Yeh homepage serve karega (meeting create karne wala page).
    """
    return templates.TemplateResponse("index.html", {"request": request})

@router.get("/meeting/{meeting_id}", response_class=HTMLResponse)
async def get_meeting_room(request: Request, meeting_id: str):
    """
    Yeh meeting room page serve karega.
    """
    return templates.TemplateResponse("index.html", {"request": request, "meeting_id": meeting_id})

# @app.websocket ko @router.websocket se badlein
@router.websocket("/ws/{meeting_id}")
async def websocket_endpoint(websocket: WebSocket, meeting_id: str):
    await manager.connect(websocket, meeting_id)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(data, websocket, meeting_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, meeting_id)
        # Call end hone ka signal sabko bhej dein
        await manager.broadcast(json.dumps({"type": "end_call"}), websocket, meeting_id)
