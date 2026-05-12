import os

from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS

from .config import config_by_name

db = SQLAlchemy()
jwt = JWTManager()
limiter = Limiter(key_func=get_remote_address)


def create_app(config_name: str = "development") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # Mail configuration (optional — dev falls back to console logging)
    app.config.setdefault("MAIL_SERVER", os.environ.get("MAIL_SERVER", ""))
    app.config.setdefault("MAIL_PORT", int(os.environ.get("MAIL_PORT", "587")))
    app.config.setdefault("MAIL_USERNAME", os.environ.get("MAIL_USERNAME", ""))
    app.config.setdefault("MAIL_PASSWORD", os.environ.get("MAIL_PASSWORD", ""))
    app.config.setdefault("MAIL_FROM", os.environ.get("MAIL_FROM", ""))

    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)

    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )

    # Ensure app_users table exists (public schema, separate from CNIG schema)
    with app.app_context():
        from .models.user import AppUser  # noqa: F401
        db.create_all()

    from .api import api_bp
    from .auth import auth_bp

    app.register_blueprint(api_bp, url_prefix="/api/v1")
    app.register_blueprint(auth_bp, url_prefix="/auth")

    @app.route("/health")
    def health():
        return {"status": "ok", "version": "1.0.0"}

    mviewer_dir = app.config.get("MVIEWER_DIR", "")
    if mviewer_dir and os.path.isdir(mviewer_dir):
        @app.route("/", defaults={"path": "index.html"})
        @app.route("/<path:path>")
        def serve_mviewer(path):
            target = os.path.join(mviewer_dir, path)
            if os.path.isfile(target):
                return send_from_directory(mviewer_dir, path)
            return send_from_directory(mviewer_dir, "index.html")

    return app
