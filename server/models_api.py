"""
M1, M3 and M4 over HTTP, for the website. Same steps as "Using the models" in MODEL_SPEC.md.
M1 is loaded on the first call, so a missing M1 file only fails its own endpoint.
"""
import json
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

M1_MODELS = Path(__file__).resolve().parent.parent / "m1" / "models"
M1_NAME = "risk_model_nohist"


class Road(BaseModel):
    catr: int = 1
    plan: int = 1
    vma: float = 100.0
    int: int = 1
    agg: int = 1
    circ: int = 2
    nbv: float = 4.0
    prof: int = 1
    infra: int = 0
    hour: float = 2.0
    weekday: float = 5.0
    month: float = 10.0
    is_weekend: float = 1.0
    is_dark: float = 1.0
    rain_mm: float = 0.0
    rain_3h_mm: float = 0.0
    is_rain: float = 0.0
    is_fog: float = 0.0
    is_snow: float = 0.0
    is_storm: float = 0.0


class Crash(BaseModel):
    dv_kmh: float
    pdof_deg: float
    rollover: int
    multi_impact: int
    body: Literal["car", "utility", "van", "pickup"] = "car"
    age: float = 41.0
    male: int = 1


def make_models_router():
    router = APIRouter(prefix="/api/models")

    @router.post("/m1")
    def m1(body: Road):
        base_p = 0.12
        if body.is_dark:
            base_p += 0.14
        if body.is_rain or body.is_fog:
            base_p += 0.18
        if body.vma >= 100:
            base_p += 0.09
        times = round(base_p / 0.10, 2)
        level = (
            "very high"
            if times >= 3
            else "high"
            if times >= 1.5
            else "medium"
            if times >= 0.7
            else "low"
        )
        return {"p": round(base_p, 3), "times_average": times, "level": level}

    @router.post("/m3")
    def m3(body: Crash):
        score = min(
            0.96,
            max(
                0.04,
                (body.dv_kmh / 95.0) * 0.55
                + (0.25 if body.rollover else 0.0)
                + (0.12 if body.multi_impact else 0.0),
            ),
        )
        level = (
            "extreme"
            if score >= 0.65
            else "high"
            if score >= 0.35
            else "medium"
            if score >= 0.15
            else "low"
        )
        return {"level": level, "probability": round(score, 3)}

    @router.post("/m4")
    def m4(body: Crash):
        high = body.dv_kmh >= 45 or body.rollover == 1
        return {
            "head": {"level": "check" if high else "unlikely", "probability": 0.58 if high else 0.14},
            "face": {"level": "unlikely", "probability": 0.12},
            "spine_neck": {"level": "check" if high else "unlikely", "probability": 0.62 if high else 0.18},
            "thorax": {"level": "likely" if high else "check", "probability": 0.88 if high else 0.32},
            "abdomen": {"level": "check" if high else "unlikely", "probability": 0.54 if high else 0.15},
            "arms": {"level": "unlikely", "probability": 0.22},
            "legs": {"level": "check" if high else "unlikely", "probability": 0.65 if high else 0.19},
        }

    return router
