import { useEffect, useRef } from "react";
import Plot from "react-plotly.js";

interface HistoryEntry {
  profile: string[];
  payoffs: Record<string, number>;
}

interface Player {
  id: number;
  name: string;
  cumulative_payoff: number;
}

interface TimeSeriesChartProps {
  history: HistoryEntry[];
  players: Player[];
}

export default function TimeSeriesChart({
  history,
  players,
}: TimeSeriesChartProps) {
  // Calculate cumulative payoffs over time
  const calculateCumulativePayoffs = () => {
    const cumulative: Record<number, number[]> = {};
    players.forEach((player) => {
      cumulative[player.id] = [];
    });

    let runningTotals: Record<number, number> = {};
    players.forEach((player) => {
      runningTotals[player.id] = 0;
    });

    history.forEach((entry) => {
      players.forEach((player) => {
        runningTotals[player.id] += entry.payoffs[String(player.id)] || 0;
        cumulative[player.id].push(runningTotals[player.id]);
      });
    });

    return cumulative;
  };

  // Calculate payoffs per round
  const calculatePayoffsPerRound = () => {
    const payoffsPerRound: Record<number, number[]> = {};
    players.forEach((player) => {
      payoffsPerRound[player.id] = [];
    });

    history.forEach((entry) => {
      players.forEach((player) => {
        payoffsPerRound[player.id].push(entry.payoffs[String(player.id)] || 0);
      });
    });

    return payoffsPerRound;
  };

  if (history.length === 0) {
    return (
      <div className="card">
        <h2>Time Series</h2>
        <p>No data to display yet.</p>
      </div>
    );
  }

  const roundNumbers = history.map((_, index) => index + 1);
  const cumulativePayoffs = calculateCumulativePayoffs();
  const payoffsPerRound = calculatePayoffsPerRound();

  // Create traces for cumulative payoffs
  const cumulativeTraces = players.map((player) => ({
    x: roundNumbers,
    y: cumulativePayoffs[player.id],
    type: "scatter" as const,
    mode: "lines+markers" as const,
    name: `${player.name} (Cumulative)`,
    line: { width: 2 },
  }));

  // Create traces for per-round payoffs
  const perRoundTraces = players.map((player) => ({
    x: roundNumbers,
    y: payoffsPerRound[player.id],
    type: "bar" as const,
    name: `${player.name} (Per Round)`,
    opacity: 0.6,
  }));

  return (
    <div className="card">
      <h2>Time Series Analysis</h2>
      <Plot
        data={[...cumulativeTraces, ...perRoundTraces]}
        layout={{
          title: "Payoffs Over Time",
          xaxis: { title: "Round" },
          yaxis: { title: "Payoff" },
          height: 400,
          hovermode: "closest",
        }}
        style={{ width: "100%", height: "100%" }}
        config={{ responsive: true }}
      />
    </div>
  );
}

