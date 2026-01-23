import pytest
import pytest_asyncio
import sys
import os
import asyncio
from typing import Dict, Any

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from backend.database.sqlite import SQLiteDatabase

# Mock the database connection for testing
class TestSQLiteDatabase(SQLiteDatabase):
    def __init__(self, db_path):
        super().__init__(db_path)

@pytest.fixture
def db_path():
    path = "./test_upsert.db"
    yield path
    if os.path.exists(path):
        os.remove(path)

@pytest_asyncio.fixture
async def db(db_path):
    database = TestSQLiteDatabase(f"sqlite+aiosqlite:///{db_path}")
    await database.connect()
    yield database
    await database.disconnect()

@pytest.mark.asyncio
async def test_upsert_tool_configs(db):
    tools = [
        {"tool_id": "t1", "tool_name": "Tool 1", "is_premium": False},
        {"tool_id": "t2", "tool_name": "Tool 2", "is_premium": True},
    ]

    # Insert
    results = await db.upsert_tool_configs(tools)
    assert len(results) == 2

    # Verify
    configs = await db.get_tool_configs()
    assert len(configs) == 2

    t1 = await db.get_tool_config("t1")
    assert t1["tool_name"] == "Tool 1"

    # Update
    tools_update = [
        {"tool_id": "t1", "tool_name": "Tool 1 Updated", "is_premium": False},
        {"tool_id": "t3", "tool_name": "Tool 3", "is_premium": False},
    ]

    results = await db.upsert_tool_configs(tools_update)

    # Verify update and insert
    t1 = await db.get_tool_config("t1")
    assert t1["tool_name"] == "Tool 1 Updated"

    t3 = await db.get_tool_config("t3")
    assert t3 is not None

    configs = await db.get_tool_configs()
    assert len(configs) == 3

@pytest.mark.asyncio
async def test_upsert_tool_configs_bug_fix(db):
    # Test that passing tool_id in config_data doesn't crash (regression test for previous bug)
    tools = [
        {"tool_id": "t1", "tool_name": "Tool 1"},
    ]
    # This should not raise TypeError
    await db.upsert_tool_configs(tools)

    t1 = await db.get_tool_config("t1")
    assert t1["tool_name"] == "Tool 1"
