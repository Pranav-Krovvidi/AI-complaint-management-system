# AI-Powered Customer Complaint Management System (Pharmaceutical)

Built for the AIVOA Round 1 AI Product Engineer assignment. A full-stack
complaint management system for pharma QMS complaint handling: React + Redux
frontend, FastAPI backend, PostgreSQL/MySQL-compatible database, JWT
authentication, complaint CRUD, PDF/image attachments — plus an AI layer
built with **LangGraph** and **Groq** that covers the full demo workflow:

> Upload a complaint PDF/email (or paste the text) → AI extracts and
> pre-fills the Log Complaint form → you review/submit → AI Copilot on the
> complaint page gives a risk assessment, category, root cause, and CAPA
> recommendation.

## Architecture

```
complaint-system/
├── backend/                 FastAPI + SQLAlchemy + PostgreSQL + LangGraph
│   ├── app/
│   │   ├── core/              config.py (settings incl. LLM config), security.py
│   │   ├── db/                 database.py (engine, session, Base)
│   │   ├── models/             SQLAlchemy models: User, Complaint, Attachment
│   │   ├── schemas/            Pydantic request/response schemas (incl. ai.py)
│   │   ├── crud/                DB access functions (incl. duplicate detection)
│   │   ├── ai/                  LangGraph AI module (see below)
│   │   ├── api/routes/         auth.py, users.py, complaints.py, ai.py
│   │   └── main.py              app entrypoint, CORS, router wiring
│   ├── requirements.txt
│   └── .env.example
└── frontend/                 React 18 + Redux Toolkit + Vite + Tailwind + Inter
    └── src/
        ├── api/                 axios client (JWT interceptor) + complaints API
        ├── store/               Redux store, authSlice, complaintSlice
        ├── components/         Navbar, ProtectedRoute, Badge, AIIntakePanel,
        │                       AICopilotPanel
        ├── pages/                Login, Register, Dashboard, ComplaintList,
        │                        LogComplaintForm (+ AI intake), ComplaintDetails
        │                        (+ AI Copilot sidebar)
        └── App.jsx               routing
```

### The `app/ai/` module

```
app/ai/
├── schemas.py          Pydantic output schema per node (summary, risk, category,
│                        root_cause, capa, completeness, intake_extraction)
├── prompts.py          System prompts for each node + prompt builders
├── llm_client.py        Provider-agnostic OpenAI-compatible client: JSON
│                        extraction, schema validation, retries across
│                        primary/fallback model, fail-fast when no API key set
├── document_parser.py   Best-effort text extraction from uploaded intake
│                        files: PDF text (pypdf), image OCR (pytesseract,
│                        degrades gracefully if unavailable), plain text/email
├── graph.py              Two LangGraph StateGraphs:
│                          - complaint_analysis_graph: 6-node pipeline
│                            (summary → risk → category → root cause → CAPA →
│                            completeness), each node with its own fallback
│                          - intake_extraction_graph: 1-node pipeline that
│                            turns raw intake text into structured form fields
└── service.py            Bridges SQLAlchemy/raw text into the graphs and
                          shapes results for the API
```

**Two AI entry points, matching the demo workflow:**

1. **Intake extraction** (`POST /api/v1/ai/extract-intake`) — runs *before* a
   complaint exists. Takes pasted email/complaint text and/or an uploaded
   PDF/image, extracts text (`document_parser.py`), runs it through the
   `intake_extraction_graph`, and returns structured fields
   (`product_name`, `batch_number`, `customer_name`, `customer_contact`,
   `description`, `category`, `severity`) plus any likely duplicate
   complaints already on file. The frontend uses this to pre-fill the Log
   Complaint form.
2. **Complaint analysis / AI Copilot** (`POST /api/v1/complaints/{id}/ai-analysis`)
   — runs *after* a complaint exists. Runs the full 6-node
   `complaint_analysis_graph` for summary, risk classification, category
   suggestion, root cause ideas, CAPA recommendation, and a completeness
   check.

**Duplicate complaint detection (bonus feature)** is a deterministic,
LLM-free heuristic in `crud/crud_complaint.py::find_potential_duplicates` —
exact batch-number match plus description similarity (`difflib`) against
existing complaints. Runs on every intake extraction call.

