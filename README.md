# Smart Traffic AI System (Mission Impossible)

A comprehensive AI-powered Traffic Management & Violation Detection system with a FastAPI backend and React + TypeScript + Vite frontend.

## 🚀 Features

- **Automated Violation Detection**: AI/Computer Vision pipeline for identifying traffic infractions (speeding, helmet violations, red light jumping, illegal parking, etc.).
- **Interactive Dashboard**: Real-time traffic analytics, camera feeds, heatmaps, and police station management.
- **RESTful API**: Fast and modular FastAPI endpoints for analytics, violations, camera status, rules, and maps integration.
- **Modern UI**: React 18, TypeScript, Tailwind CSS, Lucide icons, and interactive charting.

## 📁 Project Structure

```text
├── backend/
│   ├── ai_pipeline/       # AI & Computer vision detection models
│   ├── app/
│   │   ├── api/v1/        # FastAPI endpoints (violations, cameras, analytics, rules)
│   │   ├── db/            # Database configuration, models, and mock seeder
│   │   └── schemas/       # Pydantic data schemas
│   ├── storage/           # Storage directory for snapshots and detection evidence
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── src/               # React TypeScript components, pages, hooks, services
│   ├── public/            # Public assets
│   ├── package.json       # Frontend dependencies and scripts
│   └── vite.config.ts     # Vite configuration
└── README.md
```

## 🛠️ Getting Started

### Backend Setup
1. Navigate to `backend`:
   ```bash
   cd backend
   ```
2. Set up virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Run the backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend Setup
1. Navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

