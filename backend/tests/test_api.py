def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"


def test_login_success(client):
    resp = client.post("/auth/login", json={"username": "admin", "password": "changeme"})
    assert resp.status_code == 200
    data = resp.get_json()
    assert "access_token" in data


def test_login_invalid(client):
    resp = client.post("/auth/login", json={"username": "admin", "password": "wrong"})
    assert resp.status_code == 401


def test_layers_requires_auth(client):
    resp = client.get("/api/v1/layers/troncons")
    assert resp.status_code == 401


def test_list_layers(client, auth_headers):
    resp = client.get("/api/v1/layers", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert "layers" in data
    assert "troncons" in data["layers"]
