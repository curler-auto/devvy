## 2026-01-24 - [Async Blocking Pattern]
**Learning:** Found that `async def` endpoints in FastAPI containing CPU-bound synchronous code (like `json.loads` on large payloads) block the entire event loop, freezing other requests.
**Action:** Use `starlette.concurrency.run_in_threadpool` for any CPU-intensive synchronous operations within `async def` handlers, or use standard `def` handlers if async I/O isn't needed.
