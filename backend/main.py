import os
import json
import uuid
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.genai as genai
from google.genai import types
from google.genai.errors import ClientError, ServerError
import wikipediaapi
from dotenv import load_dotenv
from pymongo.collection import Collection
from database import get_mongo_client, get_collection, init_db

load_dotenv()

# ── Startup validation ─────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    raise RuntimeError(
        "\n\n❌  GEMINI_API_KEY is not set.\n"
        "    Get a free key at https://aistudio.google.com/apikey\n"
        "    Then add it to backend/.env:  GEMINI_API_KEY=your_key_here\n"
    )

# ── DB setup ───────────────────────────────────────────────────────────────────
try:
    mongo_client = get_mongo_client()
    mongo_client.admin.command("ping")
    init_db(mongo_client)
    print("✓ Connected to MongoDB and indexes ready")
except Exception as e:
    raise RuntimeError(
        f"\n\n❌  Could not connect to MongoDB: {e}\n"
        "    Check your MONGODB_URI and MONGODB_DATABASE variables in backend/.env\n"
    )


def get_col() -> Collection:
    return get_collection(mongo_client)


# ── App setup ──────────────────────────────────────────────────────────────────
app = FastAPI(title="Quiz Builder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

gemini_client = genai.Client(api_key=GEMINI_API_KEY)
GEMINI_MODEL = "gemini-2.5-flash"

wiki_client = wikipediaapi.Wikipedia(
    user_agent="QuizBuilder/1.0 (quizbuilder@example.com)",
    language="en"
)

# In-memory session store (holds unanswered quiz state)
quiz_sessions: dict = {}


# ── Pydantic models ────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    topic: str


class SubmitRequest(BaseModel):
    session_id: str
    answers: list[int]


# ── Wikipedia grounding ────────────────────────────────────────────────────────

def fetch_wiki_grounding(topic: str) -> str:
    """
    Fetch a short Wikipedia summary to use as factual grounding for Gemini.
    Keeps token usage low by capping at 300 words.
    Returns an empty string if the page doesn't exist or fetch fails.
    """
    try:
        page = wiki_client.page(topic)
        if page.exists():
            words = page.summary.split()
            return " ".join(words[:300])
    except Exception:
        pass
    return ""


# ── Gemini prompt builder ──────────────────────────────────────────────────────

def build_gemini_prompt(topic: str, wiki_grounding: str) -> str:
    """
    Build the prompt sent to Gemini. If Wikipedia grounding is available,
    it is injected so Gemini generates factually accurate questions.
    """
    grounding_block = ""
    if wiki_grounding:
        grounding_block = f"""
Use the following verified Wikipedia excerpt to ensure factual accuracy in your questions:
<wikipedia_context>
{wiki_grounding}
</wikipedia_context>
"""
    return f"""You are a quiz creator powered by Gemini. Generate exactly 5 multiple-choice questions about: "{topic}".
{grounding_block}
Rules:
- Each question has exactly 4 short options (A, B, C, D) — keep each option under 10 words
- Exactly one option is correct
- Keep explanations concise (1-2 sentences max)

Respond with ONLY a valid JSON array, no markdown, no code fences. Schema:
[
  {{
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "correct_index": 0,
    "explanation": "string"
  }}
]"""


# ── Gemini call ────────────────────────────────────────────────────────────────

def call_gemini(prompt: str, max_output_tokens: int) -> str:
    """Send a prompt to Gemini and return the raw text response."""
    response = gemini_client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=max_output_tokens,
        ),
    )
    return response.text


# ── Response parser ────────────────────────────────────────────────────────────

def parse_gemini_quiz_response(gemini_raw: str) -> list:
    """
    Parse and validate the JSON quiz array returned by Gemini.
    Attempts to recover truncated responses before raising an error.
    """
    text = gemini_raw.strip()

    # Strip markdown code fences if Gemini adds them despite instructions
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]).strip()

    # Attempt to recover truncated JSON by trimming to the last complete object
    if not text.endswith("]"):
        last_complete = text.rfind("},")
        if last_complete != -1:
            text = text[:last_complete + 1] + "\n]"

    data = json.loads(text)
    assert isinstance(data, list) and len(data) == 5, (
        f"Gemini returned {len(data) if isinstance(data, list) else type(data)} questions, expected 5"
    )
    for q in data:
        assert "question" in q, "Missing 'question' field in Gemini response"
        assert "options" in q and len(q["options"]) == 4, "Expected 4 options in Gemini response"
        assert "correct_index" in q and 0 <= q["correct_index"] <= 3, "Invalid correct_index in Gemini response"
        assert "explanation" in q, "Missing 'explanation' field in Gemini response"
    return data


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "gemini_model": GEMINI_MODEL}


