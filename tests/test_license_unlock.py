import sys
import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(os.path.dirname(__file__), "../backend"))

from backend.server import app, get_database

# Create a mock database
class MockDB:
    def __init__(self):
        self.organizations = AsyncMock()
        self.organizations.find_one = AsyncMock(return_value=None)

        # For check_tool_access
        self.get_tool_config = AsyncMock(return_value={"is_premium": True})

mock_db = MockDB()

async def override_get_database():
    return mock_db

app.dependency_overrides[get_database] = override_get_database

client = TestClient(app)

def test_validate_license_unlocked():
    # Even with no organization found (which MockDB returns), it should be premium
    response = client.get(
        "/api/license/validate",
        headers={"Authorization": "Bearer desktop-token"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_premium"] == True
    assert data["license_tier"] == "premium"

def test_check_tool_access_unlocked():
    # Mock a premium tool
    mock_db.get_tool_config.return_value = {"tool_id": "premium-tool", "is_premium": True}

    response = client.get(
        "/api/tools/check-access/premium-tool",
        headers={"Authorization": "Bearer desktop-token"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["has_access"] == True
    assert data["is_premium_tool"] == True
    assert data["license_tier"] == "premium"

def test_check_tool_access_free_tool():
    # Mock a free tool
    mock_db.get_tool_config.return_value = {"tool_id": "free-tool", "is_premium": False}

    response = client.get(
        "/api/tools/check-access/free-tool",
        headers={"Authorization": "Bearer desktop-token"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["has_access"] == True
    assert data["is_premium_tool"] == False
    assert data["license_tier"] == "premium"
