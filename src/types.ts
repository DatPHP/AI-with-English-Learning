export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface Flashcard {
  id?: string;
  userId: string;
  word: string;
  phonetic: string;
  meaning: string;
  wordFamily: string;
  example: string;
  category?: string;
  createdAt: string;
}

export interface GrammarBlog {
  id?: string;
  userId: string;
  title: string;
  content: string;
  category?: string;
  createdAt: string;
}

export type InputAnalysisResult = {
  type: 'vocabulary' | 'grammar';
  data: Flashcard[] | GrammarBlog;
};

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatSession {
  messages: ChatMessage[];
  suggestion?: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface ChallengeAIFeedback {
  feedback: {
    overall: string;
    grammar: { score: number; notes: string };
    vocabulary: { score: number; notes: string };
    pronunciation_tip: string;
  };
  improvedVersion: string;
  score: number;
}

export interface DailyChallengeAttempt {
  day: number;
  completedAt: string;
  transcripts: string[]; // Answers for each question
  aiFeedbacks: (string | ChallengeAIFeedback)[]; // Feedback for each answer
}

export interface SpeakingChallengeProgress {
  userId: string;
  startDate: string;
  targetEndDate: string;
  completedDays: number[]; // Array of day numbers completed [1, 2, 5...]
  lastCompletedDay: number;
  attempts: DailyChallengeAttempt[];
}

export interface ShadowingSentence {
  id: string;
  text: string;
  translation: string;
}

export interface ShadowingTopic {
  id: string;
  title: string;
  level: 'Basic' | 'Intermediate' | 'Advanced';
  category: string;
  description: string;
  sentences: ShadowingSentence[];
}

export interface ShadowingProgress {
  topicId: string;
  completedSentences: string[];
  lastAccessed: number;
}
