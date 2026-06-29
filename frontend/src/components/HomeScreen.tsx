import { useState } from "react";

interface Props {
  onStart: (topic: string) => void;
  loading: boolean;
  error: string | null;
  onHistory: () => void;
}

const SUGGESTIONS = [
  "Photosynthesis", "Neural Networks", "Ancient Rome",
  "Quantum Physics", "The French Revolution", "Machine Learning",
  "Climate Change", "The Solar System",
];

export default function HomeScreen({ onStart, loading, error, onHistory }: Props) {
  const [topic, setTopic] = useState("");

  const handleSubmit = () => {
    if (topic.trim()) onStart(topic.trim());
  };

  return (
    <div className="home-screen">
      <div className="home-hero">
        <div className="logo-mark">Q</div>
        <h1>Quiz Builder</h1>
        <p className="tagline">Enter any topic. Get a smart quiz in seconds.</p>
      </div>

      <div className="input-card">
        <label htmlFor="topic-input" className="input-label">Topic</label>
        <div className="input-row">
          <input
            id="topic-input"
            type="text"
            className="topic-input"
            placeholder="e.g. The French Revolution"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={loading}
            autoFocus
          />
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading || !topic.trim()}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" />
                Generating…
              </span>
            ) : (
              "Generate quiz →"
            )}
          </button>
        </div>

        {error && <p className="error-msg">{error}</p>}

        <div className="suggestions">
          <span className="suggestions-label">Try:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="chip"
              onClick={() => setTopic(s)}
              disabled={loading}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <button className="history-link" onClick={onHistory}>
        View past quizzes →
      </button>
    </div>
  );
}