**Provider-agnostic by design:** the LLM client talks to any OpenAI-compatible
`/chat/completions` endpoint. Configured for **Groq**, with `gemma2-9b-it` as
the primary model (per the assignment spec) and `llama-3.3-70b-versatile` as
an automatic fallback if the primary call fails — just change
`LLM_API_BASE_URL` / `LLM_API_KEY` / model names in `.env` to point at
Together AI or a local Ollama server instead, no code changes.

**Why this layout:** routes stay thin (HTTP concerns only), `crud/` owns all
database queries, and `schemas/` keeps the API contract separate from the DB
models.

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ (or MySQL — swap the SQLAlchemy driver/connection string) or
  SQLite for quick local testing (see note below)
- Optional, for image-based intake (OCR): the `tesseract` binary installed on
  your system (`sudo apt-get install tesseract-ocr` / `brew install
  tesseract`). Not required — PDF and pasted-text intake work without it, and
  image intake just returns a clear message asking you to paste text instead
  if it's missing. Not production-grade OCR, per the assignment brief.

## Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env: set DATABASE_URL to your Postgres/MySQL connection string
# and change SECRET_KEY to a long random string.
#
# For AI features, also set LLM_API_KEY (see the AI setup section below).
# Without it, AI endpoints still work — every node returns a graceful
# fallback result with an error note instead of failing.
```

Create the database (adjust for your Postgres setup):

```bash
createdb complaint_db
```

Run the API:

```bash
uvicorn app.main:app --reload
```

- API root: http://localhost:8000
- Interactive API docs (Swagger): http://localhost:8000/docs
- Alternative docs (ReDoc): http://localhost:8000/redoc

Tables are created automatically on startup via `Base.metadata.create_all`.
This is fine for learning/development. For a production setup, replace this
with Alembic migrations (`alembic init`, `alembic revision --autogenerate`).

**Quick local testing without Postgres:** set `DATABASE_URL=sqlite:///./dev.db`
in `.env`. Everything works the same; just swap it back to Postgres/MySQL later.

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173
- By default it talks to `http://localhost:8000/api/v1`. To change this,
  create `frontend/.env` with:
  ```
  VITE_API_BASE_URL=http://localhost:8000/api/v1
  ```

## AI setup

1. Get a free API key from [Groq](https://console.groq.com) (required —
   serves both `gemma2-9b-it`, the assignment's required model, and
   `llama-3.3-70b-versatile` as fallback).
2. In `backend/.env`, set:
   ```
   LLM_API_KEY=your-key-here
   ```
   The other `LLM_*` defaults in `.env.example` already point at Groq's
   endpoint and the two models.
3. Restart the backend. No other changes needed — both the AI Intake panel
   on the Log Complaint page and the AI Copilot panel on the Complaint
   Details page will now return real results instead of fallback placeholders.

To switch providers, only `.env` changes:
- **Together AI:** `LLM_API_BASE_URL=https://api.together.xyz/v1` + a Together key
- **Local Ollama:** `LLM_API_BASE_URL=http://localhost:11434/v1` (key can be any placeholder string)

## Using the app (end-to-end demo flow)

1. Go to http://localhost:5173/register and create an account (pick a role:
   investigator, qa_manager, viewer, or admin).
2. Log in.
3. **Dashboard** — summary stats (total, open, critical) and breakdowns by
   status/category/severity.
4. **Log Complaint** — this is the AI intake demo:
   - Paste a customer email/complaint text and/or upload a PDF or image
     (you can create a sample pharma complaint PDF/email/image for this).
   - Click **Extract with AI** — the form below is pre-filled from the
     extracted fields, and any likely duplicate complaints already on file
     are flagged.
   - Review/edit the pre-filled fields (product, batch, customer, category,
     severity, description) and submit — optionally attach the original
     PDF/image as evidence.
5. **Complaints** — searchable, filterable, paginated list.
6. **Complaint Details** — view full details, update status/root
   cause/CAPA notes inline, upload/download attachments.
7. **AI Copilot** (right sidebar on Complaint Details) — click **Run
   analysis** for an AI-generated summary, risk classification, category
   suggestion, likely root causes, and a CAPA recommendation. Click **Apply
   all suggestions to record** to write those onto the complaint.

