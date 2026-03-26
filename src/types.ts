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
