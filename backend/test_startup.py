import os, sys, traceback, getpass

os.environ.setdefault("SECRET_KEY", "test-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-key")
os.environ.setdefault("FLASK_ENV", "production")

if "DATABASE_URL" not in os.environ:
    pw = getpass.getpass("Mot de passe DB (hermes58_a4): ")
    os.environ["DATABASE_URL"] = (
        "postgresql://hermes58:" + pw +
        "@postgresql-hermes58.alwaysdata.net:5432/hermes58_a4"
    )

try:
    from app import create_app
    app = create_app("production")
    print("Flask OK")
except Exception as e:
    print(f"ERREUR: {e}")
    traceback.print_exc()
    sys.exit(1)
