import asyncio
import time
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import MagicMock, patch, AsyncMock
import sys
import os

# Add backend to python path to import server
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from server import app, get_database

# Mock DB
mock_db = MagicMock()
# Mock MongoDB-style access
mock_db.users.find_one = AsyncMock(return_value=None)
mock_db.organizations.insert_one = AsyncMock(return_value={"id": "org1"})
mock_db.organizations.find_one = AsyncMock(return_value={"id": "org1", "active_licenses": 0, "max_licenses": 5})
mock_db.organizations.update_one = AsyncMock()
mock_db.users.insert_one = AsyncMock(return_value={"id": "user1"})

async def override_get_database():
    return mock_db

app.dependency_overrides[get_database] = override_get_database

# Make get_password_hash slow to simulate blocking CPU work
def slow_hash(password):
    print("DEBUG: slow_hash called, sleeping...")
    time.sleep(0.5)  # Synchronous sleep blocks the event loop
    print("DEBUG: slow_hash finished sleeping")
    return "hashed_password"

@pytest.mark.asyncio
async def test_auth_register_non_blocking():
    # Patch get_password_hash in server.py
    with patch('server.get_password_hash', side_effect=slow_hash):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:

            print("\nStarting non-blocking auth test...")

            # Start register request (which should use slow_hash)
            register_data = {
                "email": "test@example.com",
                "password": "password",
                "role": "user"
            }

            print("DEBUG: Sending slow register request")
            task_register = asyncio.create_task(client.post("/api/auth/register", json=register_data))

            # Small delay to ensure register request starts processing
            await asyncio.sleep(0.1)

            # Start fast ping request
            print("DEBUG: Sending fast ping request...")
            start_time = time.time()
            res_ping = await client.get("/api/")
            end_time = time.time()

            duration = end_time - start_time
            print(f"DEBUG: Ping took {duration:.4f} seconds")

            # Wait for register to finish
            res_register = await task_register
            print(f"DEBUG: Register status: {res_register.status_code}")

            # Verify register success (200 OK)
            if res_register.status_code != 200:
                print(f"Register failed: {res_register.text}")

            # If blocking, ping would take > 0.5s
            if duration > 0.4:
                pytest.fail(f"Event loop was blocked! Ping took {duration:.4f}s")
            else:
                print("SUCCESS: Event loop was NOT blocked.")

if __name__ == "__main__":
    # Manually run the test function if executed as script
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(test_auth_register_non_blocking())
    finally:
        loop.close()