@app.post("/generate-quiz")
def generate_quiz(req: GenerateRequest):
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")

    # Fetch Wikipedia grounding to improve Gemini's factual accuracy
    wiki_grounding = fetch_wiki_grounding(req.topic)
    prompt = build_gemini_prompt(req.topic, wiki_grounding)

    gemini_raw = None
    last_error = None

    # Try with increasing token limits: 4000 first, then 8000
    for max_output_tokens in [4000, 8000]:
        try:
            gemini_raw = call_gemini(prompt, max_output_tokens)
            questions = parse_gemini_quiz_response(gemini_raw)

            session_id = str(uuid.uuid4())
            quiz_sessions[session_id] = {
                "topic": req.topic,
                "questions": questions,
                "created_at": datetime.utcnow().isoformat(),
            }
            return {"session_id": session_id, "topic": req.topic, "questions": questions}

        except ClientError as e:
            status = getattr(e, 'status_code', 0)
            if status in (401, 403):
                raise HTTPException(status_code=500, detail="Invalid Gemini API key. Check your backend/.env file.")
            elif status == 429:
                raise HTTPException(status_code=429, detail="Gemini rate limit hit. Please wait a moment and try again.")
            raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")
        except ServerError as e:
            raise HTTPException(status_code=500, detail=f"Gemini server error: {str(e)}")
        except (json.JSONDecodeError, AssertionError, IndexError) as e:
            last_error = e
            print(f"[warn] Gemini attempt with max_output_tokens={max_output_tokens} failed: {e}. Retrying...")
            continue
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gemini request failed: {str(e)}")

    raise HTTPException(
        status_code=500,
        detail=f"Gemini failed to generate a valid quiz after retries: {last_error}. Raw snippet: {(gemini_raw or '')[:300]}"
    )


@app.post("/submit")
def submit_quiz(req: SubmitRequest, col: Collection = Depends(get_col)):
    session = quiz_sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    questions = session["questions"]
    if len(req.answers) != len(questions):
        raise HTTPException(
            status_code=400,
            detail=f"Expected {len(questions)} answers, got {len(req.answers)}"
        )

    results = []
    score = 0
    for i, q in enumerate(questions):
        correct = q["correct_index"]
        selected = req.answers[i]
        is_correct = selected == correct
        if is_correct:
            score += 1
        results.append({
            "question": q["question"],
            "options": q["options"],
            "selected_index": selected,
            "correct_index": correct,
            "is_correct": is_correct,
            "explanation": q["explanation"],
        })

    result_id = str(uuid.uuid4())
    doc = {
        "id": result_id,
        "topic": session["topic"],
        "score": score,
        "total": len(questions),
        "created_at": datetime.utcnow(),
        "questions": results,
    }
    col.insert_one(doc)

    del quiz_sessions[req.session_id]

    return {
        "score": score,
        "total": len(questions),
        "results": results,
        "result_id": result_id,
    }


@app.get("/history")
def get_history(limit: int = 10, col: Collection = Depends(get_col)):
    rows = col.find(
        {},
        {"_id": 0, "id": 1, "topic": 1, "score": 1, "total": 1, "created_at": 1}
    ).sort("created_at", -1).limit(limit)

    return [
        {
            "id": r["id"],
            "topic": r["topic"],
            "score": r["score"],
            "total": r["total"],
            "created_at": r["created_at"].isoformat(),
        }
        for r in rows
    ]


@app.get("/history/{result_id}")
def get_result(result_id: str, col: Collection = Depends(get_col)):
    row = col.find_one({"id": result_id}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Result not found")
    return {
        "id": row["id"],
        "topic": row["topic"],
        "score": row["score"],
        "total": row["total"],
        "created_at": row["created_at"].isoformat(),
        "results": row["questions"],
    }