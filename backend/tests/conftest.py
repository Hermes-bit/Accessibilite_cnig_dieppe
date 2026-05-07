import os
import pytest
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret")

from app import create_app, db as _db


@pytest.fixture(scope="session")
def app():
    app = create_app("testing")
    with app.app_context():
        yield app


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def auth_headers(client):
    resp = client.post("/auth/login", json={"username": "admin", "password": "changeme"})
    token = resp.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
