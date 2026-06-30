from sqlalchemy.sql import func
from sqlalchemy import Column,Integer,Boolean,DateTime,JSON,Text, ForeignKey,String
from app.database import Base

class Rapport(Base):
    __tablename__="rapports"

    id = Column(Integer, primary_key=True)
    dossier_id=Column(Integer, ForeignKey("dossiers_importation.id"),nullable=False)
    type_rapport=Column(String(50),nullable=False)
    contenu=Column(JSON, nullable=False)
    date_generation= Column(DateTime, server_default= func.now())
    generateur_id=Column(Integer, ForeignKey("utilisateurs.id"), nullable=False)

    def __repr__(self):
        f"<Rapport id={self.id} dossier={self.dossier_id} type={self.type_rapport}>"