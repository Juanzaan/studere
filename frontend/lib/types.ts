export type TranscriptSegment = {
  id: string;
  speaker: string;
  timestamp: string;
  text: string;
};

export type Concept = {
  term: string;
  description: string;
};

export type Flashcard = {
  question: string;
  answer: string;
  confidence?: "easy" | "good" | "hard" | "again";
  lastReviewed?: string;
  nextReview?: string;
  interval?: number;
};

export type QuizItem = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

export type ExerciseSubmission = {
  type: "text" | "image";
  content: string;
  submittedAt: string;
};

export type ExerciseFeedback = {
  grade: "correct" | "partial" | "incorrect";
  explanation: string;
  receivedAt: string;
};

export type ActionItem = {
  id: string;
  title: string;
  owner: string;
  status: "pending" | "completed";
  dueLabel: string;
  sourceSegmentId?: string;
  exercisePrompt?: string;
  submission?: ExerciseSubmission;
  feedback?: ExerciseFeedback;
};

export type MindMapNode = {
  id: string;
  label: string;
  accent?: "violet" | "blue" | "green" | "amber";
  children?: MindMapNode[];
};

export type SessionInsight = {
  id: string;
  label: string;
  value: string;
  description: string;
  tone: "neutral" | "good" | "warning";
};

export type Bookmark = {
  id: string;
  segmentId: string;
  label: string;
  createdAt: string;
};

export type SessionComment = {
  id: string;
  text: string;
  createdAt: string;
  segmentId?: string;
};

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
};

export type QuizAttempt = {
  sessionId: string;
  timestamp: string;
  correct: number;
  total: number;
};

export type FlashcardAttempt = {
  sessionId: string;
  timestamp: string;
  reviewed: number;
};

export type StudySession = {
  id: string;
  title: string;
  course: string;
  createdAt: string;
  starred: boolean;
  sourceFileName: string;
  sourceFileType: string;
  sourceKind: "audio" | "video" | "text";
  templateId: "class-summary" | "exam-review" | "meeting-notes";
  sourceUrl?: string;
  transcript: TranscriptSegment[];
  summary: string;
  keyConcepts: Concept[];
  flashcards: Flashcard[];
  quiz: QuizItem[];
  actionItems: ActionItem[];
  mindMap: MindMapNode;
  bookmarks: Bookmark[];
  comments: SessionComment[];
  insights: SessionInsight[];
  chatHistory: ChatMessage[];
  stats: {
    wordCount: number;
    segmentCount: number;
    estimatedDurationMinutes: number;
  };
  studyMetrics: {
    completionRate: number;
    quizAccuracy: number;
    reviewCount: number;
    lastReviewedAt?: string;
  };
};

export type SessionDraftInput = {
  title: string;
  course: string;
  fileName?: string;
  fileType?: string;
  sourceUrl?: string;
  templateId?: StudySession["templateId"];
  notes?: string;
};
