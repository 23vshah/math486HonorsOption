"""Session manager for storing game sessions in memory."""

from typing import Dict, Optional, Any, List
import uuid
from game_engine.core import Game


class SessionManager:
    """Manages game sessions in memory."""

    def __init__(self):
        """Initialize session manager."""
        self.sessions: Dict[str, Dict[str, Any]] = {}

    def create_session(
        self, session_id: Optional[str] = None, game: Game = None, game_type: str = None
    ) -> str:
        """
        Create a new session.

        Args:
            session_id: Optional session ID. If None, generates a new UUID
            game: Game instance to store
            game_type: Type of game (for metadata)

        Returns:
            Session ID
        """
        if session_id is None:
            session_id = str(uuid.uuid4())

        self.sessions[session_id] = {
            "game": game,
            "game_type": game_type,
            "created_at": None,  # Could add timestamp if needed
        }

        return session_id

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a session by ID.

        Args:
            session_id: Session ID

        Returns:
            Session data or None if not found
        """
        return self.sessions.get(session_id)

    def delete_session(self, session_id: str) -> bool:
        """
        Delete a session.

        Args:
            session_id: Session ID

        Returns:
            True if deleted, False if not found
        """
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False

    def list_sessions(self) -> List[str]:
        """
        List all session IDs.

        Returns:
            List of session IDs
        """
        return list(self.sessions.keys())


# Global session manager instance
session_manager = SessionManager()

