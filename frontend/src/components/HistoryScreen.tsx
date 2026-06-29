import { useEffect, useState } from "react";
import { HistoryEntry } from "../types";
import { fetchHistory } from "../hooks/useApi";

interface Props {
  onBack: () => void;
}

export default function HistoryScreen({ onBack }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory()
      .then(setHistory)
      .catch(() => setError("Could not load history."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="history-screen">
      <div className="history-header">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <h2>Past quizzes</h2>
      </div>

      {loading && <p className="loading-text">Loading…</p>}
      {error && <p className="error-msg">{error}</p>}

      {!loading && history.length === 0 && (
        <div className="empty-state">
          <p>No quizzes yet.</p>
          <button className="btn-primary" onClick={onBack}>Take your first quiz →</button>
        </div>
      )}

      <div className="history-list">
        {history.map((entry) => {
          const pct = entry.score / entry.total;
          const color = pct >= 0.8 ? "green" : pct >= 0.6 ? "amber" : "red";
          return (
            <div key={entry.id} className="history-card">
              <div className="history-card-left">
                <span className="history-topic">{entry.topic}</span>
                <span className="history-date">
                  {new Date(entry.created_at).toLocaleDateString(undefined, {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </span>
              </div>
              <div className={`history-score score-${color}`}>
                {entry.score}/{entry.total}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
