import os
from datetime import timedelta


class BaseConfig:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-in-prod")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-jwt-change-in-prod")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "connect_args": {"options": "-csearch_path=cnig_accessibilite,public"},
    }

    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost").split(",")

    RATELIMIT_DEFAULT = "200 per day;50 per hour"
    RATELIMIT_STORAGE_URL = os.environ.get("REDIS_URL", "memory://")

    # Dossier mviewer à servir comme fichiers statiques (vide = désactivé)
    MVIEWER_DIR = os.environ.get(
        "MVIEWER_DIR",
        os.path.normpath(
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "mviewer-dist")
        ),
    )


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "postgresql://hermes58:PASSWORD@postgresql-hermes58.alwaysdata.net:5432/hermes58_a4",
    )
    RATELIMIT_DEFAULT = "10000 per day;1000 per hour"


class ProductionConfig(BaseConfig):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "")
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Strict"


class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "TEST_DATABASE_URL",
        "postgresql://hermes58:PASSWORD@postgresql-hermes58.alwaysdata.net:5432/hermes58_a4_test",
    )
    SECRET_KEY = "test-secret-key"
    JWT_SECRET_KEY = "test-jwt-secret"


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
