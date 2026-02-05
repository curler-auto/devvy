import pytest
from httpx import AsyncClient, ASGITransport
from backend.server import app

@pytest.mark.asyncio
async def test_execute_script_basic():
    """Test basic script execution functionality."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        script = 'echo "Hello World"'
        response = await ac.post(
            "/api/execute-script",
            json={
                "script": script,
                "workingDir": None,
                "env": None
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "Hello World" in data["output"]
        assert data["exitCode"] == 0
        assert "executionTime" in data

@pytest.mark.asyncio
async def test_execute_script_with_env():
    """Test script execution with environment variables."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        script = 'echo "Value is $TEST_VAR"'
        response = await ac.post(
            "/api/execute-script",
            json={
                "script": script,
                "env": {"TEST_VAR": "Testing123"}
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "Value is Testing123" in data["output"]

@pytest.mark.asyncio
async def test_execute_script_error():
    """Test script execution with non-zero exit code."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        script = 'exit 1'
        response = await ac.post(
            "/api/execute-script",
            json={
                "script": script
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["exitCode"] == 1
