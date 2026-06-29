export interface Question {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface QuizData {
  session_id: string;
  topic: string;
  questions: Question[];
}

export interface QuizResult {
  question: string;
  options: string[];
  selected_index: number;
  correct_index: number;
  is_correct: boolean;
  explanation: string;
}

export interface SubmitResponse {
  score: number;
  total: number;
  results: QuizResult[];
  result_id: string;
}

export interface HistoryEntry {
  id: string;
  topic: string;
  score: number;
  total: number;
  created_at: string;
}

export type AppView = "home" | "quiz" | "results" | "history";
