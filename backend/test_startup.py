import os, sys, traceback

os.environ.setdefault("SECRET_KEY", "test-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-key")
os.environ.setdefault("FLASK_ENV", "production")

# Construit DATABASE_URL depuis DB_PASS pour éviter le problème d'encodage du @
if "DATABASE_URL" not in os.environ:
    pw = os.environ.get("DB_PASS", "")
    if not pw:
        print("Usage: DB_PASS='motdepasse' python3 test_startup.py")
        sys.exit(1)
    os.environ["DATABASE_URL"] = (
        f"postgresql://hermes58:{pw}"
        f"@postgresql-hermes58.alwaysdata.net:5432/hermes58_a4"
    )

try:
    from app import create_app
    app = create_app("production")
    print("Flask OK")
except Exception as e:
    print(f"ERREUR: {e}")
    traceback.print_exc()
    sys.exit(1)
