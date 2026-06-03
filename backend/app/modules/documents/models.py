from sqlalchemy.sql import func
from ...database import Base
from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey

class DocumentDossier(Base):
    __tablename__ = "document_dossier"
    
    id = Column(Integer, primary_key=True)
    dossier_id = Column(Integer, ForeignKey("dossiers_importation.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    obtenu = Column(Boolean, nullable=True, default=False)
    date_reception = Column(DateTime(timezone=True), nullable=True)
    date_modification = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<DocumentDossier(id={self.id}, dossier_id={self.dossier_id})>"