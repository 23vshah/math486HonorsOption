import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGameSession,
  playRound,
  PlayRoundRequest,
  GameState,
} from "../../lib/api";
import ActionSelector from "../../components/ActionSelector";
import GameHistory from "../../components/GameHistory";
import PayoffMatrixEditor from "../../components/PayoffMatrixEditor";
import BestResponseGraph from "../../components/BestResponseGraph";
import TimeSeriesChart from "../../components/TimeSeriesChart";
import CournotVisualization from "../../components/CournotVisualization";
import StrategySelector from "../../components/StrategySelector";
import HelpPanel from "../../components/HelpPanel";
import styles from "../../styles/Game.module.css";

export default function GamePage() {
  const router = useRouter();
  const { sessionId } = router.query;
  const queryClient = useQueryClient();

  const [selectedActions, setSelectedActions] = useState<Record<string, string>>({});
  const [currentPlayer, setCurrentPlayer] = useState<number>(0);

  const {
    data: sessionData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["gameSession", sessionId],
    queryFn: () => getGameSession(sessionId as string),
    enabled: !!sessionId,
    refetchInterval: false,
  });

  const playMutation = useMutation({
    mutationFn: (request: PlayRoundRequest) =>
      playRound(sessionId as string, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameSession", sessionId] });
      setSelectedActions({});
    },
  });

  const handleActionSelect = (playerId: string, action: string) => {
    setSelectedActions((prev) => ({ ...prev, [playerId]: action }));
  };

  const handlePlayRound = () => {
    if (Object.keys(selectedActions).length === 0) {
      alert("Please select actions for all players");
      return;
    }
    playMutation.mutate({ actions: selectedActions });
  };

  if (isLoading) {
    return <div className="loading">Loading game session...</div>;
  }

  if (error || !sessionData) {
    return (
      <div className="container">
        <div className="error">
          Error loading game: {error ? String(error) : "Session not found"}
        </div>
      </div>
    );
  }

  const gameState = sessionData.game_state;

  return (
    <div className={styles.container}>
      <h1>Game Session: {sessionId}</h1>
      <div className={styles.gameType}>
        Game Type: {sessionData.game_type}
      </div>

      <div className={styles.gameArea}>
        <div className={styles.leftPanel}>
          {/* Game-specific UI */}
          {gameState.game_type === "normal_form" && (
            <>
              <PayoffMatrixEditor
                payoffMatrix={gameState.payoff_matrix || {}}
                actions={gameState.actions || {}}
                history={gameState.history || []}
              />
              <BestResponseGraph
                sessionId={sessionId as string}
                payoffMatrix={gameState.payoff_matrix || {}}
                actions={gameState.actions || {}}
              />
            </>
          )}

          {gameState.game_type === "cournot" && (
            <CournotVisualization
              sessionId={sessionId as string}
              gameState={gameState}
            />
          )}

          {/* Action Selection */}
          <div className="card">
            <h2>Play Round</h2>
            {gameState.players?.map((player) => (
              <div key={player.id} className={styles.playerSection}>
                <h3>{player.name}</h3>
                <ActionSelector
                  playerId={String(player.id)}
                  availableActions={
                    gameState.actions?.[String(player.id)] || []
                  }
                  gameType={gameState.game_type}
                  selectedAction={selectedActions[String(player.id)]}
                  onSelect={(action) =>
                    handleActionSelect(String(player.id), action)
                  }
                />
                <div className={styles.payoff}>
                  Cumulative Payoff: {player.cumulative_payoff.toFixed(2)}
                </div>
              </div>
            ))}

            <button
              className="btn btn-primary"
              onClick={handlePlayRound}
              disabled={playMutation.isPending}
            >
              {playMutation.isPending ? "Playing..." : "Play Round"}
            </button>
          </div>

          {/* Game History */}
          <GameHistory history={gameState.history || []} />
        </div>

        <div className={styles.rightPanel}>
          {/* Time Series Chart (for repeated games) */}
          {gameState.history && gameState.history.length > 0 && (
            <TimeSeriesChart
              history={gameState.history}
              players={gameState.players || []}
            />
          )}

          {/* Strategy Selector (for AI mode) */}
          <StrategySelector sessionId={sessionId as string} />

          {/* Help Panel */}
          <HelpPanel gameType={sessionData.game_type} />
        </div>
      </div>
    </div>
  );
}

