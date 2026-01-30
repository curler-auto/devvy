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
    # We import the app instance from server.py (which we will modify later to be blocking)
    uvicorn.run("server:app", host="127.0.0.1", port=8003, log_level="warning")


async def run_benchmark():
    print("Waiting for server to start...")
    async with httpx.AsyncClient() as client:
        retries = 20
        while retries > 0:
            try:
                await client.get("http://127.0.0.1:8003/")
                break
            except (httpx.ConnectError, httpx.ReadError):
                time.sleep(1)
                retries -= 1
        if retries == 0:
            print("Server failed to start")
            return False

    print("Server started. Running benchmark...")

    proto_content = """
    syntax = "proto3";
    package test;
    service TestService {
      rpc TestMethod (TestRequest) returns (TestResponse);
    }
    message TestRequest {
      string name = 1;
    }
    message TestResponse {
      string message = 1;
    }
    """

    async with httpx.AsyncClient(timeout=30.0) as client:
        headers = {"Authorization": "Bearer desktop-token"}

        grpc_req = {
            "server_url": "localhost:50051",  # Dummy URL
            "service": "TestService",
            "method": "TestMethod",
            "request": {"name": "World"},
            "metadata": {},
            "proto_content": proto_content,
        }

        # We send multiple grpc requests to create load on protoc
        # 10 concurrent requests to increase the chance of blocking overlap
        num_requests = 10
        tasks = []
        print(f"Sending {num_requests} concurrent gRPC requests...")

        start_time = time.time()

        # Start a "health check" probe that should be fast
        # We delay it slightly so it hits while others are processing
        async def delayed_probe():
            await asyncio.sleep(0.05)
            start = time.time()
            resp = await client.get("http://127.0.0.1:8003/")
            return time.time() - start

        probe_task = asyncio.create_task(delayed_probe())

        for _ in range(num_requests):
            tasks.append(
                asyncio.create_task(
                    client.post(
                        "http://127.0.0.1:8003/api/grpc/call",
                        json=grpc_req,
                        headers=headers,
                    )
                )
            )

        probe_duration = await probe_task
        print(f"Probe request took: {probe_duration:.4f} seconds")

        # Wait for all tasks
        await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.time() - start_time
        print(f"Total time for {num_requests} requests: {total_time:.4f} seconds")

        # If blocking, the probe should be delayed by roughly (num_requests * protoc_time) or at least > 0.1s
        # Stricter threshold: 50ms. Localhost requests should be < 10ms.
        if probe_duration > 0.05:
            print(f"FAIL: Probe was blocked (took {probe_duration:.4f}s)")
            return False
        else:
            print(f"SUCCESS: Probe was fast (took {probe_duration:.4f}s)")
            return True


if __name__ == "__main__":
    # Ensure start method is spawn for safety (though fork is default on linux)
    try:
        multiprocessing.set_start_method("spawn")
    except RuntimeError:
        pass

    server_process = multiprocessing.Process(target=start_server)
    server_process.start()

    try:
        success = asyncio.run(run_benchmark())
        if not success:
            sys.exit(1)
    finally:
        server_process.terminate()
        server_process.join()
