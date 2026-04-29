# Changelog

All notable changes to the Studere project will be documented in this file.

## [1.0.0] - 2025-04-28

### Added
- Complete AI-powered study assistant with transcription, summarization, and quiz generation
- Dual audio processing pipeline (client-side for <24MB, server-side with FFmpeg for larger files)
- Interactive study tools: flashcards, quizzes, mind maps, and action items
- AI tutor chat (Stude) with contextual session awareness
- Exercise evaluation with detailed feedback
- Study analytics dashboard with visualizations
- Export functionality (PDF, Markdown, CSV)
- Dark mode support throughout the application
- Pomodoro timer with focus mode
- Comprehensive E2E test suite (39 tests, ~90% coverage)
- Error boundaries for graceful failure handling

### Fixed
- Audio routing crash - files now correctly routed to server-side before browser decoding
- ProcessAudio disk leak - temporary files properly cleaned up
- LocalStorage quota handling with safeSetItem utility
- SHA-256 cache keys for consistent backend caching
- Granular error boundaries to prevent full page crashes

### Refactored
- Session detail component split from 684 to 348 lines with extracted panels
- GSAP animations centralized in reusable hooks (128 lines removed)
- Audio pipeline optimized with proper AbortController timeouts
- Backend logging cleaned (removed redundant console.log statements)

## [0.9.0] - 2025-04-15

### Added
- Server-side audio processing for large files (>24MB)
- Azure Blob Storage integration for audio chunk uploads
- HealthCheck endpoint with cache statistics
- Rate limiting and circuit breaker patterns

### Fixed
- CORS handling for production deployments
- Memory leaks in audio processing functions
- Safari compatibility issues with MediaRecorder

## [0.8.0] - 2025-04-01

### Added
- Initial client-side audio chunking with Web Audio API
- Whisper transcription integration
- Study session generation with GPT-4o-mini
- Basic flashcard and quiz viewers

### Changed
- Migrated from Zustand to localStorage for session persistence
- Optimized bundle size (reduced from 1.2MB to 890KB)

## [0.1.0] - 2025-03-15

### Added
- Initial project setup with Next.js 14 and Azure Functions
- Basic session creation and management
- File upload and transcription prototype
- TailwindCSS design system

---

## Portfolio Note

This project is portfolio-ready as of April 28, 2025. 
- All known bugs resolved
- TypeScript strict mode passing
- E2E tests: 39 passing on Chromium
- Code quality: No console.log in production, CSS variables only
