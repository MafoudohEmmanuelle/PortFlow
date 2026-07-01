# backend/app/modules/alertes/notifiers.py
import smtplib
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.modules.auth.models import Utilisateur
from app.modules.dossiers.models import DossierImportation
from app.config import settings  # ← Correction : import de settings

class EmailNotifier:
    """Gère l'envoi des notifications par email"""
    
    def __init__(self):
        # Configuration SMTP (à ajouter dans .env)
       self.smtp_host = settings.SMTP_HOST
       self.smtp_port = settings.SMTP_PORT
       self.smtp_user = settings.SMTP_USER
       self.smtp_password = settings.SMTP_PASSWORD
       self.smtp_from = settings.SMTP_FROM
       self.app_url = getattr(settings, "APP_URL", "http://localhost:5500")
    
    def _is_configured(self) -> bool:
        """Vérifie si le SMTP est configuré"""
        return all([self.smtp_host, self.smtp_user, self.smtp_password])
    
    def _send_email(self, to_email: str, subject: str, body_html: str) -> bool:
        """Envoie un email"""
        if not self._is_configured():
            print(f"⚠️ SMTP non configuré. Email non envoyé à {to_email}")
            return False
        
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = self.smtp_from
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Version texte simple
            text_part = MIMEText(self._html_to_text(body_html), 'plain')
            # Version HTML
            html_part = MIMEText(body_html, 'html')
            
            msg.attach(text_part)
            msg.attach(html_part)
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            print(f"✅ Email envoyé à {to_email}")
            return True
            
        except Exception as e:
            print(f"❌ Erreur envoi email à {to_email}: {e}")
            return False
    
    def _html_to_text(self, html: str) -> str:
        """Convertit HTML en texte simple"""
        import re
        text = re.sub(r'<[^>]+>', '', html)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def notifier_utilisateur(self, user: Utilisateur, alertes: List[Dict[str, Any]]) -> bool:
        """Envoie un récapitulatif des alertes à un utilisateur"""
        if not alertes:
            return False
        
        # Construire le lien vers la page des alertes
        alertes_url = f"{self.app_url}/pages/alertes/alertes.html"
        
        # Grouper les alertes par dossier
        alertes_par_dossier = {}
        for alerte in alertes:
            dossier_id = alerte.get("dossier_id")
            if dossier_id not in alertes_par_dossier:
                alertes_par_dossier[dossier_id] = []
            alertes_par_dossier[dossier_id].append(alerte)
        
        # Construire le HTML
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .header {{ background: #e74c3c; color: white; padding: 20px; text-align: center; }}
                .alert-card {{ border: 1px solid #ddd; margin: 15px 0; padding: 15px; border-radius: 8px; }}
                .alert-critical {{ border-left: 4px solid #e74c3c; }}
                .alert-warning {{ border-left: 4px solid #f39c12; }}
                .alert-info {{ border-left: 4px solid #3498db; }}
                .footer {{ font-size: 12px; color: #888; text-align: center; margin-top: 30px; }}
                .badge {{ display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 12px; }}
                .badge-critical {{ background: #e74c3c; color: white; }}
                .badge-warning {{ background: #f39c12; color: white; }}
                .badge-info {{ background: #3498db; color: white; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1> PortFlow - Alertes</h1>
                <p>Gestion prédictive des surestaries</p>
            </div>
            
            <div style="padding: 20px;">
                <p>Bonjour <strong>{user.nom}</strong>,</p>
                <p>Voici le récapitulatif des alertes concernant vos dossiers d'importation :</p>

                <div style="text-align: center;">
                    <a href="{alertes_url}" class="btn">🔔 Voir mes alertes</a>
                </div>
        """
        
        for dossier_id, alertes_dossier in alertes_par_dossier.items():
            html_body += f"""
                <div class="alert-card">
                    <h3> Dossier #{dossier_id}</h3>
                    <ul>
            """
            for alerte in alertes_dossier:
                niveau = alerte.get("niveau", "info")
                message = alerte.get("message", "")
                html_body += f"""
                        <li class="alert-{niveau}">
                            <span class="badge badge-{niveau}">{niveau.upper()}</span>
                            {message}
                        </li>
                """
            html_body += """
                    </ul>
                </div>
            """
        
        html_body += f"""
                <div class="footer">
                    <p>Cet email a été généré automatiquement par PortFlow.</p>
                    <p>Pour modifier vos préférences, connectez-vous à l'application.</p>
                    <p>© 2024 - PortFlow - Gestion des surestaries</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        subject = f"PortFlow - {len(alertes)} alerte(s) sur vos dossiers"
        return self._send_email(user.email, subject, html_body)
    
    def notifier_administrateurs(self, db: Session, alertes_par_admin: Dict[int, List[Dict[str, Any]]]) -> None:
        """Envoie des notifications aux administrateurs"""
        for admin_id, alertes in alertes_par_admin.items():
            admin = db.query(Utilisateur).filter(
                Utilisateur.id == admin_id,
                Utilisateur.role == "admin"
            ).first()
            if admin and alertes:
                self.notifier_utilisateur(admin, alertes)


# Instance globale
email_notifier = EmailNotifier()