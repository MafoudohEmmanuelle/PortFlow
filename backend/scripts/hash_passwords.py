from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Générer les hashs pour vos utilisateurs
admin_password = "admin123"
acheteur_password = "acheteur123"

admin_hash = pwd_context.hash(admin_password)
acheteur_hash = pwd_context.hash(acheteur_password)

print(f"Admin ({admin_password}): {admin_hash}")
print(f"Acheteur ({acheteur_password}): {acheteur_hash}")