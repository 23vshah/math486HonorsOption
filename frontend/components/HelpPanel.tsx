import { useState } from "react";
import styles from "../styles/HelpPanel.module.css";

interface HelpPanelProps {
  gameType?: string;
}

const HELP_CONTENT: Record<string, { title: string; content: string }> = {
  normal_form: {
    title: "Normal Form Games",
    content: `Normal form games represent strategic interactions using a payoff matrix.
    
Each cell shows the payoffs for both players given their actions.
- Nash Equilibrium: No player can improve by unilaterally changing strategy
- Best Response: The optimal action given the opponent's action
- The graph shows profitable deviations between action profiles.`,
  },
  cournot: {
    title: "Cournot Duopoly",
    content: `Cournot competition models firms choosing quantities simultaneously.

- Demand: P = a - b(Q1 + Q2)
- Each firm maximizes profit: π = (P - c) × q
- Reaction function: optimal quantity given opponent's quantity
- Equilibrium: intersection of reaction curves`,
  },
  auction: {
    title: "Sealed-Bid First-Price Auction",
    content: `Players submit sealed bids without knowing others' bids.

- Winner: highest bidder
- Payment: winner pays their bid
- Payoff: valuation - bid if won, 0 if lost
- Strategy: balance between winning probability and profit margin`,
  },
};

export default function HelpPanel({ gameType }: HelpPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const helpInfo = gameType ? HELP_CONTENT[gameType] : null;
  const defaultHelp = {
    title: "Game Theory Concepts",
    content: "Select a game to see help information.",
  };

  const displayHelp = helpInfo || defaultHelp;

  return (
    <div className="card">
      <div className={styles.header} onClick={() => setIsOpen(!isOpen)}>
        <h2>{displayHelp.title}</h2>
        <span className={styles.toggle}>{isOpen ? "−" : "+"}</span>
      </div>
      {isOpen && (
        <div className={styles.content}>
          <p style={{ whiteSpace: "pre-line" }}>{displayHelp.content}</p>
        </div>
      )}
    </div>
  );
}