## API summary

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Create a user |
| POST | `/api/v1/auth/login` | Get a JWT (OAuth2 password flow) |
| GET  | `/api/v1/users/me` | Current user profile |
| POST | `/api/v1/complaints` | Create a complaint |
| GET  | `/api/v1/complaints` | List complaints (filters: status, category, severity, search; paginated) |
| GET  | `/api/v1/complaints/dashboard` | Aggregate stats |
| GET  | `/api/v1/complaints/{id}` | Get one complaint |
| PUT  | `/api/v1/complaints/{id}` | Update a complaint (partial) |
| DELETE | `/api/v1/complaints/{id}` | Delete a complaint |
| POST | `/api/v1/complaints/{id}/attachments` | Upload a PDF/image |
| GET  | `/api/v1/complaints/attachments/{attachment_id}/download` | Download an attachment |
| POST | `/api/v1/ai/extract-intake` | AI intake: extract structured fields (+ duplicate check) from pasted text and/or an uploaded PDF/image, before a complaint exists |
| POST | `/api/v1/complaints/{id}/ai-analysis` | Run the full AI Copilot pipeline (summary, risk, category, root cause, CAPA, completeness) |
| POST | `/api/v1/complaints/{id}/ai-analysis/apply` | Re-run analysis and apply selected suggestions to the complaint |

Full interactive documentation (request/response schemas, try-it-out) is
auto-generated at `/docs`.

## What's verified

This project was built and reviewed in a sandboxed environment with **no
network access** (no `pip install` / `npm install` possible here), so it has
**not** been run against a live server or a live LLM API in this
environment. What was verified here instead:

- Every backend Python file passes `py_compile` (syntax-correct).
- Every frontend `.jsx` file passes a TypeScript-compiler syntax parse
  (`tsc --jsx react-jsx --noEmit`) with zero errors.
- `app/ai/document_parser.py` was unit-tested standalone (outside FastAPI,
  using the pypdf/Pillow/pytesseract packages that were available locally):
  confirmed correct text extraction from a generated PDF, a generated PNG
  image (via OCR), and plain text.
- Manual trace of every new code path: the intake endpoint's file/text
  handling, the LangGraph node wiring and fallback behavior for both graphs,
  the duplicate-detection SQL query, and the frontend's field-merging logic
  in `LogComplaintForm`.
- Fixed a real bug found via review: `uploadAttachment`/`extractIntake` were
  manually setting `Content-Type: multipart/form-data` without a boundary,
  which breaks multipart parsing in the browser — now left unset so
  axios/the browser sets it correctly.

**Do this first** once you have a real environment with network access:

```bash
# Backend
cd backend && pip install -r requirements.txt
cp .env.example .env   # then set DATABASE_URL, SECRET_KEY, LLM_API_KEY
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

Then smoke-test in this order: register → login → Log Complaint page → paste
a sample complaint email and click **Extract with AI** (confirm the form
fills in, not just fallback empty fields) → submit → Complaint Details →
**Run analysis** in the AI Copilot panel (confirm real summary/risk/category
content, not "AI ... unavailable" fallback text) → **Apply all suggestions**.

## Known limitations / next steps

- No role enforcement on endpoints yet (roles exist on the User model;
  wiring `require_roles` into routes — including the AI routes — is a good
  first exercise).
- No pagination caching or optimistic UI updates.
- No automated test suite yet (pytest for backend, Vitest/RTL for frontend).
  The AI module in particular would benefit from tests that mock the LLM
  HTTP call to check fallback vs. success-path behavior deterministically.
- Table creation uses `create_all` rather than Alembic migrations.
- The 6 AI Copilot nodes currently run strictly in sequence; independent
  ones (e.g. risk classification and categorization) could run in parallel
  in LangGraph for lower latency.
- Duplicate detection is a deterministic heuristic (batch number + text
  similarity), not embedding-based semantic similarity — a good upgrade if
  you want to catch duplicates phrased very differently.
- Image OCR is intentionally basic (`pytesseract` on whatever's uploaded) —
  the assignment brief explicitly doesn't require production-grade
  OCR/document parsing.
