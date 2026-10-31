"""
SolveX / أحياها FastAPI Backend Server (per HANDOFF.md)
Simulates:
1. Isolated Crash (no witnesses / nobody at that place)
2. Multi-Witness Confirmed Crash (many witnesses confirm "Yes, there is a crash")
3. Live Ambulance GPS Tracking (base -> crash scene -> hospital)
4. Hospital Capacity & Readiness Stats + Direct Ambulance Dispatch
"""
import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models_api import make_models_router

WEB_ORIGINS = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3100"]

app = FastAPI(title="SolveX Crash Response Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=WEB_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(make_models_router())


def default_hospitals() -> List[Dict[str, Any]]:
    return [
        {
            "id": "hosp-bouira",
            "name": "Hôpital Bouira (seed)",
            "etaSeconds": 660,
            "freeBeds": 4,
            "totalBeds": 18,
            "icuBedsFree": 2,
            "occupancyPct": 78,
            "capacityStatus": "busy",
            "orAvailable": True,
            "lat": 36.3785,
            "lng": 3.8925,
            "specialties": ["Urgences", "Traumatologie", "Chirurgie Générale"],
            "score": 0.94,
            "reasons": [
                "Centre de traumatologie le plus proche",
                "Box de déchocage disponible immédiatement",
                "Stock de sang O+ vérifié",
            ],
            "recommended": True,
        },
        {
            "id": "chu-blida",
            "name": "CHU Blida (seed)",
            "etaSeconds": 2400,
            "freeBeds": 12,
            "totalBeds": 22,
            "icuBedsFree": 5,
            "occupancyPct": 45,
            "capacityStatus": "optimal",
            "orAvailable": True,
            "lat": 36.395,
            "lng": 3.865,
            "specialties": ["Neurochirurgie", "Grands Brûlés", "Polytraumatisés"],
            "score": 0.81,
            "reasons": [
                "Plateau neurochirurgie de référence",
                "Unité de soins intensifs polyvalente",
            ],
            "recommended": False,
        },
        {
            "id": "chu-tizi-ouzou",
            "name": "CHU Tizi Ouzou (seed)",
            "etaSeconds": 2880,
            "freeBeds": 2,
            "totalBeds": 20,
            "icuBedsFree": 1,
            "occupancyPct": 90,
            "capacityStatus": "saturated",
            "orAvailable": True,
            "lat": 36.392,
            "lng": 3.938,
            "specialties": ["Chirurgie Vasculaire", "Réanimation"],
            "score": 0.74,
            "reasons": ["Équipe chirurgie thoracique d’astreinte"],
            "recommended": False,
        },
        {
            "id": "eph-lakhdaria",
            "name": "EPH Lakhdaria",
            "etaSeconds": 960,
            "freeBeds": 0,
            "totalBeds": 14,
            "icuBedsFree": 0,
            "occupancyPct": 100,
            "capacityStatus": "divert",
            "orAvailable": False,
            "lat": 36.358,
            "lng": 3.875,
            "specialties": ["Urgences Médico-Chirurgicales"],
            "score": 0.28,
            "reasons": ["Capacité saturée — délestage SAMU actif"],
            "recommended": False,
        },
    ]


def default_ambulances() -> List[Dict[str, Any]]:
    return [
        {
            "id": "amb-102",
            "unit": "Ambulance PC-102 (Bouira)",
            "status": "available",
            "lat": 36.345,
            "lng": 3.882,
            "etaSeconds": 660,
            "speedKmh": 0,
            "routeProgressPct": 0,
        },
        {
            "id": "amb-105",
            "unit": "Ambulance PC-105 (El Asnam)",
            "status": "available",
            "lat": 36.402,
            "lng": 3.945,
            "etaSeconds": 900,
            "speedKmh": 0,
            "routeProgressPct": 0,
        },
        {
            "id": "amb-108",
            "unit": "Ambulance PC-108 (Aomar)",
            "status": "available",
            "lat": 36.418,
            "lng": 3.820,
            "etaSeconds": 1200,
            "speedKmh": 0,
            "routeProgressPct": 0,
        },
    ]


STATE: Dict[str, Any] = {
    "ok": True,
    "online": True,
    "ambulances": default_ambulances(),
    "incidents": {},
    "updatedAt": datetime.now(timezone.utc).isoformat(),
}

CLIENTS: Set[WebSocket] = set()


async def broadcast(packet: Dict[str, Any]):
    dead = set()
    for ws in CLIENTS:
        try:
            await ws.send_json(packet)
        except Exception:
            dead.add(ws)
    CLIENTS.difference_update(dead)


@app.get("/api/backend/state")
async def get_state():
    return STATE


class ActionPayload(BaseModel):
    action: str
    incidentId: str | None = None
    ambulanceId: str | None = None
    hospitalId: str | None = None
    occupantId: str | None = None
    personId: str | None = None
    radiusM: int | None = None
    online: bool | None = None
    enabled: bool | None = None
    multiplier: float | None = None


@app.post("/api/backend/action")
async def post_action(payload: ActionPayload):
    STATE["updatedAt"] = datetime.now(timezone.utc).isoformat()
    await broadcast(STATE)
    return STATE


@app.websocket("/ws/monitor")
async def ws_monitor(ws: WebSocket):
    await ws.accept()
    CLIENTS.add(ws)
    try:
        await ws.send_json(STATE)
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        CLIENTS.discard(ws)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
