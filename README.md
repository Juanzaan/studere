# 🎓 Studere - AI-Powered Study Assistant

Transform your class recordings and notes into interactive study materials with AI.

[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.4-blue)](https://www.typescriptlang.org/)
[![Azure Functions](https://img.shields.io/badge/Azure-Functions-0078D4)](https://azure.microsoft.com/en-us/services/functions/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## 📖 Overview

**Studere** is an educational platform designed for university and high-school students to review post-class content effectively. Upload audio/video recordings, paste text, or share URLs, and let AI generate comprehensive study packages including:

- 📝 **Smart Summaries** - Condensed key points from your lectures
- 🃏 **Flashcards** - Spaced repetition study cards
- ✅ **Interactive Quizzes** - Test your knowledge with AI-generated questions
- 🧠 **Mind Maps** - Visual concept relationships
- 📋 **Action Items** - Extracted tasks and follow-ups
- 💬 **AI Tutor (Stude)** - Chat with context-aware AI for help

## ✨ Features

### 🎙️ Multi-Source Input
- **Audio/Video Upload** - Supports files up to 2+ hours (automatic transcription via Azure OpenAI Whisper)
- **Text/URL Paste** - Direct content input
- **Dual Processing Pipeline** - Client-side for small files (<24MB), server-side with FFmpeg for larger files

### 🤖 AI-Powered Generation
- Automatic transcription with timestamp segmentation
- Comprehensive study material generation using GPT-4o-mini
- Contextual AI tutor for Q&A
- Exercise evaluation with detailed feedback

### 📊 Study Analytics
- Track study time and session completion
- Performance metrics and progress visualization
- Session history and starred favorites

### 💾 Offline-First Architecture
- LocalStorage + IndexedDB persistence
- Works without constant internet connection
- Automatic sync when online

### 🎨 Modern UI/UX
- Dark mode support
- Responsive design (mobile, tablet, desktop)
- Smooth GSAP animations
- Accessible components (WCAG 2.1 AA compliant)

### 📤 Export Options
- PDF export for study materials
- Markdown export for notes
- CSV export for flashcards

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18 LTS or higher
- **Azure Account** (for OpenAI and Storage services)
- **Azure Functions Core Tools** v4
- **Azurite** (for local storage emulation)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Juanzaan/studere.git
cd studere
```

2. **Install dependencies**
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

3. **Configure environment variables**

**Frontend** - Create `frontend/.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:7071
```

**Backend** - Create `backend/local.settings.json`:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_OPENAI_ENDPOINT": "https://your-resource.openai.azure.com/",
    "AZURE_OPENAI_KEY": "your-api-key-here",
    "AZURE_OPENAI_DEPLOYMENT": "stude-gpt4omini",
    "AZURE_OPENAI_WHISPER_DEPLOYMENT": "whisper",
    "AZURE_STORAGE_CONNECTION_STRING": "UseDevelopmentStorage=true",
    "ALLOWED_ORIGIN": "*"
  }
}
```

> ⚠️ **Never commit `local.settings.json` to version control!** It's already in `.gitignore`.

4. **Start Azurite (local storage emulator)**
```bash
azurite --silent --location ./azurite --debug ./azurite/debug.log
```

5. **Run the application**

```bash
# Terminal 1 - Backend
cd backend
func start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

6. **Open your browser**
```
http://localhost:3000
```

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Next.js 14.2.5 (App Router)
- TypeScript 5.5.4
- TailwindCSS 3.4.7
- Zustand 5.0.12 (state management)
- GSAP 3.14.2 (animations)
- React Flow 12.10.1 (mind maps)
- Recharts 3.8.0 (analytics)
- KaTeX 0.16.42 (math rendering)

**Backend:**
- Azure Functions v4 (Node.js 18)
- Azure OpenAI (GPT-4o-mini, Whisper)
- Azure Blob Storage
- FFmpeg (audio processing)
- Circuit breaker pattern (Opossum)
- In-memory caching (node-cache)

**Testing:**
- Vitest 4.1.2 (unit/integration)
- Playwright 1.58.2 (E2E)
- MSW 2.12.14 (API mocking)

### Project Structure

```
studere/
├── frontend/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (app)/             # Main app layout group
│   │   │   ├── dashboard/     # Dashboard page
│   │   │   ├── library/       # All sessions
│   │   │   ├── sessions/[id]/ # Session detail
│   │   │   └── analytics/     # Study analytics
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   ├── lib/                   # Core utilities & API
│   ├── src/
│   │   ├── domains/           # Domain-driven modules
│   │   ├── shared/            # Shared utilities
│   │   └── store/             # Zustand store
│   └── e2e/                   # Playwright tests
│
├── backend/
│   ├── GenerateStudySession/  # AI study material generation
│   ├── ProcessAudio/          # Server-side audio processing
│   ├── TranscribeAudio/       # Whisper transcription
│   ├── StudeChat/             # AI tutor chat
│   ├── EvaluateExercise/      # Exercise feedback
│   ├── HealthCheck/           # Health endpoint
│   └── shared/                # Shared backend utilities
│
└── docs/                      # Documentation
```

## 🧪 Testing

```bash
# Frontend unit tests
cd frontend
npm run test

# E2E tests
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# Backend tests
cd backend
npm test
```

## 📦 Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Configure environment variable:
   - `NEXT_PUBLIC_BACKEND_URL` = Your Azure Functions URL
3. Deploy automatically on push to `main`

### Backend (Azure Functions)

1. Create Azure resources:
   - Azure Functions App (Node.js 18)
   - Azure OpenAI Service (GPT-4o-mini + Whisper deployments)
   - Azure Storage Account

2. Configure Application Settings in Azure Portal:
```
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=stude-gpt4omini
AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper
AZURE_STORAGE_CONNECTION_STRING=your-connection-string
ALLOWED_ORIGIN=https://your-vercel-app.vercel.app
```

3. Deploy:
```bash
cd backend
func azure functionapp publish your-function-app-name
```

See [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) for detailed instructions.

## 📚 Documentation

- [Environment Variables](ENV_VARIABLES.md) - Complete environment setup guide
- [Deployment Guide](DEPLOY_GUIDE.md) - Step-by-step deployment instructions
- [Architecture Fixes](ARCHITECTURE_FIXES.md) - Technical architecture decisions
- [Integration Guide](INTEGRATION_GUIDE.md) - API integration documentation

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Write tests for new features
- Maintain existing code style (Prettier/ESLint)
- Update documentation as needed

## 🔒 Security

- Never commit API keys or secrets
- Use environment variables for sensitive data
- Rotate exposed keys immediately
- Report security vulnerabilities privately

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Azure OpenAI for GPT-4o-mini and Whisper models
- Next.js team for the amazing framework
- All open-source contributors

## 📧 Contact

**Juan Pablo Zanolli** - [@Juanzaan](https://github.com/Juanzaan)

Project Link: [https://github.com/Juanzaan/studere](https://github.com/Juanzaan/studere)

---

**Made with ❤️ for students who want to study smarter, not harder.**
