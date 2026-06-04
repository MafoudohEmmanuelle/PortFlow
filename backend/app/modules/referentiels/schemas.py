from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ArmateurCreate(BaseModel):
    nom: str
    lien_tracking: Optional[str] = None

class ArmateurInfo(BaseModel):
    id: int
    nom: str
    lien_tracking: Optional[str] = None
    actif: bool
    date_creation: datetime

    class Config:
        from_attributes = True

class ArmateurUpdate(BaseModel):
    nom: Optional[str] = None
    lien_tracking: Optional[str] = None
    actif: Optional[bool] = None

class DocumentCreate(BaseModel):
    nom: str
    responsable: str
    code: Optional[str] = None

class DocumentInfo(BaseModel):
    id: int
    nom: str
    responsable: Optional[str]=None
    code: Optional[str] = None
    actif: bool
    date_creation: Optional[datetime]=None

    class Config:
        from_attributes = True

class DocumentUpdate(BaseModel):
    nom: Optional[str] = None
    responsable: Optional[str] = None
    code: Optional[str] = None
    actif: Optional[bool] = None