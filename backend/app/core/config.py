import os
from dataclasses import dataclass, field
from typing import List


def _load_env_files(override: bool = False) -> List[str]:
    """Finds and parses .env files into os.environ without external dependencies."""
    loaded_from: List[str] = []
    file_dir = os.path.dirname(os.path.abspath(__file__))
    curr_dir = os.path.abspath(os.getcwd())
    candidates = [
        os.path.join(file_dir, "..", "..", ".env"),           # backend/.env
        os.path.join(file_dir, "..", "..", "..", ".env"),      # root .env
        os.path.join(curr_dir, "backend", ".env"),
        os.path.join(curr_dir, ".env"),
    ]
    seen = set()
    for p in candidates:
        norm = os.path.normpath(p)
        if norm in seen:
            continue
        seen.add(norm)
        if os.path.isfile(norm):
            try:
                with open(norm, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and (override or k not in os.environ):
                            os.environ[k] = v
                loaded_from.append(norm)
            except Exception:
                pass
    return loaded_from


# Auto-load on import
_detected_env_files = _load_env_files()


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

    # Database settings
    DATABASE_PATH: str = os.getenv(
        "DATABASE_PATH",
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "database", "quantum_platform.db")
    )

    # AI settings
    AI_PROVIDER: str = field(default_factory=lambda: os.getenv("AI_PROVIDER", "gemini").lower().strip())
    AI_MODEL: str = field(default_factory=lambda: os.getenv("AI_MODEL", "gemini-2.5-flash").strip())
    AI_API_KEY: str = field(default_factory=lambda: os.getenv("AI_API_KEY", os.getenv("GEMINI_API_KEY", "")).strip())

    # Detected env files list for diagnostics
    DETECTED_ENV_FILES: List[str] = field(default_factory=lambda: list(_detected_env_files))

    def reload_env(self) -> None:
        """Reloads settings from environment and .env files."""
        loaded = _load_env_files(override=True)
        if loaded:
            self.DETECTED_ENV_FILES = list(loaded)
        self.AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini").lower().strip()
        self.AI_MODEL = os.getenv("AI_MODEL", "gemini-2.5-flash").strip()
        self.AI_API_KEY = os.getenv("AI_API_KEY", os.getenv("GEMINI_API_KEY", "")).strip()

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
