import os, sys
os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test")
os.environ.setdefault("FLASK_ENV", "production")
try:
    from app import create_app
    app = create_app("production")
    print("Flask OK")
except Exception as e:
    print(f"ERREUR: {e}")
    sys.exit(1)
