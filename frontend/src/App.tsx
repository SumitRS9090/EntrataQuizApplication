import { useState } from "react";
import { AppView, QuizData, SubmitResponse } from "./types";
import { generateQuiz, submitQuiz } from "./hooks/useApi";
import HomeScreen from "./components/HomeScreen";
import QuizScreen from "./components/QuizScreen";
import ResultsScreen from "./components/ResultsScreen";
import HistoryScreen from "./components/HistoryScreen";

export default function App() {
  const [view, setView] = useState<AppView>("home");
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [submitResponse, setSubmitResponse] = useState<SubmitResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async (topic: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateQuiz(topic);
      setQuiz(data);
      setView("quiz");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (answers: number[]) => {
    if (!quiz) return;
    setLoading(true);
    setError(null);
    try {
      const res = await submitQuiz(quiz.session_id, answers);
      setSubmitResponse(res);
      setView("results");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (quiz) {
      // Regenerate with same topic
      handleStart(quiz.topic);
    }
  };

  const handleHome = () => {
    setView("home");
    setQuiz(null);
    setSubmitResponse(null);
    setError(null);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="app-logo" onClick={handleHome}>
          <span className="logo-q">Q</span>
          <span className="logo-text">uizBuilder</span>
        </button>
        {view !== "history" && (
          <button className="header-link" onClick={() => setView("history")}>
            History
          </button>
        )}
      </header>

      <main className="app-main">
        {view === "home" && (
          <HomeScreen
            onStart={handleStart}
            loading={loading}
            error={error}
            onHistory={() => setView("history")}
          />
        )}
        {view === "quiz" && quiz && (
          <QuizScreen quiz={quiz} onSubmit={handleSubmit} loading={loading} />
        )}
        {view === "results" && submitResponse && quiz && (
          <ResultsScreen
            response={submitResponse}
            topic={quiz.topic}
            onRetry={handleRetry}
            onHome={handleHome}
          />
        )}
        {view === "history" && (
          <HistoryScreen onBack={handleHome} />
        )}
      </main>
    </div>
  );
}
