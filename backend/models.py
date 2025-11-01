"""Pydantic models for API request/response validation."""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel


class CreateGameRequest(BaseModel):
    """Request model for creating a new game session."""

    game_type: str
    params: Dict[str, Any] = {}
    player_names: Optional[List[str]] = None
    strategies: Optional[List[str]] = None  # Strategy names for AI players


class CreateGameResponse(BaseModel):
    """Response model for game creation."""

    session_id: str
    game_type: str
    game_state: Dict[str, Any]


class PlayRoundRequest(BaseModel):
    """Request model for playing a round."""

    actions: Dict[str, str]  # player_id -> action


class PlayRoundResponse(BaseModel):
    """Response model for playing a round."""

    payoffs: Dict[str, float]
    game_state: Dict[str, Any]
    history: List[Dict[str, Any]]


class SimulateRequest(BaseModel):
    """Request model for simulating multiple rounds."""

    num_rounds: int
    discount_factor: Optional[float] = None


class SimulateResponse(BaseModel):
    """Response model for simulation."""

    history: List[Dict[str, Any]]
    cumulative_payoffs: Dict[str, float]
    discounted_payoffs: Optional[Dict[str, float]] = None
    strategy_history: List[Dict[str, str]]


class NashEquilibriumRequest(BaseModel):
    """Request model for Nash equilibrium computation."""

    payoff_matrix: Dict[str, List[float]]  # "C,C" -> [payoff0, payoff1]
    player_actions: Dict[str, List[str]]  # "0" -> ["C", "D"], "1" -> ["C", "D"]


class NashEquilibriumResponse(BaseModel):
    """Response model for Nash equilibrium."""

    pure_equilibria: List[List[str]]
    mixed_equilibria: List[Dict[str, Any]]


class CournotEquilibriumRequest(BaseModel):
    """Request model for Cournot equilibrium computation."""

    demand_intercept: float = 100.0
    demand_slope: float = 1.0
    marginal_costs: Dict[str, float]  # "0" -> cost0, "1" -> cost1


class CournotEquilibriumResponse(BaseModel):
    """Response model for Cournot equilibrium."""

    equilibrium_quantities: Dict[str, float]
    equilibrium_price: float
    payoffs: Dict[str, float]


class BestResponseRequest(BaseModel):
    """Request model for best response analysis."""

    payoff_matrix: Dict[str, List[float]]
    player_actions: Dict[str, List[str]]


class BestResponseResponse(BaseModel):
    """Response model for best response graph."""

    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    nash_nodes: List[int]

