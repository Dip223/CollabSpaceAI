# CollabSpaceAI

CollabSpaceAI is a real-time collaborative workspace platform — think a lightweight mix of Slack, Google Docs, and an AI form-filling assistant. Teams create shared workspaces where they can chat, co-edit a rich-text document with live cursors, share files, and get notified of activity, all in real time over WebSockets. It also ships a standalone **Smart Forms** module that uses Google Gemini to read a blank form, detect its fillable fields, and auto-fill them from a person's uploaded documents (passport, degree certificate, etc.) or from voice input in English or Bengali.

The project is split into three independently deployable services:

| Service | Path | Stack | Responsibility |
|---|---|---|---|
| **Client** | [`client/`](./client) | React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui | The web app (auth pages, dashboard, workspace, notifications, smart forms UI) |
| **Server** | [`server/`](./server) | Node.js + Express 5 + TypeScript + Prisma + Socket.IO | REST API, authentication, business logic, WebSocket real-time layer, PostgreSQL persistence |
| **AI service** | [`ai-service/`](./ai-service) | Python + FastAPI + Google Gemini (`google-genai`) | Document/OCR extraction, form field detection, AI form-filling, voice-intent parsing |

The Node server never talks to Gemini directly — it proxies authenticated requests to the Python AI service, so the Gemini API key is never exposed to the browser.

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [API overview](#api-overview)
- [Real-time events (Socket.IO)](#real-time-events-socketio)
- [Deployment](#deployment)
- [Security notes](#security-notes)

## Features

### Workspaces (Servers)
- Create a workspace and get a unique, shareable invite code
- Join a workspace with an invite code
- Rename the workspace and manage members (owner/admin only)
- Leave a workspace, or remove a member

### Real-time collaboration
- **Live chat** per workspace with typing indicators
- **Shared rich-text document** (per-workspace note) with:
  - Live co-editing broadcast over WebSockets (in addition to a persisted save via REST)
  - Live collaborator cursors and presence
  - Rich formatting, tables, shapes, and inline images in a `contentEditable` editor
- **Online presence** — see who else is currently in the workspace
- **File sharing** — upload files (via Cloudinary), list, download, and delete them per workspace
- **Notifications** — offline members are notified (in-app, with unread counts) about note edits, new messages, and file shares they missed while away

### Authentication
- Email/password registration and login (JWT-based sessions)
- Email OTP verification flow
- Forgot / reset password via emailed token link
- Protected client-side routes

### Smart Forms (AI-powered form filling)
- Upload a **blank form** (PDF, DOC/DOCX, JPG, PNG, or WEBP) — Gemini vision detects every fillable field (text, date, email, number, checkbox) along with its position on the page
- Upload your **personal documents** (passport, national ID, birth certificate, transcripts, etc.) — Gemini reads them and automatically fills the detected form fields, with a confidence score and source per value
- **Voice input** (Chrome/Edge, English or Bengali) to dictate values into individual fields
- Every AI-filled value is meant to be reviewed by the user before being trusted/submitted
- OCR fallback (Tesseract) and PDF/DOCX parsing (PyMuPDF, python-docx) for text-only extraction

## Architecture

```
┌─────────────────┐        HTTPS / REST         ┌──────────────────────┐
│                  │ ───────────────────────────▶│                      │
│   Client (SPA)   │                              │   Server (Node/API) │
│  React + Vite    │◀─────────────────────────── │  Express + Prisma    │
│                  │        WebSocket (Socket.IO) │  + Socket.IO         │
└─────────────────┘◀────────────────────────────▶└──────────┬───────────┘
                                                              │
                                       shared-secret REST     │  Prisma
                                       (server ⇄ ai-service)  ▼
                                                    ┌──────────────────┐        ┌────────────┐
                                                    │   PostgreSQL      │        │            │
                                                    └──────────────────┘        │ Cloudinary │
                                                              ▲                 │ (file/img  │
                                                              │                 │  storage)  │
                                                    ┌──────────────────┐        └────────────┘
                                                    │  AI service        │
                                                    │  FastAPI + Gemini   │
                                                    │  (OCR / Tesseract,  │
                                                    │   PyMuPDF, docx)    │
                                                    └──────────────────┘
```

- The **client** never calls the AI service or Gemini directly — it only calls the Node API.
- The **server** authenticates the user (JWT), then forwards Smart Forms/voice requests to the **AI service** using a shared secret header (`x-ai-service-key`), so the AI service can't be called by anyone except the trusted backend.
- The **AI service** never receives your Gemini key on the client — it lives only in the AI service's environment.

## Tech stack

**Client**
- React 19, TypeScript, Vite 8
- React Router 7, Zustand, React Hook Form + Zod
- Tailwind CSS v4, shadcn/ui (Base UI primitives), Framer Motion, lucide-react
- Socket.IO client, Axios
- `mammoth` (DOCX → HTML), `jspdf` (PDF export)

**Server**
- Node.js, Express 5, TypeScript, `ts-node` / `nodemon` for dev
- Prisma ORM + PostgreSQL
- Socket.IO (real-time chat, presence, live document sync)
- JWT auth (`jsonwebtoken`), `bcrypt`/`bcryptjs` password hashing
- Cloudinary SDK (file storage), Nodemailer (transactional email), Multer (uploads)

**AI service**
- Python, FastAPI, Uvicorn
- `google-genai` (Gemini 3.5/3.6 Flash family, with automatic model fallback)
- PyMuPDF (`fitz`) for PDF parsing/rasterizing, `python-docx` for Word files
- Pillow + `pytesseract` (Tesseract OCR) for image/scan text extraction
- Dockerized (installs the `tesseract-ocr` system package)

**Infra (as configured for production)**
- Client → Vercel
- Server + AI service → Render (Docker for the AI service)
- Database → managed PostgreSQL (Render), or local Docker Postgres for development

## Project structure

```
CollabSpaceAI/
├── ai-service/              # Python FastAPI microservice (Gemini AI, OCR, doc parsing)
│   ├── app.py
│   ├── requirements.txt
│   └── Dockerfile
├── client/                  # React + Vite frontend
│   └── src/
│       ├── pages/           # Login, Register, Dashboard, Workspace, SmartForms, Notifications, ...
│       ├── components/      # layout (Sidebar/Topbar), forms (SmartFormFill, VoiceInput), ui (shadcn)
│       ├── context/         # AuthContext
│       ├── services/        # axios API clients (api, fileApi, messageApi, noteApi, smartFormApi, ...)
│       ├── socket/          # Socket.IO client setup
│       └── hooks/
├── server/                  # Node + Express + Prisma backend
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── docker-compose.yml   # local PostgreSQL for development
│   └── src/
│       ├── routes/          # authRoutes, serverRoutes, fileRoutes, messageRoutes, noteRoutes,
│       │                    # notificationRoutes, formRoutes, voiceRoutes, userRoutes
│       ├── controllers/     # request handlers backing each route group
│       ├── services/        # aiService (proxy to AI microservice), mailService, notificationService
│       ├── socket/          # Socket.IO server (rooms, presence, live doc/cursor sync)
│       ├── middleware/      # authMiddleware (JWT), upload (Multer)
│       └── config/          # prisma client, cloudinary config
└── SMART_FORMS_DEPLOYMENT.md
```

## Data model

Defined in [`server/prisma/schema.prisma`](./server/prisma/schema.prisma):

- **User** — account, email verification/OTP state, password reset tokens
- **Server** (a "Workspace" in the UI) — owned by a User, has a unique invite code
- **Membership** — join table between User and Server
- **File** — files uploaded to a workspace, stored in Cloudinary
- **Note** — one shared rich-text document per workspace
- **Message** — chat messages per workspace
- **Notification** — denormalized activity notifications (note edits, messages, file shares) for offline members

## Getting started

### Prerequisites
- Node.js 20+ and npm
- Python 3.11+
- PostgreSQL (local install, or via the included `docker-compose.yml`)
- A Cloudinary account (for file uploads)
- A Gmail account with an App Password (for verification/reset emails) — optional in dev, since new accounts are auto-verified on signup
- A Google Gemini API key (for the Smart Forms / AI service)

### 1. Clone the repo

```bash
git clone https://github.com/Dip223/CollabSpaceAI.git
cd CollabSpaceAI
```

### 2. Start PostgreSQL

```bash
cd server
docker compose up -d
```

This starts Postgres on `localhost:5432` (db `collabspace`, user `postgres`, password `12345` — see `docker-compose.yml`). Point `DATABASE_URL` at it, or use your own Postgres instance.

### 3. Set up and run the server

```bash
cd server
cp .env.example .env   # then fill in real values — see below
npm install
npx prisma migrate deploy   # apply migrations
npm run dev                 # starts on http://localhost:5000
```

### 4. Set up and run the AI service

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# tesseract-ocr must also be installed on the host (apt install tesseract-ocr / brew install tesseract)
export GEMINI_API_KEY=your_gemini_key
export AI_SERVICE_SHARED_SECRET=some_long_random_string   # must match the server's value
uvicorn app:app --reload --port 8001
```

### 5. Set up and run the client

```bash
cd client
cp .env.example .env   # defaults already point at http://localhost:5000
npm install
npm run dev             # starts on http://localhost:5173
```

Then open `http://localhost:5173`, register an account, create a workspace, and invite teammates with the generated invite code.

## Environment variables

### `server/.env`

| Variable | Description |
|---|---|
| `PORT` | Port the API listens on (default `5000`) |
| `SERVER_URL` | Public URL of this backend (used in email links) |
| `CLIENT_URL` / `CLIENT_URLS` | Allowed frontend origin(s) for CORS + Socket.IO (comma-separated for multiple) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign/verify JWTs |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials for file storage |
| `EMAIL_USER` / `EMAIL_PASS` | Gmail address + App Password used to send verification/reset emails |
| `AI_SERVICE_URL` | Base URL of the AI microservice |
| `AI_SERVICE_SHARED_SECRET` | Shared secret sent as `x-ai-service-key` to authenticate server → AI-service calls |

### `client/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend REST API, including `/api` (e.g. `http://localhost:5000/api`) |
| `VITE_SOCKET_URL` | Base URL of the backend for Socket.IO, without `/api` (e.g. `http://localhost:5000`) |

### `ai-service` environment

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key (required) |
| `AI_SERVICE_SHARED_SECRET` | Must match the server's `AI_SERVICE_SHARED_SECRET` (required) |
| `GEMINI_MODEL` | Optional override of the default Gemini model, with built-in fallback across a few model versions |

> **Never commit real `.env` files.** Only `.env.example` files (with placeholder values) belong in version control.

## API overview

All REST routes are namespaced under `/api` and (except auth) require a `Authorization: Bearer <jwt>` header.

| Route prefix | Purpose |
|---|---|
| `POST /api/auth/register`, `/login`, `/verify-otp`, `/resend-verification`, `/forgot-password`, `/reset-password/:token`, `GET /me` | Authentication & account lifecycle |
| `GET /api/user/me` | Current user profile |
| `POST /api/server/create`, `/join`, `GET /my`, `GET /:id`, `GET /members/:id`, `PUT /:id`, `DELETE /:id/members/:userId`, `DELETE /:id/leave` | Workspace management |
| `POST/GET /api/message/:serverId` | Chat messages |
| `GET/PUT /api/note/:serverId` | Shared workspace document |
| `POST/GET /api/file/:serverId`, `GET /:fileId/download`, `DELETE /:fileId` | File sharing (Cloudinary-backed) |
| `GET /api/notifications`, `GET /unread-count`, `PUT /read` | In-app notifications |
| `POST /api/forms/detect`, `/extract`, `/map`, `/scan-documents` | Smart Forms (proxied to the AI service) |
| `POST /api/voice/intent` | Voice-to-field-value parsing (proxied to the AI service) |

The AI service itself exposes `GET /health`, `POST /voice/intent`, `POST /forms/extract-text`, `POST /forms/map-fields`, `POST /forms/detect-fields`, and `POST /forms/extract-documents` — all (except `/health`) protected by the `x-ai-service-key` shared-secret header, and intended to be called only by the Node server, never directly by the client.

## Real-time events (Socket.IO)

The client authenticates the socket handshake with its JWT. Key events:

| Event | Direction | Purpose |
|---|---|---|
| `join-workspace` / `leave-workspace` | client → server | Join/leave a workspace's Socket.IO room |
| `presence-update` | server → client | Broadcasts who's currently online in the workspace |
| `send-message` / `receive-message` | both | Real-time chat delivery |
| `typing` | both | Chat typing indicator |
| `note-update` | both | Live broadcast of shared-document edits (persisted separately via `PUT /api/note/:serverId`) |
| `note-cursor` / `note-cursor-left` | both | Live collaborator cursor positions in the shared document |
| `file-uploaded` | server → client | Notifies the workspace when a new file is shared |

## Deployment

See [`SMART_FORMS_DEPLOYMENT.md`](./SMART_FORMS_DEPLOYMENT.md) for the production topology used for the AI service, which covers:

- Deploying `ai-service` as a separate Docker-based Render web service (the Dockerfile installs Tesseract)
- Wiring `AI_SERVICE_URL` / `AI_SERVICE_SHARED_SECRET` into the existing Node server on Render
- Keeping the Gemini key and shared secret out of Vercel/client code entirely

Typical production layout:
- **Client** → Vercel (see `client/vercel.json` for SPA rewrites)
- **Server** → Render (Node web service, `npm run build` → `prisma migrate deploy && tsc`, then `npm start`)
- **AI service** → Render (Docker runtime)
- **Database** → managed PostgreSQL (e.g. Render Postgres)

## Security notes

- Uploaded personal documents for Smart Forms are processed in memory and sent to Gemini for extraction — they are not persisted by the AI service. Add a clear privacy notice before any public release, and avoid logging OCR text or raw documents.
- The AI service rejects any request without the correct `x-ai-service-key` header, so it should never be exposed directly to the public internet without that protection in front of it.
- Rotate any credentials that may have been committed to version control (database passwords, Cloudinary secret, email app password, JWT secret) before deploying publicly, and keep real secrets only in `.env` files or your hosting provider's environment variable settings — never in `.env.example` or committed source.