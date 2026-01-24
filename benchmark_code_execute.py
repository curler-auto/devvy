import asyncio
import time
import httpx
import multiprocessing
import os
import sys

# Add backend to python path
sys.path.insert(0, os.path.abspath("backend"))


def start_server():
    os.environ["APP_MODE"] = "desktop"
    # Use different port to avoid conflict
    import uvicorn

    # Need to run from root so it finds backend.server
    uvicorn.run("backend.server:app", host="127.0.0.1", port=8003, log_level="warning")


async def run_benchmark():
    print("Waiting for server to start...")
    # Wait for server to be up
    async with httpx.AsyncClient() as client:
        retries = 20
        while retries > 0:
            try:
                await client.get("http://127.0.0.1:8003/")
                break
            except httpx.ConnectError:
                time.sleep(0.5)
                retries -= 1
        if retries == 0:
            print("Server failed to start")
            return False

    print("Server started. Running benchmark...")

    async with httpx.AsyncClient(timeout=10.0) as client:
        req_body = {
            "language": "python",
            "code": "print('hello')",
            "configId": "test",
        }

        # The server takes 0.5s to process this request.
        # If we send 2 requests concurrently:
        # - Non-blocking: Total time approx 0.5s
        # - Blocking: Total time approx 1.0s

        start_time = time.time()

        # Fire 2 requests concurrently
        tasks = [
            client.post("http://127.0.0.1:8003/api/code/execute", json=req_body),
            client.post("http://127.0.0.1:8003/api/code/execute", json=req_body),
        ]

        await asyncio.gather(*tasks)

        end_time = time.time()
        duration = end_time - start_time

        print(f"Two concurrent requests took: {duration:.4f} seconds")

        # Threshold: if it takes significantly more than 0.6s, it's likely blocking
        if duration > 0.9:
            print("FAIL: Requests were processed sequentially (blocking).")
            return False
        else:
            print("SUCCESS: Requests were processed concurrently (non-blocking).")
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
