import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { getAvailableGames, createGame, CreateGameRequest } from "../lib/api";
import styles from "../styles/Home.module.css";

export default function Home() {
  const router = useRouter();
  const [games, setGames] = useState<Record<string, any>>({});
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [playerNames, setPlayerNames] = useState(["Player 1", "Player 2"]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAvailableGames()
      .then((gameList) => {
        setGames(gameList);
        if (Object.keys(gameList).length > 0) {
          setSelectedGame(Object.keys(gameList)[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load games:", err);
        setLoading(false);
      });
  }, []);

  const createGameMutation = useMutation({
    mutationFn: (request: CreateGameRequest) => createGame(request),
    onSuccess: (data) => {
      router.push(`/game/${data.session_id}`);
    },
    onError: (error: any) => {
      alert(`Failed to create game: ${error.message}`);
    },
  });

  const handleCreateGame = () => {
    if (!selectedGame) {
      alert("Please select a game type");
      return;
    }

    const request: CreateGameRequest = {
      game_type: selectedGame,
      params: {},
      player_names: playerNames,
    };

    createGameMutation.mutate(request);
  };

  if (loading) {
    return <div className={styles.container}>Loading games...</div>;
  }

  return (
    <div className={styles.container}>
      <h1>Game Theory Teaching Platform</h1>
      <p className={styles.subtitle}>
        Interactive simulations for learning game theory concepts
      </p>

      <div className="card">
        <h2>Create New Game</h2>

        <div className="form-group">
          <label>Game Type</label>
          <select
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
          >
            {Object.entries(games).map(([key, game]) => (
              <option key={key} value={key}>
                {game.name}
              </option>
            ))}
          </select>
          {selectedGame && games[selectedGame] && (
            <p className={styles.description}>
              {games[selectedGame].description}
            </p>
          )}
        </div>

        <div className="form-group">
          <label>Player 1 Name</label>
          <input
            type="text"
            value={playerNames[0]}
            onChange={(e) =>
              setPlayerNames([e.target.value, playerNames[1]])
            }
          />
        </div>

        <div className="form-group">
          <label>Player 2 Name</label>
          <input
            type="text"
            value={playerNames[1]}
            onChange={(e) =>
              setPlayerNames([playerNames[0], e.target.value])
            }
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={handleCreateGame}
          disabled={createGameMutation.isPending}
        >
          {createGameMutation.isPending ? "Creating..." : "Create Game"}
        </button>

        {createGameMutation.isError && (
          <p className="error">
            Error: {String(createGameMutation.error)}
          </p>
        )}
      </div>
    </div>
  );
}

