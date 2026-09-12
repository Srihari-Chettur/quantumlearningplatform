import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import api_router
from app.core.config import settings
from app.database.connection import init_database

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("quantum_platform")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager to initialize database on startup."""
    try:
        init_database()
        logger.info("Database initialized successfully on application startup.")
    except Exception as e:
        logger.exception(f"Failed to initialize database: {e}")
    yield


app = FastAPI(
    title="SIH 2026 Quantum Simulation Backend",
    description="Production-quality quantum simulation backend for the interactive quantum algorithm learning platform.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Configure CORS for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Formats Pydantic validation errors cleanly without exposing internal details."""
    errors = exc.errors()
    if errors:
        first_error = errors[0]
        msg = first_error.get("msg", "Invalid request parameter.")
        if msg.startswith("Value error, "):
            msg = msg[len("Value error, "):]
        logger.warning(f"Request validation failure on {request.url.path}: {msg}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={"detail": msg}
        )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": "Request validation failed."}
    )


@app.get("/", tags=["info"], summary="Backend Service Info")
async def root_info():
    """Root endpoint returning service identity and status."""
    return {
        "service": "SIH Quantum Simulation Backend",
        "status": "ok"
    }


@app.get("/health", tags=["health"], summary="Service Health Check")
async def health_check():
    """Health check endpoint to verify backend service liveness."""
    return {"status": "ok"}


# Mount the API router
app.include_router(api_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True
    )
