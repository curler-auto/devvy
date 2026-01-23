import asyncio
import time
import httpx
import uvicorn
import multiprocessing
import os
import sys

# Add backend to python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def start_server():
    os.environ['APP_MODE'] = 'desktop'
    # Use different port to avoid conflict
    uvicorn.run("server:app", host="127.0.0.1", port=8002, log_level="warning")

async def run_benchmark():
    print("Waiting for server to start...")
    # Wait for server to be up
    async with httpx.AsyncClient() as client:
        retries = 10
        while retries > 0:
            try:
                await client.get("http://127.0.0.1:8002/")
                break
            except httpx.ConnectError:
                time.sleep(1)
                retries -= 1
        if retries == 0:
            print("Server failed to start")
            return False

    print("Server started. Running benchmark...")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Define requests
        long_req = {
            "script": "sleep 2; echo 'Done sleeping'",
            "workingDir": "/tmp"
        }

        short_req = {
            "script": "echo 'Short'",
            "workingDir": "/tmp"
        }

        # Start long request
        print("Sending long request (2s sleep)...")
        long_task = asyncio.create_task(
            client.post("http://127.0.0.1:8002/api/execute-script", json=long_req)
        )

        # Small delay to ensure long request reaches server processing
        await asyncio.sleep(0.5)

        # Start short request
        print("Sending short request...")
        start_time = time.time()
        short_response = await client.post("http://127.0.0.1:8002/api/execute-script", json=short_req)
        end_time = time.time()

        duration = end_time - start_time
        print(f"Short request took: {duration:.4f} seconds")

        # Wait for long request to finish
        try:
             await long_task
        except Exception as e:
             print(f"Long task failed: {e}")

        if duration > 1.5:
            print("FAIL: Short request was blocked by long request.")
            return False
        else:
            print("SUCCESS: Short request was handled concurrently.")
            return True

if __name__ == "__main__":
    # Start server in a separate process
    server_process = multiprocessing.Process(target=start_server)
    server_process.start()

    try:
        success = asyncio.run(run_benchmark())
        if not success:
            sys.exit(1)
    finally:
        server_process.terminate()
        server_process.join()
