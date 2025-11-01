import styles from "../styles/GameHistory.module.css";

interface HistoryEntry {
  profile: string[];
  payoffs: Record<string, number>;
}

interface GameHistoryProps {
  history: HistoryEntry[];
}

export default function GameHistory({ history }: GameHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="card">
        <h2>Game History</h2>
        <p className={styles.empty}>No rounds played yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Game History</h2>
      <div className={styles.historyContainer}>
        <table className={styles.historyTable}>
          <thead>
            <tr>
              <th>Round</th>
              <th>Actions</th>
              <th>Payoffs</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{entry.profile.join(", ")}</td>
                <td>
                  {Object.entries(entry.payoffs)
                    .map(([player, payoff]) => `P${player}: ${payoff.toFixed(2)}`)
                    .join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

