import os
from dataclasses import dataclass, field
from typing import List


@dataclass
class Settings:
    """Application settings loaded from environment variables."""

    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "0.0.0.0")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
    ALLOWED_ORIGINS_RAW: str = os.getenv("ALLOWED_ORIGINS", "")

    DEFAULT_SHOTS: int = 1024
    MAX_SHOTS: int = 100_000
    MAX_QUBITS: int = 24
    DEFAULT_BACKEND: str = "qiskit-aer"

    @property
    def allowed_origins(self) -> List[str]:
        origins = set()
        if self.FRONTEND_ORIGIN:
            origins.add(self.FRONTEND_ORIGIN.strip())
        if self.ALLOWED_ORIGINS_RAW:
            for origin in self.ALLOWED_ORIGINS_RAW.split(","):
                clean = origin.strip()
                if clean:
                    origins.add(clean)
        # Always ensure localhost:3000 and 127.0.0.1:3000 are present for local Next.js development
        origins.add("http://localhost:3000")
        origins.add("http://127.0.0.1:3000")
        return sorted(list(origins))


settings = Settings()
