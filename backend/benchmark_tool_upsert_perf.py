import asyncio
import os
import sys
import time

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.sqlite import SQLiteDatabase

async def benchmark():
    """
    Benchmark comparing N+1 upserts vs Bulk upsert.
    """
    db_path = "benchmark_perf.db"
    db_url = f"sqlite+aiosqlite:///{db_path}"

    # Cleanup before start
    if os.path.exists(db_path):
        os.remove(db_path)

    # Generate test data
    num_tools = 100
    tools_data = [
        {
            "tool_id": f"tool-{i}",
            "tool_name": f"Tool {i}",
            "is_premium": i % 2 == 0
        }
        for i in range(num_tools)
    ]

    print(f"Benchmarking upsert of {num_tools} tools...")
    print("-" * 40)

    # ---------------------------------------------------------
    # 1. Benchmark Loop (N+1)
    # ---------------------------------------------------------

    # Initialize fresh DB
    db = SQLiteDatabase(db_url)
    await db.connect()

    start_time = time.time()
    for tool in tools_data:
        await db.upsert_tool_config(tool["tool_id"], tool)
    end_time = time.time()

    loop_duration = end_time - start_time
    print(f"Loop (N+1) duration: {loop_duration:.4f} seconds")

    # Cleanup
    await db.disconnect()
    if os.path.exists(db_path):
        os.remove(db_path)

    # ---------------------------------------------------------
    # 2. Benchmark Bulk
    # ---------------------------------------------------------

    # Initialize fresh DB
    db = SQLiteDatabase(db_url)
    await db.connect()

    start_time = time.time()
    await db.upsert_tool_configs(tools_data)
    end_time = time.time()

    bulk_duration = end_time - start_time
    print(f"Bulk duration:       {bulk_duration:.4f} seconds")

    # Cleanup
    await db.disconnect()
    if os.path.exists(db_path):
        os.remove(db_path)

    # ---------------------------------------------------------
    # Results
    # ---------------------------------------------------------
    print("-" * 40)
    if bulk_duration > 0:
        speedup = loop_duration / bulk_duration
        print(f"Speedup:             {speedup:.2f}x")
    else:
        print("Bulk update was instantaneous (0.0000s)")

if __name__ == "__main__":
    asyncio.run(benchmark())
