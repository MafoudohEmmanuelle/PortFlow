from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional

class TrackingCreate(BaseModel):
    dossier_id: int
    position: str = Field(..., min_length=1)
    etd: Optional[date] = None
    eta: Optional[date] = None

class TrackingUpdate(BaseModel):
    position: Optional[str] = None
    etd: Optional[date] = None
    eta: Optional[date] = None

class TrackingResponse(BaseModel):
    id: int
    dossier_id: int
    position: str
    etd: Optional[date] = None
    eta: Optional[date] = None
    utilisateur_id: int
    utilisateur_nom: Optional[str] = None
    date_creation: datetime
    
    class Config:
        from_attributes = True

class TrackingHistoryResponse(BaseModel):
    dossier_id: int
    tracking_entries: list[TrackingResponse]
    total: int

class TrackingLatestResponse(BaseModel):
    dossier_id: int
    position: str
    etd: Optional[date] = None
    eta: Optional[date] = None
    date_creation: datetime
    utilisateur_nom: Optional[str] = None