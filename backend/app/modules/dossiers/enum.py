from enum import Enum

class StatutDossier(str, Enum):
    EN_ATTENTE = "en_attente"
    DEPART = "depart"
    ARRIVEE = "arrivee"
    ARRIVEE_SURESTARIES = "arrivee_surestaries"
    SORTIE = "sortie"
    SORTIE_SURESTARIES = "sortie_surestaries"