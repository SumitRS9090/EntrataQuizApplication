import { useState } from "react";
import { QuizData } from "../types";

interface Props {
  quiz: QuizData;
  onSubmit: (answers: number[]) => void;
  loading: boolean;
}

const LABELS = ["A", "B", "C", "D"];

export default function QuizScreen({ quiz, onSubmit, loading }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(quiz.questions.length).fill(null)
  );
  const [current, setCurrent] = useState(0);

  const select = (qIdx: number, optIdx: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIdx] = optIdx;
      return next;
    });
  };

  const allAnswered = answers.every((a) => a !== null);
  const answered = answers.filter((a) => a !== null).length;
  const progress = (answered / quiz.questions.length) * 100;

  const handleSubmit = () => {
    onSubmit(answers as number[]);
  };

  const q = quiz.questions[current];

  return (
    <div className="quiz-screen">
      <div className="quiz-header">
        <div className="quiz-topic-badge">{quiz.topic}</div>
        <div className="quiz-progress-info">
          {answered}/{quiz.questions.length} answered
        </div>
      </div>

      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="question-nav">
        {quiz.questions.map((_, i) => (
          <button
            key={i}
            className={`q-nav-dot ${i === current ? "active" : ""} ${answers[i] !== null ? "done" : ""}`}
            onClick={() => setCurrent(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="question-card">
        <span className="question-number">Question {current + 1} of {quiz.questions.length}</span>
        <p className="question-text">{q.question}</p>

        <div className="options-list">
          {q.options.map((opt, oi) => (
            <button
              key={oi}
              className={`option-btn ${answers[current] === oi ? "selected" : ""}`}
              onClick={() => select(current, oi)}
            >
              <span className="option-label">{LABELS[oi]}</span>
              <span className="option-text">{opt}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="quiz-footer">
        <div className="nav-buttons">
          <button
            className="btn-ghost"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
          >
            ← Previous
          </button>
          {current < quiz.questions.length - 1 ? (
            <button
              className="btn-ghost"
              onClick={() => setCurrent((c) => c + 1)}
            >
              Next →
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={!allAnswered || loading}
            >
              {loading ? (
                <span className="btn-loading"><span className="spinner" />Submitting…</span>
              ) : (
                "Submit quiz →"
              )}
            </button>
          )}
        </div>

        {!allAnswered && (
          <p className="unanswered-hint">
            Answer all questions to submit. {quiz.questions.length - answered} remaining.
          </p>
        )}
      </div>
    </div>
  );
}
