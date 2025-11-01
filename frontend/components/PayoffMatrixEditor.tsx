import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { computeNashEquilibrium, NashEquilibriumRequest } from "../lib/api";
import styles from "../styles/PayoffMatrixEditor.module.css";

interface PayoffMatrixEditorProps {
  payoffMatrix: Record<string, number[]>;
  actions: Record<string, string[]>;
  history: Array<{ profile: string[]; payoffs: Record<string, number> }>;
}

export default function PayoffMatrixEditor({
  payoffMatrix,
  actions,
  history,
}: PayoffMatrixEditorProps) {
  const [nashEquilibria, setNashEquilibria] = useState<string[][]>([]);
  const [highlightedCell, setHighlightedCell] = useState<string | null>(null);

  const nashMutation = useMutation({
    mutationFn: (request: NashEquilibriumRequest) =>
      computeNashEquilibrium(request),
    onSuccess: (data) => {
      setNashEquilibria(data.pure_equilibria);
    },
  });

  useEffect(() => {
    // Compute Nash equilibria when component mounts or data changes
    if (Object.keys(payoffMatrix).length > 0 && Object.keys(actions).length > 0) {
      const request: NashEquilibriumRequest = {
        payoff_matrix: payoffMatrix,
        player_actions: actions,
      };
      nashMutation.mutate(request);
    }
  }, [payoffMatrix, actions]);

  // Get player actions
  const player0Actions = actions["0"] || [];
  const player1Actions = actions["1"] || [];

  const isNashEquilibrium = (action0: string, action1: string): boolean => {
    return nashEquilibria.some(
      (eq) => eq[0] === action0 && eq[1] === action1
    );
  };

  const getCellClass = (action0: string, action1: string): string => {
    let className = styles.cell;
    if (isNashEquilibrium(action0, action1)) {
      className += ` ${styles.nashCell}`;
    }
    const profileKey = `${action0},${action1}`;
    if (highlightedCell === profileKey) {
      className += ` ${styles.highlightedCell}`;
    }
    return className;
  };

  // Highlight last played action
  useEffect(() => {
    if (history.length > 0) {
      const lastProfile = history[history.length - 1].profile;
      setHighlightedCell(lastProfile.join(","));
    }
  }, [history]);

  if (player0Actions.length === 0 || player1Actions.length === 0) {
    return <div className="card">Loading payoff matrix...</div>;
  }

  return (
    <div className="card">
      <h2>Payoff Matrix</h2>
      <div className={styles.matrixContainer}>
        <table className={styles.matrixTable}>
          <thead>
            <tr>
              <th></th>
              {player1Actions.map((action) => (
                <th key={action}>{action}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {player0Actions.map((action0) => (
              <tr key={action0}>
                <th>{action0}</th>
                {player1Actions.map((action1) => {
                  const profileKey = `${action0},${action1}`;
                  const payoffs = payoffMatrix[profileKey] || [0, 0];
                  return (
                    <td
                      key={action1}
                      className={getCellClass(action0, action1)}
                      onMouseEnter={() => setHighlightedCell(profileKey)}
                      onMouseLeave={() => setHighlightedCell(null)}
                    >
                      ({payoffs[0].toFixed(1)}, {payoffs[1].toFixed(1)})
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendColor} ${styles.nashCell}`}></span>
          Nash Equilibrium
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendColor} ${styles.highlightedCell}`}></span>
          Last Played
        </span>
      </div>
    </div>
  );
}

