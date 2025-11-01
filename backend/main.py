"""FastAPI application for game theory teaching platform."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List
import sys
import os

# Add parent directory to path so we can import game_engine
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models import (
    CreateGameRequest,
    CreateGameResponse,
    PlayRoundRequest,
    PlayRoundResponse,
    SimulateRequest,
    SimulateResponse,
    NashEquilibriumRequest,
    NashEquilibriumResponse,
    CournotEquilibriumRequest,
    CournotEquilibriumResponse,
    BestResponseRequest,
    BestResponseResponse,
)
from backend.session_manager import session_manager
from backend.game_factory import create_game_from_template
from game_engine.normal_form import NormalFormGame
from game_engine.cournot import CournotGame
from game_engine.solvers import NashSolver, BestResponseAnalyzer
from game_engine.repeated import simulate_repeated_game
from game_engine.templates import AVAILABLE_GAMES

app = FastAPI(title="Game Theory Teaching Platform API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def serialize_game_state(game) -> Dict[str, Any]:
    """Serialize game state for JSON response."""
    state = game.get_state()
    
    # Add game-specific information
    if isinstance(game, NormalFormGame):
        state["game_type"] = "normal_form"
        state["payoff_matrix"] = game.get_payoff_matrix_dict()
        state["actions"] = {str(k): v for k, v in game.actions.items()}
    elif isinstance(game, CournotGame):
        state["game_type"] = "cournot"
        state["demand_intercept"] = game.demand_intercept
        state["demand_slope"] = game.demand_slope
        state["marginal_costs"] = {str(k): v for k, v in game.marginal_costs.items()}
    else:
        state["game_type"] = "unknown"
    
    return state


@app.get("/")
def root():
    """Root endpoint."""
    return {"message": "Game Theory Teaching Platform API"}


@app.get("/games")
def list_games():
    """List all available game templates."""
    games = {}
    for game_type, game_info in AVAILABLE_GAMES.items():
        games[game_type] = {
            "name": game_info["name"],
            "description": game_info["description"],
            "type": game_info["type"],
        }
    return {"games": games}


@app.post("/games/create", response_model=CreateGameResponse)
def create_game(request: CreateGameRequest):
    """Create a new game session."""
    try:
        game = create_game_from_template(
            request.game_type,
            request.params,
            request.player_names,
            request.strategies,
        )
        
        session_id = session_manager.create_session(
            game=game, game_type=request.game_type
        )
        
        return CreateGameResponse(
            session_id=session_id,
            game_type=request.game_type,
            game_state=serialize_game_state(game),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/games/{session_id}")
def get_game_session(session_id: str):
    """Get game session state."""
    session = session_manager.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    
    game = session["game"]
    return {
        "session_id": session_id,
        "game_type": session["game_type"],
        "game_state": serialize_game_state(game),
    }


@app.post("/games/{session_id}/play", response_model=PlayRoundResponse)
def play_round(session_id: str, request: PlayRoundRequest):
    """Play a round of the game."""
    session = session_manager.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    
    game = session["game"]
    
    # Convert string keys to int keys for player IDs
    actions = {int(k): v for k, v in request.actions.items()}
    
    try:
        payoffs = game.play_round(actions)
        payoffs_str = {str(k): v for k, v in payoffs.items()}
        
        return PlayRoundResponse(
            payoffs=payoffs_str,
            game_state=serialize_game_state(game),
            history=[
                {
                    "profile": list(profile),
                    "payoffs": {str(k): v for k, v in payoffs_dict.items()},
                }
                for profile, payoffs_dict in game.history
            ],
        )
    except (KeyError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid action: {str(e)}")


@app.post("/games/{session_id}/simulate", response_model=SimulateResponse)
def simulate_game(session_id: str, request: SimulateRequest):
    """Simulate multiple rounds of the game with strategies."""
    session = session_manager.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    
    game = session["game"]
    
    try:
        result = simulate_repeated_game(
            game,
            request.num_rounds,
            request.discount_factor,
            reset_between_runs=False,
        )
        
        return SimulateResponse(
            history=[
                {
                    "profile": list(profile),
                    "payoffs": {str(k): v for k, v in payoffs_dict.items()},
                }
                for profile, payoffs_dict in result["history"]
            ],
            cumulative_payoffs={str(k): v for k, v in result["cumulative_payoffs"].items()},
            discounted_payoffs={str(k): v for k, v in result["discounted_payoffs"].items()} if result["discounted_payoffs"] else None,
            strategy_history=[{str(k): v for k, v in sh.items()} for sh in result["strategy_history"]],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")


@app.post("/games/{session_id}/reset")
def reset_game(session_id: str):
    """Reset game to initial state."""
    session = session_manager.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    
    game = session["game"]
    game.reset()
    
    return {
        "message": "Game reset successfully",
        "game_state": serialize_game_state(game),
    }


@app.post("/equilibrium/nash", response_model=NashEquilibriumResponse)
def compute_nash_equilibrium(request: NashEquilibriumRequest):
    """Compute Nash equilibria for a normal-form game."""
    try:
        # Reconstruct game from request
        from game_engine.core import Player
        from game_engine.strategies import Strategy
        
        class DummyStrategy(Strategy):
            def __init__(self):
                super().__init__("Dummy")
            def choose(self, player_id, history):
                raise NotImplementedError()
        
        # Parse player actions
        player_ids = sorted([int(k) for k in request.player_actions.keys()])
        players = [Player(i, f"Player {i+1}", DummyStrategy()) for i in player_ids]
        
        actions = {i: request.player_actions[str(i)] for i in player_ids}
        
        # Parse payoff matrix
        payoff_matrix = {}
        for key, payoffs in request.payoff_matrix.items():
            profile = tuple(key.split(","))
            payoff_matrix[profile] = {i: payoffs[idx] for idx, i in enumerate(player_ids)}
        
        game = NormalFormGame(players, actions, payoff_matrix)
        
        # Compute equilibria
        solver = NashSolver(game)
        result = solver.find_all_nash()
        
        return NashEquilibriumResponse(
            pure_equilibria=[list(eq) for eq in result["pure"]],
            mixed_equilibria=result["mixed"],
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")


@app.post("/equilibrium/cournot", response_model=CournotEquilibriumResponse)
def compute_cournot_equilibrium(request: CournotEquilibriumRequest):
    """Compute Cournot equilibrium."""
    try:
        marginal_costs = {int(k): v for k, v in request.marginal_costs.items()}
        
        # Create temporary game to compute equilibrium
        from game_engine.core import Player
        from game_engine.strategies import Strategy
        
        class DummyStrategy(Strategy):
            def __init__(self):
                super().__init__("Dummy")
            def choose(self, player_id, history):
                raise NotImplementedError()
        
        players = [
            Player(0, "Firm 1", DummyStrategy()),
            Player(1, "Firm 2", DummyStrategy()),
        ]
        
        game = CournotGame(
            players,
            demand_intercept=request.demand_intercept,
            demand_slope=request.demand_slope,
            marginal_costs=marginal_costs,
        )
        
        equilibrium = game.compute_equilibrium()
        
        return CournotEquilibriumResponse(
            equilibrium_quantities={str(k): v for k, v in equilibrium["quantities"].items()},
            equilibrium_price=equilibrium["price"],
            payoffs={str(k): v for k, v in equilibrium["payoffs"].items()},
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")


@app.post("/analyze/best_response", response_model=BestResponseResponse)
def analyze_best_response(request: BestResponseRequest):
    """Get best response graph data."""
    try:
        # Reconstruct game from request (similar to Nash endpoint)
        from game_engine.core import Player
        from game_engine.strategies import Strategy
        
        class DummyStrategy(Strategy):
            def __init__(self):
                super().__init__("Dummy")
            def choose(self, player_id, history):
                raise NotImplementedError()
        
        player_ids = sorted([int(k) for k in request.player_actions.keys()])
        players = [Player(i, f"Player {i+1}", DummyStrategy()) for i in player_ids]
        
        actions = {i: request.player_actions[str(i)] for i in player_ids}
        
        payoff_matrix = {}
        for key, payoffs in request.payoff_matrix.items():
            profile = tuple(key.split(","))
            payoff_matrix[profile] = {i: payoffs[idx] for idx, i in enumerate(player_ids)}
        
        game = NormalFormGame(players, actions, payoff_matrix)
        
        # Analyze best responses
        analyzer = BestResponseAnalyzer(game)
        graph_data = analyzer.get_deviation_graph()
        
        return BestResponseResponse(
            nodes=graph_data["nodes"],
            edges=graph_data["edges"],
            nash_nodes=graph_data["nash_nodes"],
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

