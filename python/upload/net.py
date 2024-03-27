import asyncio
import contextlib
import certifi
import socket
import ssl
import time
import uuid

from aiohttp import ClientSession, ClientTimeout, TCPConnector
from aiohttp.web import Application
from aiohttp.web_runner import AppRunner, SockSite
from grpclib import GRPCError
from grpclib import GRPCError, Status
from grpclib.exceptions import StreamTerminatedError
from typing import (
    Any,
    AsyncIterator,
    Dict,
    List,
    Optional,
    Type,
    TypeVar,
)


RETRYABLE_GRPC_STATUS_CODES = [
    Status.DEADLINE_EXCEEDED,
    Status.UNAVAILABLE,
    Status.CANCELLED,
    Status.INTERNAL,
]

def http_client_with_tls(timeout: Optional[float]) -> ClientSession:
    """Create a new HTTP client session with standard, bundled TLS certificates.

    This is necessary to prevent client issues on some system where Python does
    not come pre-installed with specific TLS certificates that are necessary to
    connect to AWS S3 bucket URLs.

    Specifically: the error "unable to get local issuer certificate" when making
    an aiohttp request.
    """
    ssl_context = ssl.create_default_context(cafile=certifi.where())
    connector = TCPConnector(ssl=ssl_context)
    return ClientSession(connector=connector, timeout=ClientTimeout(total=timeout))


@contextlib.asynccontextmanager
async def run_temporary_http_server(app: Application):
    # Allocates a random port, runs a server in a context manager
    # This is used in various tests
    sock = socket.socket()
    sock.bind(("", 0))
    port = sock.getsockname()[1]
    host = f"http://127.0.0.1:{port}"

    runner = AppRunner(app)
    await runner.setup()
    site = SockSite(runner, sock=sock)
    await site.start()
    try:
        yield host
    finally:
        await runner.cleanup()





async def retry_transient_errors(
    fn,
    *args,
    base_delay: float = 0.1,
    max_delay: float = 1,
    delay_factor: float = 2,
    max_retries: Optional[int] = 3,
    additional_status_codes: list = [],
    attempt_timeout: Optional[float] = None,  # timeout for each attempt
    total_timeout: Optional[float] = None,  # timeout for the entire function call
    attempt_timeout_floor=2.0,  # always have at least this much timeout (only for total_timeout)
):
    """Retry on transient gRPC failures with back-off until max_retries is reached.
    If max_retries is None, retry forever."""

    delay = base_delay
    n_retries = 0

    status_codes = [*RETRYABLE_GRPC_STATUS_CODES, *additional_status_codes]

    idempotency_key = str(uuid.uuid4())

    t0 = time.time()
    if total_timeout is not None:
        total_deadline = t0 + total_timeout
    else:
        total_deadline = None

    while True:
        metadata = [("x-idempotency-key", idempotency_key), ("x-retry-attempt", str(n_retries))]
        if n_retries > 0:
            metadata.append(("x-retry-delay", str(time.time() - t0)))
        timeouts = []
        if attempt_timeout is not None:
            timeouts.append(attempt_timeout)
        if total_timeout is not None:
            timeouts.append(max(total_deadline - time.time(), attempt_timeout_floor))
        if timeouts:
            timeout = min(timeouts)  # In case the function provided both types of timeouts
        else:
            timeout = None
        try:
            return await fn(*args, metadata=metadata, timeout=timeout)
        except (StreamTerminatedError, GRPCError, socket.gaierror, asyncio.TimeoutError) as exc:
            if isinstance(exc, GRPCError) and exc.status not in status_codes:
                raise exc

            if max_retries is not None and n_retries >= max_retries:
                raise exc

            if total_deadline and time.time() + delay + attempt_timeout_floor >= total_deadline:
                # no point sleeping if that's going to push us past the deadline
                raise exc

            n_retries += 1

            await asyncio.sleep(delay)
            delay = min(delay * delay_factor, max_delay)

