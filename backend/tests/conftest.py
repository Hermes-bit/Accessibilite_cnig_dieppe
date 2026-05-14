import os

import pytest
from sqlalchemy import text

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret")

from app import create_app, db as _db
from app.models.user import AppUser

TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "testpassword123"


@pytest.fixture(scope="session")
def app():
    app = create_app("testing")
    with app.app_context():
        with _db.engine.connect() as conn:
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS cnig_accessibilite"))
            conn.commit()
        _db.create_all()
        if not AppUser.query.filter_by(email=TEST_EMAIL).first():
            user = AppUser(email=TEST_EMAIL, user_type="admin", is_active=True)
            user.set_password(TEST_PASSWORD)
            user.first_login = False
            _db.session.add(user)
            _db.session.commit()
        yield app


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def auth_headers(client):
    resp = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    data = resp.get_json() or {}
    token = data.get("access_token", "")
    return {"Authorization": f"Bearer {token}"}
