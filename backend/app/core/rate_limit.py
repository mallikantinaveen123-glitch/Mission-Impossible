import time
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, status, Request

class InMemoryRateLimiter:
    """
    Thread-safe, sliding-window rate limiter for sensitive authentication and OTP routes.
    Avoids external Redis dependency while preventing brute-force attacks.
    """
    def __init__(self):
        # Store timestamps of requests: key -> list of float timestamps
        self._history: Dict[str, List[float]] = defaultdict(list)

    def check(self, key: str, max_requests: int, window_seconds: int) -> None:
        now = time.time()
        cutoff = now - window_seconds
        
        # Filter out timestamps outside the sliding window
        recent = [t for t in self._history[key] if t > cutoff]
        self._history[key] = recent

        if len(recent) >= max_requests:
            retry_after = int(window_seconds - (now - recent[0])) if recent else window_seconds
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {max(1, retry_after)} seconds.",
                headers={"Retry-After": str(max(1, retry_after))}
            )

        self._history[key].append(now)

# Global rate limiter instance
limiter = InMemoryRateLimiter()

def get_client_ip(request: Request) -> str:
    """Extracts client IP or forward-header IP safely."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

