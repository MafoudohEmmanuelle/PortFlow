import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

def test_gmail():
    print("=== Test connexion Gmail SMTP ===")
    print(f"Host: {settings.SMTP_HOST}")
    print(f"Port: {settings.SMTP_PORT}")
    print(f"User: {settings.SMTP_USER}")
    
    try:
        # Créer le message
        msg = MIMEMultipart('alternative')
        msg['From'] = settings.SMTP_FROM
        msg['To'] = "destinataire@test.com"  # Change par ton email
        msg['Subject'] = "Test PortFlow - Connexion Gmail"
        
        body = """
        <html>
        <body>
            <h2>🧪 Test PortFlow</h2>
            <p>Ceci est un email de test pour vérifier la connexion SMTP Gmail.</p>
            <p>Si vous recevez ce message, la configuration est correcte !</p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Connexion et envoi
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        
        print("✅ Email envoyé avec succès !")
        print(f"   Vérifie la boîte de {msg['To']}")
        
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_gmail()