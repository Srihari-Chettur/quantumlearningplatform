import os
import sqlite3
import logging
from typing import Generator
from contextlib import contextmanager
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_db_path() -> str:
    """Returns absolute path to SQLite database and ensures parent directory exists."""
    db_path = os.path.abspath(settings.DATABASE_PATH)
    parent_dir = os.path.dirname(db_path)
    if parent_dir and not os.path.exists(parent_dir):
        os.makedirs(parent_dir, exist_ok=True)
    return db_path


@contextmanager
def get_db_connection() -> Generator[sqlite3.Connection, None, None]:
    """Context manager for SQLite database connection with row factory enabled."""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path, timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    description TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    prerequisites TEXT, -- JSON array of lesson IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lesson_progress (
    user_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started', -- not_started, in_progress, completed
    completed_at TIMESTAMP,
    PRIMARY KEY (user_id, lesson_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assessment_questions (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    type TEXT NOT NULL, -- multiple_choice, multi_select, true_false, predict_prob, circuit_analysis
    question TEXT NOT NULL,
    options_json TEXT NOT NULL, -- JSON array of strings
    correct_answer TEXT NOT NULL, -- index as string or JSON array
    explanation TEXT NOT NULL,
    prerequisite_lesson_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    selected_answer TEXT NOT NULL,
    is_correct INTEGER NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coding_challenges (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    difficulty TEXT NOT NULL, -- Beginner, Intermediate, Advanced
    topic TEXT NOT NULL,
    description TEXT NOT NULL,
    objective TEXT NOT NULL,
    starter_code TEXT NOT NULL,
    starter_circuit_json TEXT,
    expected_behavior_json TEXT NOT NULL,
    hints_json TEXT NOT NULL, -- JSON array of 3 progressive hints
    solution_code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS challenge_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    challenge_id TEXT NOT NULL,
    submitted_code TEXT NOT NULL,
    circuit_json TEXT,
    simulation_result_json TEXT,
    score INTEGER NOT NULL,
    passed INTEGER NOT NULL,
    feedback TEXT NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES coding_challenges(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_progress (
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    mastery_level TEXT NOT NULL DEFAULT 'Not Started', -- Not Started, Learning, Practicing, Proficient, Mastered
    quiz_avg_score REAL DEFAULT 0.0,
    challenges_completed INTEGER DEFAULT 0,
    simulations_run INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, topic),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS simulation_runs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    num_qubits INTEGER NOT NULL,
    gate_count INTEGER NOT NULL,
    shots INTEGER NOT NULL,
    success INTEGER NOT NULL,
    counts_json TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_interactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    context_type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
"""


def init_database() -> None:
    """Initializes SQLite database tables and seeds initial educational data."""
    logger.info(f"Initializing SQLite database at: {get_db_path()}")
    with get_db_connection() as conn:
        conn.executescript(SCHEMA_SQL)
    
    # Import and run seeding
    from app.database.seed_data import seed_all
    seed_all()
    logger.info("Database initialized and verified successfully.")
