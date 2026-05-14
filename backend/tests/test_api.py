TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "testpassword123"


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"


def test_login_success(client):
    resp = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert "access_token" in data


def test_login_invalid(client):
    resp = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": "wrongpassword"},
    )
    assert resp.status_code == 401


def test_stats_requires_auth(client):
    resp = client.get("/api/v1/stats")
    assert resp.status_code == 401


def test_list_layers(client):
    resp = client.get("/api/v1/layers")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "layers" in data
    assert "v_troncons" in data["layers"]
