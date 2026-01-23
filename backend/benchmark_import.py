import asyncio
import time
import os
import sys
import uuid
import json

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database.sqlite import SQLiteDatabase

async def benchmark_import():
    db_path = "sqlite+aiosqlite:///./benchmark_import.db"
    db = SQLiteDatabase(db_path)
    await db.connect()

    # Setup User and Collection
    user_id = "bench_user"
    collection_id = str(uuid.uuid4())

    # Sequential Benchmark
    print("Running Sequential Benchmark (50 items)...")
    start_time = time.time()
    for i in range(50):
        item_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "collection_id": collection_id,
            "folder_id": None,
            "name": f"Item {i}",
            "tool_id": "test-tool",
            "data": {"foo": "bar"}
        }
        await db.create_saved_item(item_data)
    end_time = time.time()
    seq_time = end_time - start_time
    print(f"Sequential: {seq_time:.4f}s")

    # Bulk Benchmark
    print("Running Bulk Benchmark (50 items)...")
    items_to_create = []
    for i in range(50):
        items_to_create.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "collection_id": collection_id,
            "folder_id": None,
            "name": f"Bulk Item {i}",
            "tool_id": "test-tool",
            "data": {"foo": "bar"}
        })

    start_time = time.time()
    await db.create_saved_items_bulk(items_to_create)
    end_time = time.time()
    bulk_time = end_time - start_time
    print(f"Bulk: {bulk_time:.4f}s")

    if bulk_time > 0:
        print(f"Improvement: {seq_time / bulk_time:.2f}x faster")
    else:
        print("Bulk too fast to measure improvement properly (0s)")

    await db.disconnect()
    if os.path.exists("benchmark_import.db"):
        os.remove("benchmark_import.db")

if __name__ == "__main__":
    asyncio.run(benchmark_import())
