import { SubmitResponse } from "../types";

interface Props {
  response: SubmitResponse;
  topic: string;
  onRetry: () => void;
  onHome: () => void;
}

const LABELS = ["A", "B", "C", "D"];

function ScoreRing({ score, total }: { score: number; total: number }) {
  const pct = score / total;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  const color =
    pct >= 0.8 ? "#22c55e" : pct >= 0.6 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="130" height="130" viewBox="0 0 130 130" className="score-ring">
      <circle cx="65" cy="65" r={r} fill="none" stroke="var(--ring-track)" strokeWidth="8" />
      <circle
        cx="65" cy="65" r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 65 65)"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x="65" y="60" textAnchor="middle" className="ring-score" fill={color}>
        {score}/{total}
      </text>
      <text x="65" y="78" textAnchor="middle" className="ring-label">
        correct
      </text>
    </svg>
  );
}

function getMessage(score: number, total: number) {
  const pct = score / total;
  if (pct === 1) return "Perfect score! 🎉";
  if (pct >= 0.8) return "Great job!";
  if (pct >= 0.6) return "Good effort!";
  if (pct >= 0.4) return "Keep studying!";
  return "Better luck next time.";
}

export default function ResultsScreen({ response, topic, onRetry, onHome }: Props) {
  const { score, total, results } = response;

  return (
    <div className="results-screen">
      <div className="results-header">
        <div className="results-topic">{topic}</div>
        <ScoreRing score={score} total={total} />
        <p className="results-message">{getMessage(score, total)}</p>
      </div>

      <div className="results-list">
        {results.map((r, i) => (
          <div key={i} className={`result-card ${r.is_correct ? "correct" : "incorrect"}`}>
            <div className="result-card-header">
              <span className="result-num">Q{i + 1}</span>
              <span className={`result-badge ${r.is_correct ? "badge-correct" : "badge-wrong"}`}>
                {r.is_correct ? "✓ Correct" : "✗ Incorrect"}
              </span>
            </div>
            <p className="result-question">{r.question}</p>
            <div className="result-options">
              {r.options.map((opt, oi) => {
                const isCorrect = oi === r.correct_index;
                const isSelected = oi === r.selected_index;
                let cls = "result-option";
                if (isCorrect) cls += " opt-correct";
                else if (isSelected && !isCorrect) cls += " opt-wrong";
                return (
                  <div key={oi} className={cls}>
                    <span className="option-label">{LABELS[oi]}</span>
                    <span>{opt}</span>
                    {isCorrect && <span className="opt-tag">correct</span>}
                    {isSelected && !isCorrect && <span className="opt-tag">your answer</span>}
                  </div>
                );
              })}
            </div>
            <div className="result-explanation">
              <span className="explanation-icon">💡</span>
              {r.explanation}
            </div>
          </div>
        ))}
      </div>

      <div className="results-actions">
        <button className="btn-ghost" onClick={onHome}>← New topic</button>
        <button className="btn-primary" onClick={onRetry}>Retake quiz →</button>
      </div>
    </div>
  );
}
