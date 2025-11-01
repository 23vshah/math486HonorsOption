import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Plot from "react-plotly.js";
import {
  computeCournotEquilibrium,
  CournotEquilibriumRequest,
  GameState,
} from "../lib/api";

interface CournotVisualizationProps {
  sessionId: string;
  gameState: GameState;
}

export default function CournotVisualization({
  sessionId,
  gameState,
}: CournotVisualizationProps) {
  const [reactionCurves, setReactionCurves] = useState<any[]>([]);
  const [equilibrium, setEquilibrium] = useState<{
    quantities: Record<string, number>;
    price: number;
  } | null>(null);

  const equilibriumMutation = useMutation({
    mutationFn: (request: CournotEquilibriumRequest) =>
      computeCournotEquilibrium(request),
    onSuccess: (data) => {
      setEquilibrium({
        quantities: data.equilibrium_quantities,
        price: data.equilibrium_price,
      });
    },
  });

  useEffect(() => {
    // Compute equilibrium and reaction curves
    if (
      gameState.demand_intercept &&
      gameState.demand_slope &&
      gameState.marginal_costs
    ) {
      const request: CournotEquilibriumRequest = {
        demand_intercept: gameState.demand_intercept,
        demand_slope: gameState.demand_slope,
        marginal_costs: gameState.marginal_costs,
      };
      equilibriumMutation.mutate(request);

      // Generate reaction curves (simplified - in real app, call backend)
      const a = gameState.demand_intercept;
      const b = gameState.demand_slope;
      const costs = gameState.marginal_costs;

      const player0Cost = costs["0"] || 10;
      const player1Cost = costs["1"] || 10;

      // Generate points for reaction curves
      const maxQ = a / b;
      const numPoints = 50;
      const q1Points: number[] = [];
      const q2Points: number[] = [];
      const r1Points: number[] = [];
      const r2Points: number[] = [];

      for (let i = 0; i <= numPoints; i++) {
        const q = (i / numPoints) * maxQ;

        // Player 1's reaction to Player 2's quantity
        const r1 = Math.max(0, (a - player0Cost - b * q) / (2 * b));
        r1Points.push(r1);
        q2Points.push(q);

        // Player 2's reaction to Player 1's quantity
        const r2 = Math.max(0, (a - player1Cost - b * q) / (2 * b));
        r2Points.push(r2);
        q1Points.push(q);
      }

      setReactionCurves([
        {
          x: q2Points,
          y: r1Points,
          type: "scatter",
          mode: "lines",
          name: "Firm 1 Reaction",
          line: { color: "blue", width: 2 },
        },
        {
          x: r2Points,
          y: q1Points,
          type: "scatter",
          mode: "lines",
          name: "Firm 2 Reaction",
          line: { color: "red", width: 2 },
        },
      ]);
    }
  }, [gameState]);

  // Add equilibrium point
  const traces = [...reactionCurves];
  if (equilibrium) {
    const q1 = equilibrium.quantities["0"] || 0;
    const q2 = equilibrium.quantities["1"] || 0;
    traces.push({
      x: [q2],
      y: [q1],
      type: "scatter",
      mode: "markers",
      name: "Equilibrium",
      marker: { size: 15, color: "green", symbol: "star" },
    });
  }

  return (
    <div className="card">
      <h2>Cournot Reaction Functions</h2>
      {equilibriumMutation.isPending ? (
        <p>Computing equilibrium...</p>
      ) : (
        <Plot
          data={traces}
          layout={{
            title: "Reaction Functions and Equilibrium",
            xaxis: { title: "Quantity Firm 2 (q2)" },
            yaxis: { title: "Quantity Firm 1 (q1)" },
            height: 500,
            hovermode: "closest",
          }}
          style={{ width: "100%", height: "100%" }}
          config={{ responsive: true }}
        />
      )}
      {equilibrium && (
        <div style={{ marginTop: "16px" }}>
          <p>
            <strong>Equilibrium:</strong> q1 = {equilibrium.quantities["0"]?.toFixed(2)}, q2 ={" "}
            {equilibrium.quantities["1"]?.toFixed(2)}
          </p>
          <p>
            <strong>Equilibrium Price:</strong> {equilibrium.price.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}

