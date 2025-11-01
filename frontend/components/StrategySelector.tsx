import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { simulateRounds, SimulateRequest } from "../lib/api";
import styles from "../styles/StrategySelector.module.css";

interface StrategySelectorProps {
  sessionId: string;
}

const AVAILABLE_STRATEGIES = [
  { name: "AlwaysCooperate", description: "Always cooperates" },
  { name: "AlwaysDefect", description: "Always defects" },
  { name: "TitForTat", description: "Starts by cooperating, then copies opponent" },
  { name: "GrimTrigger", description: "Cooperates until opponent defects, then always defects" },
  { name: "RandomStrategy", description: "Chooses actions randomly" },
];

export default function StrategySelector({ sessionId }: StrategySelectorProps) {
  const [numRounds, setNumRounds] = useState(10);
  const [strategy1, setStrategy1] = useState("TitForTat");
  const [strategy2, setStrategy2] = useState("AlwaysDefect");

  const simulateMutation = useMutation({
    mutationFn: (request: SimulateRequest) =>
      simulateRounds(sessionId, request),
    onSuccess: (data) => {
      alert(`Simulation complete! Check the history and charts.`);
    },
    onError: (error: any) => {
      alert(`Simulation failed: ${error.message}`);
    },
  });

  const handleSimulate = () => {
    // Note: This is a simplified version. In a real implementation,
    // you'd need to update the game session with strategies first
    // For now, this is a placeholder
    alert("Strategy simulation requires game session update - feature coming soon");
  };

  return (
    <div className="card">
      <h2>Simulate with AI Strategies</h2>
      <p className={styles.note}>
        Run multiple rounds automatically with AI strategies
      </p>

      <div className="form-group">
        <label>Number of Rounds</label>
        <input
          type="number"
          min="1"
          max="1000"
          value={numRounds}
          onChange={(e) => setNumRounds(parseInt(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label>Player 1 Strategy</label>
        <select value={strategy1} onChange={(e) => setStrategy1(e.target.value)}>
          {AVAILABLE_STRATEGIES.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <p className={styles.strategyDesc}>
          {AVAILABLE_STRATEGIES.find((s) => s.name === strategy1)?.description}
        </p>
      </div>

      <div className="form-group">
        <label>Player 2 Strategy</label>
        <select value={strategy2} onChange={(e) => setStrategy2(e.target.value)}>
          {AVAILABLE_STRATEGIES.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <p className={styles.strategyDesc}>
          {AVAILABLE_STRATEGIES.find((s) => s.name === strategy2)?.description}
        </p>
      </div>

      <button
        className="btn btn-secondary"
        onClick={handleSimulate}
        disabled={simulateMutation.isPending}
      >
        {simulateMutation.isPending ? "Simulating..." : "Run Simulation"}
      </button>
    </div>
  );
}

