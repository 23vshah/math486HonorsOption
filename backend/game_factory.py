"""Factory for creating game instances from templates and parameters."""

from typing import Dict, Any, Optional, List
from game_engine.core import Game
from game_engine.templates import (
    AVAILABLE_GAMES,
    create_prisoners_dilemma,
    create_cournot_game,
    create_auction_game,
    create_custom_normal_form,
)
from game_engine.strategies import (
    AlwaysCooperate,
    AlwaysDefect,
    TitForTat,
    GrimTrigger,
    RandomStrategy,
)


# Strategy name to class mapping
STRATEGY_MAP = {
    "AlwaysCooperate": AlwaysCooperate,
    "AlwaysDefect": AlwaysDefect,
    "TitForTat": TitForTat,
    "GrimTrigger": GrimTrigger,
    "RandomStrategy": RandomStrategy,
}


def create_strategy(strategy_name: str) -> Any:
    """
    Create a strategy instance from its name.

    Args:
        strategy_name: Name of the strategy

    Returns:
        Strategy instance
    """
    strategy_class = STRATEGY_MAP.get(strategy_name)
    if strategy_class is None:
        raise ValueError(f"Unknown strategy: {strategy_name}")
    return strategy_class()


def create_game_from_template(
    game_type: str, params: Dict[str, Any], player_names: Optional[List[str]] = None, strategies: Optional[List[str]] = None
) -> Game:
    """
    Create a game instance from a template.

    Args:
        game_type: Type of game (e.g., "prisoners_dilemma", "cournot")
        params: Game-specific parameters
        player_names: Optional list of player names
        strategies: Optional list of strategy names for AI players

    Returns:
        Game instance
    """
    if game_type not in AVAILABLE_GAMES:
        raise ValueError(f"Unknown game type: {game_type}")

    game_info = AVAILABLE_GAMES[game_type]
    factory = game_info["factory"]

    # Convert strategies from names to instances if provided
    strategy_instances = None
    if strategies:
        strategy_instances = [create_strategy(s) for s in strategies]

    # Create game based on type
    if game_type == "prisoners_dilemma":
        # Extract PD-specific params
        payoffs = params.get("payoffs")
        return create_prisoners_dilemma(
            player_names=player_names,
            strategies=strategy_instances,
            payoffs=payoffs,
        )

    elif game_type == "cournot":
        return create_cournot_game(
            player_names=player_names,
            demand_intercept=params.get("demand_intercept", 100.0),
            demand_slope=params.get("demand_slope", 1.0),
            marginal_costs=params.get("marginal_costs"),
        )

    elif game_type == "auction":
        return create_auction_game(
            player_names=player_names,
            private_values=params.get("private_values"),
            num_players=params.get("num_players", 2),
        )

    else:
        raise ValueError(f"Unsupported game type: {game_type}")

