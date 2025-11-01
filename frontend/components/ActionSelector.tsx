import { useState } from "react";
import styles from "../styles/ActionSelector.module.css";

interface ActionSelectorProps {
  playerId: string;
  availableActions: string[];
  gameType?: string;
  selectedAction?: string;
  onSelect: (action: string) => void;
  disabled?: boolean;
}

export default function ActionSelector({
  playerId,
  availableActions,
  gameType,
  selectedAction,
  onSelect,
  disabled = false,
}: ActionSelectorProps) {
  const [continuousValue, setContinuousValue] = useState("0");

  // For continuous games (Cournot, Auction), use slider or input
  if (gameType === "cournot" || gameType === "continuous") {
    return (
      <div className={styles.continuousSelector}>
        <input
          type="number"
          min="0"
          max="1000"
          step="0.1"
          value={continuousValue}
          onChange={(e) => {
            setContinuousValue(e.target.value);
            onSelect(e.target.value);
          }}
          disabled={disabled}
          className={styles.numberInput}
        />
        <input
          type="range"
          min="0"
          max="1000"
          step="0.1"
          value={continuousValue}
          onChange={(e) => {
            setContinuousValue(e.target.value);
            onSelect(e.target.value);
          }}
          disabled={disabled}
          className={styles.slider}
        />
      </div>
    );
  }

  // For discrete games, use buttons
  return (
    <div className={styles.actionButtons}>
      {availableActions.map((action) => (
        <button
          key={action}
          className={`${styles.actionButton} ${
            selectedAction === action ? styles.selected : ""
          }`}
          onClick={() => onSelect(action)}
          disabled={disabled}
        >
          {action}
        </button>
      ))}
    </div>
  );
}

