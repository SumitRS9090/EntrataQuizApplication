# QuizBuilder — AI-Powered Knowledge Quiz App

## Quick start

### 1. Backend (Python / FastAPI)

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt


uvicorn main:app --reload --port 8000
```

### 2. Frontend (React / Vite)

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

# System Architecture

The AI Quiz Builder follows a three-tier architecture consisting of a **React frontend**, **FastAPI backend**, **Gemini AI API**, and **MongoDB Atlas**.

## Frontend (React.js)

The React frontend provides an intuitive user interface where users can:

- Enter quiz topics.
- Generate AI-powered quizzes.
- Attempt quizzes by selecting answers.
- View quiz scores and detailed explanations.
- Access their previous quiz attempts and history.

The frontend communicates with the backend using RESTful API requests.

## Backend (FastAPI)

The FastAPI backend acts as the core application server and is responsible for:

- Receiving requests from the React frontend.
- Validating user inputs.
- Managing quiz generation and evaluation.
- Optionally retrieving contextual information from Wikipedia to improve question quality.
- Sending prompts to the Gemini API for AI-generated multiple-choice questions.
- Evaluating submitted answers and calculating quiz scores.
- Generating detailed feedback with explanations.
- Storing quiz attempts in MongoDB Atlas.
- Retrieving previous quiz history for users.

## Gemini API

The Gemini API is responsible for generating dynamic, topic-specific multiple-choice questions. Based on the provided prompt, it returns:

- Quiz questions
- Four answer options for each question
- The correct answer
- A detailed explanation

This enables the application to generate high-quality quizzes on a wide range of topics.

## MongoDB Atlas

MongoDB Atlas serves as the application's cloud database. It stores:

- Quiz topics
- User responses
- Scores
- Correct answers
- Explanations
- Timestamps
- Complete quiz history

This allows users to review their past performance and track learning progress.

# Application Workflow

1. The user enters a quiz topic in the React frontend.
2. The frontend sends a **POST** request to the FastAPI backend.
3. The backend optionally retrieves additional context from Wikipedia.
4. FastAPI sends a prompt to the Gemini API.
5. Gemini generates AI-powered multiple-choice questions.
6. The backend returns the generated questions to the React frontend.
7. The user answers the quiz and submits it.
8. FastAPI evaluates the responses, calculates the score, and prepares detailed feedback.
9. The quiz results are stored in MongoDB Atlas.
10. The frontend displays the final score, explanations, and allows users to view their previous quiz attempts.

## AI Tools Used

This project was developed with the assistance of AI tools to enhance productivity and streamline the development process.

### Claude

Claude was primarily used for:

- Analyzing the project requirements and problem statement.
- Designing the overall system architecture.
- Assisting with backend and frontend code generation.
- Supporting React frontend development and implementation.

### ChatGPT

ChatGPT was primarily used for:

- Debugging and resolving development issues.
- Explaining errors and suggesting fixes.
- Assisting with project documentation, including the README.
- Improving code clarity and development workflow.
