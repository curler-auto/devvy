import asyncio
import time
import os
import sys
from pathlib import Path
from typing import List, Dict, Any

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from backend.database.sqlite import SQLiteDatabase

async def benchmark_sqlite_current():
    db_path = "sqlite+aiosqlite:///./benchmark.db"
    db = SQLiteDatabase(db_path)
    await db.connect()

    # Create 100 sample tools
    tools = [
        {"tool_id": f"tool-{i}", "tool_name": f"Tool {i}", "is_premium": False}
        for i in range(100)
    ]

    # Warmup
    print("Warming up...")
    for tool_data in tools[:10]:
        # Fix for existing bug in sqlite.py where passing tool_id in config_data causes TypeError
        data_without_id = {k: v for k, v in tool_data.items() if k != "tool_id"}
        await db.upsert_tool_config(tool_data["tool_id"], data_without_id)

    print("Running baseline benchmark (100 items)...")
    start_time = time.time()
    for tool_data in tools:
        data_without_id = {k: v for k, v in tool_data.items() if k != "tool_id"}
        await db.upsert_tool_config(tool_data["tool_id"], data_without_id)
    end_time = time.time()

    print(f"SQLite Current (100 items): {end_time - start_time:.4f}s")

    await db.disconnect()

    # Clean up
    if os.path.exists("./benchmark.db"):
        os.remove("./benchmark.db")

async def benchmark_sqlite_optimized():
    db_path = "sqlite+aiosqlite:///./benchmark_opt.db"
    db = SQLiteDatabase(db_path)
    await db.connect()

    # Create 100 sample tools
    tools = [
        {"tool_id": f"tool-{i}", "tool_name": f"Tool {i}", "is_premium": False}
        for i in range(100)
    ]

    # Warmup
    if hasattr(db, 'upsert_tool_configs'):
        print("Warming up optimized...")
        await db.upsert_tool_configs(tools[:10])

        print("Running optimized benchmark (100 items)...")
        start_time = time.time()
        await db.upsert_tool_configs(tools)
        end_time = time.time()

        print(f"SQLite Optimized (100 items): {end_time - start_time:.4f}s")
    else:
        print("Optimized method upsert_tool_configs not implemented yet.")

    await db.disconnect()

    if os.path.exists("./benchmark_opt.db"):
        os.remove("./benchmark_opt.db")

if __name__ == "__main__":
    print("=== BENCHMARK START ===")
    asyncio.run(benchmark_sqlite_current())
    asyncio.run(benchmark_sqlite_optimized())
    print("=== BENCHMARK END ===")
