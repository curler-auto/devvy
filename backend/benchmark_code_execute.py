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
    os.environ["APP_MODE"] = "desktop"
    # Use different port to avoid conflict
    uvicorn.run("server:app", host="127.0.0.1", port=8003, log_level="warning")


async def run_benchmark():
    print("Waiting for server to start...")
    # Wait for server to be up
    async with httpx.AsyncClient() as client:
        retries = 10
        while retries > 0:
            try:
                await client.get("http://127.0.0.1:8003/")
                break
            except httpx.ConnectError:
                time.sleep(1)
                retries -= 1
        if retries == 0:
            print("Server failed to start")
            return False

    print("Server started. Running benchmark for /api/code/execute...")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Define requests
        # execution time is simulated as 0.5s in the server
        req_data = {"language": "python", "code": "print('hello')", "configId": "123"}

        # We want to see if multiple requests are handled concurrently.
        # If blocking, 3 requests would take 1.5s.
        # If async, they should take ~0.5s total (plus overhead).

        start_time = time.time()

        tasks = []
        print("Sending 3 concurrent requests...")
        for i in range(3):
            tasks.append(
                client.post("http://127.0.0.1:8003/api/code/execute", json=req_data)
            )

        responses = await asyncio.gather(*tasks)

        end_time = time.time()
        duration = end_time - start_time

        print(f"Total duration for 3 requests: {duration:.4f} seconds")

        for r in responses:
            if r.status_code != 200:
                print(f"Request failed: {r.status_code}")
                return False

        # If it takes significantly more than 0.6s (allowing for some overhead), it might be blocking
        # But wait, python asyncio sleep is concurrent.
        # If it was blocking time.sleep(0.5), 3 requests would be 1.5s.

        if duration < 1.0:
            print("SUCCESS: Requests were handled concurrently.")
            return True
        else:
            print("FAIL: Requests seem to be processed sequentially.")
            return False


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
