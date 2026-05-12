/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, db, googleProvider 
} from './lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithPopup
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc,
  orderBy,
  deleteDoc
} from 'firebase/firestore';
import { 
  BookOpen, 
  Plus, 
  LogOut, 
  User as UserIcon, 
  Brain, 
  FileText, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  Trash2, 
  Search,
  Sparkles,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Upload,
  X,
  File as FileIcon,
  Volume2,
  MessageCircle,
  Send,
  Mic,
  MicOff,
  Trophy,
  Award,
  Calendar,
  CheckCircle2,
  Lock,
  ArrowRight,
  Target,
  Headphones
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { analyzeInput, analyzeDocument, getChatResponse, getChatSuggestion, evaluateChallengeAnswer } from './lib/gemini';
import { Flashcard, GrammarBlog, UserProfile, ChatMessage, SpeakingChallengeProgress, DailyChallengeAttempt } from './types';
import mammoth from 'mammoth';
import { speakingChallengeData, ChallengeDay } from './data/challengeData';
import { playHighQualityAudio } from './services/voiceService';
import { SpeakButton } from './components/SpeakButton';
import { ShadowingModule } from './components/ShadowingModule';

// Tiptap Imports
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

const ADMIN_EMAIL = 'admin@gmail.com';
const OWNER_EMAIL = 'nguyenvandat170296@gmail.com';

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  if (errInfo.error.includes('insufficient permissions')) {
    toast.error('Bạn không có quyền thực hiện hành động này.');
  } else {
    toast.error(`Lỗi hệ thống: ${errInfo.error}`);
  }
}

// --- Components ---

const TiptapViewer = ({ content }: { content: string }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
    ],
    content: content,
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-indigo max-w-none focus:outline-none',
      },
    },
  });

  // Update content when it changes
  React.useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return <EditorContent editor={editor} />;
};

const speak = (text: string) => {
  if (!text) return;
  playHighQualityAudio(text);
};

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, loading = false }: any) => {
  const base = "px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: any = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md",
    secondary: "bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "text-gray-600 hover:bg-gray-100"
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`} disabled={disabled || loading}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};

const Input = ({ label, type = 'text', value, onChange, placeholder, required = false }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-sm font-semibold text-gray-700">{label}</label>}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
    />
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [otp, setOtp] = useState('');

  // App State
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [grammarBlogs, setGrammarBlogs] = useState<GrammarBlog[]>([]);
  const [activeTab, setActiveTab] = useState<'input' | 'vocabulary' | 'grammar' | 'chat' | 'challenge' | 'shadowing'>('input');
  const [selectedBlog, setSelectedBlog] = useState<GrammarBlog | null>(null);

  // Challenge State
  const [challengeProgress, setChallengeProgress] = useState<SpeakingChallengeProgress | null>(null);
  const [selectedChallengeDay, setSelectedChallengeDay] = useState<ChallengeDay | null>(null);
  const [challengeStep, setChallengeStep] = useState<'dashboard' | 'setup' | 'learning' | 'practice' | 'summary'>('dashboard');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentTranscript, setCurrentTranscript] = useState<string[]>([]);
  const [currentFeedbacks, setCurrentFeedbacks] = useState<any[]>([]);
  const [isChallengeLoading, setIsChallengeLoading] = useState(false);
  const [challengeEndDate, setChallengeEndDate] = useState('');
  const [challengeSessionDate, setChallengeSessionDate] = useState<string | null>(null);
  const [currentQuestionFeedback, setCurrentQuestionFeedback] = useState<any | null>(null);
  const [currentQuestionTranscript, setCurrentQuestionTranscript] = useState<string | null>(null);

  // AI Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatSuggestion, setChatSuggestion] = useState<string | null>(null);
  const [chatTimer, setChatTimer] = useState<number | null>(null);
  const [suggestionTimeout, setSuggestionTimeout] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef<any>(null);
  const silenceTimerRef = React.useRef<any>(null);
  const accumulatedTranscriptRef = React.useRef<string>("");
  const latestLiveTranscriptRef = React.useRef<string>("");

  // Flashcard Learning State
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Hardcoded Admin Check
        if (u.email === ADMIN_EMAIL || u.email === OWNER_EMAIL) {
          setProfile({
            uid: u.uid,
            name: u.displayName || 'System Admin',
            email: u.email!,
            role: 'admin',
            createdAt: new Date().toISOString()
          });
          setLoading(false);
          return;
        }

        // Fetch profile for normal users
        try {
          const docRef = doc(db, 'users', u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // Create default profile if not exists
            const newProfile: UserProfile = {
              uid: u.uid,
              name: u.displayName || 'User',
              email: u.email || '',
              role: 'user',
              createdAt: new Date().toISOString()
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `users/${u.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Real-time listeners
  useEffect(() => {
    if (!user) return;

    const vQuery = query(collection(db, 'flashcards'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const gQuery = query(collection(db, 'grammarBlogs'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

    const unsubV = onSnapshot(vQuery, (snap) => {
      setFlashcards(snap.docs.map(d => ({ id: d.id, ...d.data() } as Flashcard)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'flashcards'));

    const unsubG = onSnapshot(gQuery, (snap) => {
      setGrammarBlogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as GrammarBlog)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'grammarBlogs'));

    const chalQuery = doc(db, 'speakingChallenges', user.uid);
    const unsubChal = onSnapshot(chalQuery, (snap) => {
      if (snap.exists()) setChallengeProgress(snap.data() as SpeakingChallengeProgress);
    });

    return () => { unsubV(); unsubG(); unsubChal(); };
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === 'login') {
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
          // Special handling for admin account: auto-create if it doesn't exist
          if (email === ADMIN_EMAIL && password === 'admin12345' && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
            await createUserWithEmailAndPassword(auth, email, password);
            toast.success('Đã khởi tạo tài khoản Admin hệ thống!');
          } else {
            throw err;
          }
        }
        toast.success('Đăng nhập thành công!');
      } else if (authMode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const newProfile: UserProfile = {
          uid: cred.user.uid,
          name,
          email,
          role: (email === ADMIN_EMAIL || email === OWNER_EMAIL) ? 'admin' : 'user',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', cred.user.uid), newProfile);
        toast.success('Đăng ký thành công!');
      } else {
        // Custom Forgot Password Flow
        if (forgotStep === 'request') {
          const res = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Lỗi gửi yêu cầu');
          
          if (data.dev) {
            toast.info(`[Dev Mode] Mã OTP của bạn là: ${data.otp}`);
          }
          toast.success('Đã gửi mã xác thực tới email của bạn!');
          setForgotStep('verify');
        } else if (forgotStep === 'verify') {
          const res = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Mã xác thực không chính xác');
          
          toast.success('Xác thực thành công!');
          setForgotStep('reset');
        } else if (forgotStep === 'reset') {
          if (password !== confirmPassword) throw new Error('Mật khẩu không khớp');
          if (password.length < 6) throw new Error('Mật khẩu phải có ít nhất 6 ký tự');

          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, newPassword: password })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Lỗi đặt lại mật khẩu');

          toast.success('Đổi mật khẩu thành công! Hãy đăng nhập lại.');
          setAuthMode('login');
          setForgotStep('request');
          setOtp('');
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputSubmit = async () => {
    if (!inputText.trim() && !selectedFile) return;
    setIsAnalyzing(true);
    try {
      let result;
      if (selectedFile) {
        const mimeType = selectedFile.type;
        
        if (mimeType.includes('image') || mimeType === 'application/pdf') {
          const base64 = await fileToBase64(selectedFile);
          result = await analyzeDocument({ data: base64, mimeType }, user.uid);
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
          // Word file
          const arrayBuffer = await selectedFile.arrayBuffer();
          const wordResult = await mammoth.extractRawText({ arrayBuffer });
          result = await analyzeDocument(wordResult.value, user.uid);
        } else {
          throw new Error("Định dạng file không được hỗ trợ. Vui lòng chọn ảnh, PDF hoặc Word.");
        }
      } else {
        result = await analyzeInput(inputText, user.uid);
      }

      if (!result || !result.data) {
        throw new Error("AI không thể phân tích nội dung này. Vui lòng thử lại với nội dung rõ ràng hơn.");
      }
      
      if (result.type === 'vocabulary') {
        const cards = result.data as Flashcard[];
        if (cards.length === 0) throw new Error("Không tìm thấy từ vựng nào.");
        for (const card of cards) {
          await addDoc(collection(db, 'flashcards'), card);
        }
        toast.success(`Thành công! Đã thêm ${cards.length} thẻ từ vựng.`);
        setActiveTab('vocabulary');
      } else {
        const blog = result.data as GrammarBlog;
        await addDoc(collection(db, 'grammarBlogs'), blog);
        toast.success('Thành công! Đã tạo bài học ngữ pháp mới.');
        setActiveTab('grammar');
      }
      setInputText('');
      setSelectedFile(null);
      setFilePreview(null);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Lỗi phân tích nội dung. Vui lòng thử lại.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Kích thước file không được vượt quá 10MB");
        return;
      }
      setSelectedFile(file);
      if (file.type.includes('image')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
      setInputText(''); // Clear text if file is selected
    }
  };

  const deleteItem = async (type: 'vocabulary' | 'grammar', id: string) => {
    try {
      await deleteDoc(doc(db, type === 'vocabulary' ? 'flashcards' : 'grammarBlogs', id));
      toast.success('Đã xóa!');
      if (selectedBlog?.id === id) setSelectedBlog(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, id);
    }
  };

  const startChat = async () => {
    if (flashcards.length === 0) {
      toast.error("Vui lòng học ít nhất một từ vựng để bắt đầu hội thoại.");
      return;
    }
    setIsChatLoading(true);
    setChatMessages([]);
    setChatSuggestion(null);
    try {
      const vocab = flashcards.slice(0, 10).map(f => f.word);
      const initialMessage = "Hello! I'm EngMaster AI. Let's practice English using the words you've learned. How are you doing today?";
      const initialChat: ChatMessage[] = [{ role: 'model', text: initialMessage }];
      setChatMessages(initialChat);
      speak(initialMessage);
      resetSuggestionTimer(initialChat);
    } catch (e) {
      toast.error("Không thể khởi động hội thoại.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const resetSuggestionTimer = (history: ChatMessage[]) => {
    if (suggestionTimeout) clearTimeout(suggestionTimeout);
    setChatSuggestion(null);
    
    // Only set timer if it's the user's turn
    const lastMessage = history[history.length - 1];
    if (lastMessage.role === 'model') {
      const timeout = setTimeout(async () => {
        const vocab = flashcards.slice(0, 10).map(f => f.word);
        const suggestion = await getChatSuggestion(history, vocab);
        setChatSuggestion(suggestion);
      }, 60000); // Wait 60s for silence before suggesting
      setSuggestionTimeout(timeout);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isChatLoading) return;
    
    // Stop listening if sending message
    if (isListening) stopListening();

    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', text }];
    setChatMessages(newMessages);
    setChatInput('');
    setChatSuggestion(null);
    if (suggestionTimeout) clearTimeout(suggestionTimeout);
    
    // Turn limit check (6-12 turns total)
    if (newMessages.length >= 24) {
      toast.info("Buổi hội thoại kết thúc. Hẹn gặp lại bạn vào ngày mai!");
      return;
    }

    setIsChatLoading(true);
    try {
      const vocab = flashcards.slice(0, 10).map(f => f.word);
      const aiResponse = await getChatResponse(newMessages, vocab);
      const updatedMessages: ChatMessage[] = [...newMessages, { role: 'model', text: aiResponse }];
      setChatMessages(updatedMessages);
      speak(aiResponse);
      resetSuggestionTimer(updatedMessages);
    } catch (e) {
      toast.error("Lỗi hội thoại.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const startListening = (onFinal?: (text: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    try {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      accumulatedTranscriptRef.current = "";
      latestLiveTranscriptRef.current = "";
      setChatInput("");
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      const resetSilenceTimer = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          const final = latestLiveTranscriptRef.current.trim();
          if (final) {
            stopListening();
            if (onFinal) {
              onFinal(final);
            } else {
              handleSendMessage(final);
            }
          } else {
            stopListening();
          }
        }, 20000); // 20s of absolute silence
      };

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        resetSilenceTimer();
        toast.info("Đang nghe... AI sẽ chờ 60s nếu bạn im lặng mới phản hồi.");
      };

      recognitionRef.current.onresult = (event: any) => {
        // RESET TIMER ON EVERY SINGLE EVENT (Even interim noise/speech)
        resetSilenceTimer(); 

        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          accumulatedTranscriptRef.current += " " + finalTranscript;
        }

        // Show live preview of what's being said
        const currentLiveText = (accumulatedTranscriptRef.current + " " + interimTranscript).trim();
        latestLiveTranscriptRef.current = currentLiveText;
        setChatInput(currentLiveText);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error !== 'no-speech') { // Ignore frequent no-speech errors in continuous mode
          setIsListening(false);
          if (event.error === 'not-allowed') {
            toast.error("Vui lòng cấp quyền truy cập microphone.");
          } else {
            toast.error(`Lỗi nhận diện: ${event.error}`);
          }
        }
      };

      recognitionRef.current.onend = () => {
        // If we are still supposed to be listening (not stopped via stopListening)
        // restart the recognition to ensure it doesn't just stop
        if (isListening) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error("Failed to restart recognition", e);
          }
        }
      };

      recognitionRef.current.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setIsListening(false);
  };

  useEffect(() => {
    if (activeTab === 'chat' && chatMessages.length === 0) {
      startChat();
    }
    return () => {
      if (suggestionTimeout) clearTimeout(suggestionTimeout);
      if (recognitionRef.current) recognitionRef.current.stop();
    }
  }, [activeTab]);

  const startChallenge = async () => {
    if (!user) return;
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 33); // 33 days window
    
    const newProgress: SpeakingChallengeProgress = {
      userId: user.uid,
      startDate: start.toISOString(),
      targetEndDate: end.toISOString(),
      completedDays: [],
      lastCompletedDay: 0,
      attempts: []
    };
    
    try {
      await setDoc(doc(db, 'speakingChallenges', user.uid), newProgress);
      setChallengeProgress(newProgress);
      setChallengeStep('dashboard');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'speakingChallenges');
    }
  };

  const handleCompleteDay = async () => {
    if (!challengeProgress || !selectedChallengeDay) return;
    
    const dayNum = selectedChallengeDay.day;
    if (challengeProgress.completedDays.includes(dayNum)) {
      setChallengeStep('dashboard');
      return;
    }

    const updatedProgress = {
      ...challengeProgress,
      completedDays: [...challengeProgress.completedDays, dayNum].sort((a, b) => a - b),
      lastCompletedDay: Math.max(challengeProgress.lastCompletedDay, dayNum),
      attempts: [
        ...challengeProgress.attempts,
        {
          day: dayNum,
          completedAt: new Date().toISOString(),
          transcripts: currentTranscript,
          aiFeedbacks: currentFeedbacks.map(f => JSON.stringify(f))
        }
      ]
    };

    try {
      await setDoc(doc(db, 'speakingChallenges', user.uid), updatedProgress);
      toast.success(`Chúc mừng! Bạn đã hoàn thành ngày thứ ${dayNum}. Tiến bộ thêm 1 chút rồi đấy!`);
      setChallengeStep('summary');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'speakingChallenges');
    }
  };

  const handleChallengeSpeakResult = async (transcript: string) => {
    if (!selectedChallengeDay) return;
    setCurrentQuestionTranscript(transcript);
    // Instead of auto-submitting, we let the user review it.
  };

  const submitChallengeAnswer = async () => {
    if (!selectedChallengeDay || !currentQuestionTranscript) return;
    setIsChallengeLoading(true);
    try {
      const question = selectedChallengeDay.questions[currentQuestionIndex].question;
      const result = await evaluateChallengeAnswer(
        selectedChallengeDay.title,
        question,
        currentQuestionTranscript,
        selectedChallengeDay.keywords
      );
      
      setCurrentQuestionFeedback(result);
    } catch (e) {
      toast.error("Lỗi phân tích hội thoại.");
    } finally {
      setIsChallengeLoading(false);
    }
  };

  const proceedToNextQuestion = async () => {
    if (!selectedChallengeDay || !currentQuestionFeedback || !currentQuestionTranscript) return;

    const newTranscripts = [...currentTranscript, currentQuestionTranscript];
    const newFeedbacks = [...currentFeedbacks, currentQuestionFeedback];
    
    setCurrentTranscript(newTranscripts);
    setCurrentFeedbacks(newFeedbacks);
    setCurrentQuestionTranscript(null);
    setCurrentQuestionFeedback(null);

    if (currentQuestionIndex < selectedChallengeDay.questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      // Auto speak next question
      setTimeout(() => speak(selectedChallengeDay.questions[nextIndex].question), 500);
    } else {
      // Complete day
      // Note: we need to use the functional update or local vars because state hasn't updated yet
      await finishDay(newTranscripts, newFeedbacks);
    }
  };

  const finishDay = async (transcripts: string[], feedbacks: any[]) => {
    if (!challengeProgress || !selectedChallengeDay) return;
    
    const dayNum = selectedChallengeDay.day;
    const updatedProgress = {
      ...challengeProgress,
      completedDays: Array.from(new Set([...challengeProgress.completedDays, dayNum])).sort((a, b) => a - b),
      lastCompletedDay: Math.max(challengeProgress.lastCompletedDay, dayNum),
      attempts: [
        ...challengeProgress.attempts,
        {
          day: dayNum,
          completedAt: new Date().toISOString(),
          transcripts,
          aiFeedbacks: feedbacks.map(f => JSON.stringify(f))
        }
      ]
    };

    try {
      await setDoc(doc(db, 'speakingChallenges', user!.uid), updatedProgress);
      setChallengeSessionDate(new Date().toISOString());
      toast.success(`Chúc mừng! Bạn đã hoàn thành ngày thứ ${dayNum}.`);
      setChallengeStep('summary');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'speakingChallenges');
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
        <Toaster position="top-center" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
              <Brain className="w-10 h-10 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">EngMaster AI</h1>
            <p className="text-gray-500 text-center">Học tiếng Anh thông minh hơn với AI</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <Input label="Họ tên" value={name} onChange={setName} placeholder="Nguyễn Văn A" required />
            )}
            
            {authMode === 'forgot' ? (
              <div className="space-y-4">
                {forgotStep === 'request' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">Nhập email để nhận mã xác thực (OTP) gồm 4 chữ số.</p>
                    <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="email@example.com" required />
                  </div>
                )}
                
                {forgotStep === 'verify' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">Mã xác thực đã được gửi tới <b>{email}</b>. Vui lòng nhập mã bên dưới.</p>
                    <div className="flex flex-col gap-1.5 w-full">
                      <label className="text-sm font-semibold text-gray-700">Mã OTP (4 số)</label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="0000"
                        className="px-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-center text-3xl font-black tracking-[1em] transition-all"
                        required
                      />
                    </div>
                  </div>
                )}

                {forgotStep === 'reset' && (
                  <div className="space-y-4">
                    <p className="text-sm text-green-600 font-medium">Xác thực thành công! Hãy tạo mật khẩu mới cho tài khoản của bạn.</p>
                    <Input label="Mật khẩu mới" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />
                    <Input label="Xác nhận mật khẩu" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" required />
                  </div>
                )}
              </div>
            ) : (
              <>
                <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="email@example.com" required />
                <Input label="Mật khẩu" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />
              </>
            )}
            
            <Button className="w-full h-12" loading={loading}>
              {authMode === 'login' ? 'Đăng nhập' : 
               authMode === 'register' ? 'Đăng ký' : 
               forgotStep === 'request' ? 'Gửi mã xác thực' : 
               forgotStep === 'verify' ? 'Tiếp tục' : 'Đặt lại mật khẩu'}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-center">
            {authMode === 'login' ? (
              <>
                <button onClick={() => setAuthMode('register')} className="text-sm text-indigo-600 hover:underline">Chưa có tài khoản? Đăng ký</button>
                <button onClick={() => { setAuthMode('forgot'); setForgotStep('request'); }} className="text-sm text-gray-500 hover:underline">Quên mật khẩu?</button>
              </>
            ) : (
              <button onClick={() => { setAuthMode('login'); setForgotStep('request'); }} className="text-sm text-indigo-600 hover:underline font-medium">Quay lại đăng nhập</button>
            )}
          </div>


        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900 hidden sm:block">EngMaster AI</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full">
              <UserIcon className="w-4 h-4" />
              <span>{profile?.name}</span>
              {profile?.role === 'admin' && <span className="text-[10px] bg-indigo-600 text-white px-1.5 rounded uppercase">Admin</span>}
            </div>
            <button onClick={() => signOut(auth)} className="p-2 text-gray-500 hover:text-red-600 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar Navigation */}
        <nav className="lg:col-span-3 flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
          <button 
            onClick={() => setActiveTab('input')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'input' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            <Plus className="w-5 h-5" />
            Nhập liệu mới
          </button>
          <button 
            onClick={() => setActiveTab('vocabulary')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'vocabulary' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            <BookOpen className="w-5 h-5" />
            Từ vựng ({flashcards.length})
          </button>
          <button 
            onClick={() => setActiveTab('grammar')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'grammar' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            <FileText className="w-5 h-5" />
            Ngữ pháp ({grammarBlogs.length})
          </button>
          <button 
            onClick={() => setActiveTab('challenge')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'challenge' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            <Trophy className="w-5 h-5" />
            Thử thách 30 ngày
          </button>
          <button 
            onClick={() => setActiveTab('shadowing')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'shadowing' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            <Headphones className="w-5 h-5" />
            Shadowing Pro
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            <MessageCircle className="w-5 h-5" />
            Hội thoại AI
          </button>
        </nav>

        {/* Content Area */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            {activeTab === 'input' && (
              <motion.div 
                key="input"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-bold text-gray-900">Nhập liệu nội dung học tập</h2>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Dán danh sách từ vựng, nội dung ngữ pháp hoặc tải lên hình ảnh, file PDF/Word chứa kiến thức. AI sẽ tự động phân loại, tìm kiếm thêm thông tin và xử lý cho bạn.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Nhập văn bản
                    </label>
                    <textarea
                      value={inputText}
                      onChange={(e) => {
                        setInputText(e.target.value);
                        if (e.target.value) {
                          setSelectedFile(null);
                          setFilePreview(null);
                        }
                      }}
                      placeholder="Ví dụ: 1. Civilian / 28 : [ n, adj ] / sə'vɪliən / = A person who is not a member of the armed forces..."
                      className="w-full h-48 p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none font-mono text-sm"
                      maxLength={5000}
                      disabled={!!selectedFile}
                    />
                    <div className="flex justify-end">
                      <span className="text-[10px] text-gray-400">{inputText.length}/5000 từ</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" /> Tải lên tài liệu/hình ảnh
                    </label>
                    <div 
                      className={`relative h-48 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 ${selectedFile ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 bg-gray-50'}`}
                    >
                      {selectedFile ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center">
                          {filePreview ? (
                            <img src={filePreview} alt="Preview" className="w-full h-32 object-contain rounded-lg mb-2" />
                          ) : (
                            <FileIcon className="w-16 h-16 text-indigo-400 mb-2" />
                          )}
                          <p className="text-xs font-medium text-indigo-900 truncate max-w-full px-4">{selectedFile.name}</p>
                          <p className="text-[10px] text-indigo-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          <button 
                            onClick={() => {
                              setSelectedFile(null);
                              setFilePreview(null);
                            }}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <p className="text-xs text-gray-500 text-center">Kéo thả hoặc click để chọn file</p>
                          <p className="text-[10px] text-gray-400 mt-1">Ảnh, PDF, Word (Tối đa 10MB)</p>
                          <input 
                            type="file" 
                            accept="image/*,.pdf,.doc,.docx" 
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 italic">* AI sẽ quét văn bản trong file và tìm kiếm thông tin bổ sung trên Google.</p>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button 
                    onClick={handleInputSubmit} 
                    loading={isAnalyzing} 
                    disabled={(!inputText.trim() && !selectedFile) || isAnalyzing}
                    className="w-full md:w-auto md:px-12 py-3 text-lg"
                  >
                    {isAnalyzing ? 'Đang phân tích & tìm kiếm...' : 'Bắt đầu phân tích với AI'}
                  </Button>
                </div>
              </motion.div>
            )}

            {activeTab === 'vocabulary' && (
              <motion.div 
                key="vocabulary"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {flashcards.length > 0 ? (
                  <>
                    {/* Learning Mode */}
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-indigo-50 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
                        <motion.div 
                          className="h-full bg-indigo-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center mb-8">
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Flashcard {currentCardIndex + 1} / {flashcards.length}</span>
                        <button onClick={() => deleteItem('vocabulary', flashcards[currentCardIndex].id!)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="perspective-1000 h-64 w-full cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
                        <motion.div 
                          className="relative w-full h-full transition-all duration-500 preserve-3d"
                          animate={{ rotateY: isFlipped ? 180 : 0 }}
                        >
                          {/* Front */}
                          <div className="absolute inset-0 backface-hidden bg-indigo-50 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-4xl font-bold text-indigo-900">{flashcards[currentCardIndex].word}</h3>
                              <SpeakButton 
                                text={flashcards[currentCardIndex].word}
                                className="p-2 shadow-sm rounded-full bg-white text-indigo-600"
                              />
                            </div>
                            <p className="text-indigo-500 font-mono">{flashcards[currentCardIndex].phonetic}</p>
                            <p className="mt-4 text-xs text-indigo-400 font-medium uppercase tracking-widest">Click để xem nghĩa</p>
                          </div>
                          {/* Back */}
                          <div className="absolute inset-0 backface-hidden bg-white border-2 border-indigo-100 rounded-2xl flex flex-col items-center justify-center p-6 text-center rotate-y-180">
                            <p className="text-2xl font-bold text-gray-900 mb-4">{flashcards[currentCardIndex].meaning}</p>
                            {flashcards[currentCardIndex].wordFamily && (
                              <div className="mb-4">
                                <span className="text-xs font-bold text-gray-400 uppercase">Họ hàng từ:</span>
                                <p className="text-sm text-gray-600">{flashcards[currentCardIndex].wordFamily}</p>
                              </div>
                            )}
                            <div className="italic text-sm text-gray-500 max-w-md">
                              "{flashcards[currentCardIndex].example}"
                            </div>
                          </div>
                        </motion.div>
                      </div>

                      <div className="flex justify-center gap-4 mt-8">
                        <Button variant="secondary" onClick={() => { setCurrentCardIndex(prev => Math.max(0, prev - 1)); setIsFlipped(false); }} disabled={currentCardIndex === 0}>
                          <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button variant="secondary" onClick={() => { setIsFlipped(false); setCurrentCardIndex(0); }}>
                          <RotateCcw className="w-5 h-5" />
                        </Button>
                        <Button variant="secondary" onClick={() => { setCurrentCardIndex(prev => Math.min(flashcards.length - 1, prev + 1)); setIsFlipped(false); }} disabled={currentCardIndex === flashcards.length - 1}>
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    {/* List View */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {flashcards.map((card) => (
                        <div key={card.id} className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all group">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <div>
                                <h4 className="font-bold text-gray-900">{card.word}</h4>
                                <p className="text-xs text-gray-500 font-mono">{card.phonetic}</p>
                              </div>
                              <SpeakButton 
                                text={card.word}
                                className="bg-transparent text-indigo-400 p-1.5"
                              />
                            </div>
                            <button onClick={() => deleteItem('vocabulary', card.id!)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="mt-2 text-sm text-gray-700 line-clamp-2">{card.meaning}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Chưa có từ vựng nào. Hãy nhập liệu để bắt đầu!</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px] overflow-hidden"
              >
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-100 bg-indigo-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                      <Brain className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">EngMaster AI Chat</h3>
                      <p className="text-[10px] text-indigo-600 font-medium">Đang luyện tập cùng từ vựng của bạn</p>
                    </div>
                  </div>
                  <button onClick={startChat} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                  {chatMessages.map((msg, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        {msg.role === 'model' && (
                          <SpeakButton 
                            text={msg.text}
                            label="Nghe lại"
                            className="mt-1 bg-transparent text-[10px] opacity-60 hover:opacity-100 p-0 text-gray-500"
                          />
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100">
                        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                      </div>
                    </div>
                  )}
                  {chatSuggestion && !isChatLoading && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center gap-2 py-4"
                    >
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Gợi ý từ AI:</p>
                      <button 
                        onClick={() => handleSendMessage(chatSuggestion)}
                        className="bg-white border-2 border-dashed border-indigo-200 text-indigo-600 px-4 py-2 rounded-xl text-xs hover:border-indigo-400 hover:bg-indigo-50 transition-all italic"
                      >
                        "{chatSuggestion}"
                      </button>
                    </motion.div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-gray-100 bg-white">
                  <div className="flex gap-2">
                    <button 
                      onClick={isListening ? () => {
                        const text = accumulatedTranscriptRef.current.trim();
                        stopListening();
                        if (text) handleSendMessage(text);
                      } : () => startListening()}
                      className={`p-2 rounded-xl transition-all shadow-md ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-indigo-600 hover:bg-gray-200'}`}
                      disabled={isChatLoading}
                      title={isListening ? "Dừng nghe" : "Nói bằng tiếng Anh"}
                    >
                      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <input 
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(chatInput)}
                      placeholder="Nhập hoặc nhấn mic để nói..."
                      className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      disabled={isChatLoading}
                    />
                    <button 
                      onClick={() => handleSendMessage(chatInput)}
                      disabled={!chatInput.trim() || isChatLoading}
                      className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-gray-400 text-center">
                    Bạn đã thực hiện {Math.floor(chatMessages.length / 2)} / 12 lượt hội thoại hôm nay.
                  </p>
                </div>
              </motion.div>
            )}
            {activeTab === 'grammar' && (
              <motion.div 
                key="grammar"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {/* Blog List */}
                <div className="md:col-span-1 space-y-4">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Chủ đề ngữ pháp</h2>
                  {grammarBlogs.length > 0 ? (
                    grammarBlogs.map((blog) => (
                      <button 
                        key={blog.id}
                        onClick={() => setSelectedBlog(blog)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${selectedBlog?.id === blog.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-gray-100 hover:border-indigo-100'}`}
                      >
                        <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{blog.title}</h3>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase font-bold">{blog.category || 'Ngữ pháp'}</span>
                          <span className="text-[10px] text-gray-400">{new Date(blog.createdAt).toLocaleDateString()}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-10">Chưa có bài học ngữ pháp nào.</p>
                  )}
                </div>

                {/* Blog Content */}
                <div className="md:col-span-2">
                  {selectedBlog ? (
                    <motion.div 
                      key={selectedBlog.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-[500px]"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedBlog.title}</h1>
                          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{selectedBlog.category}</span>
                        </div>
                        <button onClick={() => deleteItem('grammar', selectedBlog.id!)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="prose prose-indigo max-w-none">
                        <TiptapViewer content={selectedBlog.content} />
                      </div>
                    </motion.div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center h-full p-10 text-center">
                      <FileText className="w-12 h-12 text-gray-200 mb-4" />
                      <p className="text-gray-400">Chọn một chủ đề để bắt đầu học</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'challenge' && (
              <motion.div 
                key="challenge"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {!challengeProgress ? (
                  <div className="bg-white rounded-3xl p-8 shadow-xl border border-indigo-50 text-center max-w-2xl mx-auto">
                    <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-6 drop-shadow-lg" />
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Thử thách 30 ngày luyện nói IELTS</h2>
                    <p className="text-gray-600 mb-8 italic">"Muốn nói hay thì phải nói nhiều. Muốn nói chuẩn thì phải có người nghe. AI sẽ là người bạn đồng hành 24/7 của bạn!"</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 text-left">
                      <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                        <Target className="w-6 h-6 text-green-600 mb-2" />
                        <h4 className="font-bold text-sm">30 Chủ đề</h4>
                        <p className="text-xs text-gray-500">Từ cơ bản đến nâng cao theo chuẩn IELTS.</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                        <Brain className="w-6 h-6 text-blue-600 mb-2" />
                        <h4 className="font-bold text-sm">AI Chấm điểm</h4>
                        <p className="text-xs text-gray-500">Sửa lỗi ngữ pháp & gợi ý câu trả lời tốt hơn.</p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                        <Award className="w-6 h-6 text-purple-600 mb-2" />
                        <h4 className="font-bold text-sm">Sự kỷ luật</h4>
                        <p className="text-xs text-gray-500">Chỉ được nghỉ 3 ngày trong 33 ngày tới.</p>
                      </div>
                    </div>

                    <div className="bg-indigo-50 p-6 rounded-2xl mb-8">
                       <p className="text-sm font-medium text-indigo-900 mb-2">Bạn sẽ nhận được gì sau 30 ngày?</p>
                       <ul className="text-xs text-indigo-700 space-y-2">
                         <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3" /> Tự tin trả lời mọi câu hỏi Speaking Part 1, 2.</li>
                         <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3" /> Vốn từ vựng tăng thêm 150+ keywords "xịn".</li>
                         <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3" /> Tốc độ phản xạ hội thoại nhanh hơn 200%.</li>
                       </ul>
                    </div>

                    <Button onClick={startChallenge} className="w-full md:w-auto md:px-12 py-4 text-lg">Bắt đầu hành trình ngay!</Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Progress Header */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-100 rounded-xl">
                          <Trophy className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">Tiến độ của bạn</h3>
                          <p className="text-xs text-gray-400">Hoàn thành {challengeProgress.completedDays.length} / 30 ngày</p>
                        </div>
                      </div>
                      <div className="flex-1 max-w-md w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-green-500 transition-all duration-500" 
                          style={{ width: `${(challengeProgress.completedDays.length / 30) * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                         <Calendar className="w-4 h-4" />
                         Dự kiến kết thúc: {new Date(challengeProgress.targetEndDate).toLocaleDateString()}
                      </div>
                    </div>

                    {challengeStep === 'dashboard' && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
                        {speakingChallengeData.map((item) => {
                          const isCompleted = challengeProgress.completedDays.includes(item.day);
                          const isLocked = item.day > challengeProgress.lastCompletedDay + 1;
                          
                          return (
                            <button 
                              key={item.day}
                              disabled={isLocked}
                              onClick={() => {
                                setSelectedChallengeDay(item);
                                if (isCompleted) {
                                  // Find the latest attempt for this day
                                  const attempts = challengeProgress.attempts.filter(a => a.day === item.day);
                                  const latestAttempt = attempts[attempts.length - 1];
                                  if (latestAttempt) {
                                    setCurrentTranscript(latestAttempt.transcripts || []);
                                    setCurrentFeedbacks((latestAttempt.aiFeedbacks || []).map(f => typeof f === 'string' ? JSON.parse(f) : f));
                                    setChallengeSessionDate(latestAttempt.completedAt);
                                    setChallengeStep('summary');
                                  } else {
                                    // Fallback if no attempt record found (shouldn't happen if isCompleted)
                                    setChallengeStep('learning');
                                  }
                                } else {
                                  setChallengeStep('learning');
                                  setCurrentQuestionIndex(0);
                                  setCurrentTranscript([]);
                                  setCurrentFeedbacks([]);
                                }
                              }}
                              className={`relative p-6 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 group ${isCompleted ? 'bg-green-50 border-green-200' : isLocked ? 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed' : 'bg-white border-indigo-100 hover:border-indigo-400 hover:shadow-lg'}`}
                            >
                              {isCompleted && <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-green-600" />}
                              {isLocked && <Lock className="absolute top-2 right-2 w-4 h-4 text-gray-300" />}
                              <span className={`text-xl font-bold ${isCompleted ? 'text-green-600' : 'text-gray-900 group-hover:text-indigo-600'}`}>NGÀY {item.day}</span>
                              <p className="text-[10px] text-gray-500 font-medium text-center line-clamp-1">{item.title}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {(challengeStep === 'learning' || challengeStep === 'practice' || challengeStep === 'summary') && selectedChallengeDay && (
                      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        {/* Day Header */}
                        <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                          <button onClick={() => setChallengeStep('dashboard')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                          </button>
                          <div className="text-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Day {selectedChallengeDay.day}</span>
                            <h2 className="text-xl font-bold">{selectedChallengeDay.title}</h2>
                          </div>
                          <div className="w-10 h-10" /> {/* Spacer */}
                        </div>

                        {/* Step Content */}
                        <div className="p-8">
                          {challengeStep === 'learning' && (
                            <div className="space-y-8 max-w-3xl mx-auto">
                              <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                  <BookOpen className="w-5 h-5 text-indigo-600" /> Bước 1: Làm chủ Keywords
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {selectedChallengeDay.keywords.map((k, idx) => (
                                    <div key={idx} className="p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-indigo-200 transition-colors">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="font-bold text-indigo-600">{k.word}</p>
                                        <span className="text-[10px] text-gray-400">({k.meaning})</span>
                                        <button onClick={() => speak(k.word)} className="ml-auto p-1.5 hover:bg-white rounded-full"><Volume2 className="w-3 h-3" /></button>
                                      </div>
                                      <p className="text-xs text-gray-500 italic">"{k.example}"</p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                  <Target className="w-5 h-5 text-indigo-600" /> Bước 2: Chuẩn bị ý tưởng
                                </h3>
                                <div className="space-y-4">
                                  {selectedChallengeDay.questions.map((q, idx) => (
                                    <div key={idx} className="p-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30">
                                      <p className="text-sm font-bold text-gray-800 mb-2">Câu {idx + 1}: {q.question}</p>
                                      <div className="flex items-start gap-2 mb-2">
                                        <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-bold">Lược đồ</span>
                                        <p className="text-xs text-indigo-600 font-medium">{q.description}</p>
                                      </div>
                                      <div className="flex flex-wrap gap-2 pt-2">
                                        {q.starters.map((s, i) => (
                                          <span key={i} className="text-[10px] bg-white border border-indigo-100 text-gray-400 px-2 py-1 rounded italic">{s}</span>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <Button onClick={() => {
                                setChallengeStep('practice');
                                // Auto speak when starting practice
                                if (selectedChallengeDay) {
                                  setTimeout(() => speak(selectedChallengeDay.questions[0].question), 500);
                                }
                              }} className="w-full py-4 text-lg">Bắt đầu Luyện nói ngay!</Button>
                            </div>
                          )}

                          {challengeStep === 'practice' && (
                            <div className="max-w-2xl mx-auto flex flex-col min-h-[500px] p-4 md:p-8">
                              {/* Progress bar inside session */}
                              <div className="flex gap-2 mb-8">
                                {selectedChallengeDay.questions.map((_, idx) => (
                                  <div key={idx} className={`h-2 flex-1 rounded-full transition-all duration-500 ${idx < currentQuestionIndex ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : idx === currentQuestionIndex ? 'bg-indigo-600 animate-pulse' : 'bg-gray-100'}`} />
                                ))}
                              </div>

                              <div className="flex-1 flex flex-col items-center justify-start text-center space-y-8">
                                <AnimatePresence mode="wait">
                                  {!currentQuestionFeedback ? (
                                    <motion.div 
                                      key="asking"
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -10 }}
                                      className="space-y-6 w-full"
                                    >
                                      <div className="space-y-4">
                                        <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 mb-2 rotate-3 hover:rotate-0 transition-transform">
                                          <Brain className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight leading-tight">{selectedChallengeDay.questions[currentQuestionIndex].question}</h3>
                                        <button 
                                          onClick={() => speak(selectedChallengeDay.questions[currentQuestionIndex].question)} 
                                          className="inline-flex items-center gap-2 text-indigo-600 text-sm font-bold mx-auto hover:text-indigo-700 bg-indigo-50 px-5 py-2.5 rounded-full transition-all border border-indigo-100 hover:shadow-md active:scale-95"
                                        >
                                          <Volume2 className="w-4 h-4" /> REPLAY QUESTION
                                        </button>
                                      </div>

                                      <div className="w-full bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                        <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Gợi ý cách trả lời</p>
                                        <p className="text-sm text-indigo-600 italic font-medium leading-relaxed">"{selectedChallengeDay.questions[currentQuestionIndex].description}"</p>
                                      </div>

                                      <div className="space-y-4 w-full">
                                        <div className="flex justify-center gap-6 items-center">
                                          <button 
                                            onClick={isListening ? () => {
                                              stopListening();
                                            } : () => {
                                              setChatInput(""); 
                                              startListening(handleChallengeSpeakResult);
                                            }}
                                            className={`w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all shadow-xl hover:shadow-2xl active:scale-90 ${isListening ? 'bg-red-500 text-white animate-pulse scale-110' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                            disabled={isChallengeLoading}
                                          >
                                            {isListening ? <MicOff className="w-10 h-10 mb-1" /> : <Mic className="w-10 h-10 mb-1" />}
                                            <span className="text-[11px] uppercase font-black tracking-tighter">{isListening ? 'STOP' : 'SPEAK'}</span>
                                          </button>
                                        </div>
                                        
                                        <div className="min-h-[100px] flex items-center justify-center">
                                          {isListening ? (
                                            <div className="bg-white p-6 rounded-3xl border-2 border-indigo-500 shadow-2xl relative overflow-hidden w-full max-w-lg">
                                              <div className="absolute inset-0 bg-indigo-500/5 animate-pulse" />
                                              <p className="text-xl font-bold text-gray-900 leading-relaxed italic z-10">"{chatInput || 'Listening...'}"</p>
                                            </div>
                                          ) : (
                                            <p className="text-sm font-medium text-gray-400">
                                              {isChallengeLoading ? 'AI đang phân tích...' : 'Bấm nút to để bắt đầu trả lời'}
                                            </p>
                                          )}
                                        </div>

                                        {currentQuestionTranscript && !isListening && !isChallengeLoading && (
                                          <div className="space-y-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="bg-green-50 p-6 rounded-3xl border-2 border-green-200 shadow-sm text-left">
                                               <div className="flex justify-between items-center mb-3">
                                                  <span className="text-[10px] bg-green-200 text-green-700 px-2 py-0.5 rounded-full font-black uppercase">Captured Transcript</span>
                                                  <button onClick={() => { setCurrentQuestionTranscript(null); setChatInput(""); }} className="text-xs text-green-600 font-bold hover:underline">Speak Again</button>
                                               </div>
                                               <textarea 
                                                 value={currentQuestionTranscript}
                                                 onChange={(e) => setCurrentQuestionTranscript(e.target.value)}
                                                 className="w-full bg-transparent border-none focus:ring-0 text-lg font-bold text-gray-800 resize-none min-h-[80px]"
                                               />
                                            </div>
                                            <Button 
                                              onClick={submitChallengeAnswer} 
                                              className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-xl group"
                                            >
                                              <Brain className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" /> Phân tích giọng nói của tôi
                                            </Button>
                                          </div>
                                        )}

                                        {isChallengeLoading && (
                                          <div className="space-y-6 w-full py-12 flex flex-col items-center">
                                            <div className="relative w-20 h-20">
                                              <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                                              <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
                                            </div>
                                            <div className="space-y-2">
                                              <p className="text-lg font-bold text-gray-900">AI đang "nghe" lại và phân tích...</p>
                                              <p className="text-sm text-gray-500 font-medium">Đang kiểm tra ngữ pháp, vốn từ và nhịp điệu.</p>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  ) : (
                                    <motion.div 
                                      key="feedback"
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="space-y-6 w-full text-left animate-in zoom-in-95 duration-500"
                                    >
                                      <div className="bg-white border-2 border-indigo-100 rounded-3xl overflow-hidden shadow-xl">
                                        <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                                          <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Expert Analysis</span>
                                          <div className="flex items-center gap-1">
                                             <Trophy className="w-4 h-4 text-amber-500" />
                                             <span className="text-2xl font-black text-indigo-600">{currentQuestionFeedback.score}</span>
                                             <span className="text-xs font-bold text-gray-400">/10</span>
                                          </div>
                                        </div>
                                        <div className="p-6 space-y-6">
                                          <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                                              <p className="text-[10px] font-black text-blue-500 uppercase mb-1">Ngữ pháp</p>
                                              <p className="text-sm font-bold text-blue-800">
                                                {typeof currentQuestionFeedback.feedback === 'object' 
                                                  ? currentQuestionFeedback.feedback.grammar?.score ?? 0 
                                                  : currentQuestionFeedback.score ?? 0}/10
                                              </p>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100">
                                              <p className="text-[10px] font-black text-purple-500 uppercase mb-1">Từ vựng</p>
                                              <p className="text-sm font-bold text-purple-800">
                                                {typeof currentQuestionFeedback.feedback === 'object' 
                                                  ? currentQuestionFeedback.feedback.vocabulary?.score ?? 0 
                                                  : currentQuestionFeedback.score ?? 0}/10
                                              </p>
                                            </div>
                                          </div>
                                          
                                          <div className="space-y-4">
                                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                               <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Bạn vừa nói:</p>
                                               <p className="text-sm text-gray-700 italic">"{currentQuestionTranscript}"</p>
                                            </div>

                                            <div className="space-y-2">
                                              <p className="text-xs font-black text-gray-400 uppercase">Phản hồi sư phạm</p>
                                              <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                                {typeof currentQuestionFeedback.feedback === 'object' 
                                                  ? currentQuestionFeedback.feedback.overall 
                                                  : currentQuestionFeedback.feedback}
                                              </p>
                                              {typeof currentQuestionFeedback.feedback === 'object' && (currentQuestionFeedback.feedback.grammar?.notes || currentQuestionFeedback.feedback.vocabulary?.notes) && (
                                                <ul className="text-xs text-gray-500 space-y-1 mt-2 list-disc pl-4 italic">
                                                  {currentQuestionFeedback.feedback.grammar?.notes && <li>{currentQuestionFeedback.feedback.grammar.notes}</li>}
                                                  {currentQuestionFeedback.feedback.vocabulary?.notes && <li>{currentQuestionFeedback.feedback.vocabulary.notes}</li>}
                                                </ul>
                                              )}
                                            </div>

                                            {typeof currentQuestionFeedback.feedback === 'object' && currentQuestionFeedback.feedback.pronunciation_tip && (
                                              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-3 items-start">
                                                <Volume2 className="w-5 h-5 text-amber-600 shrink-0 mt-1" />
                                                <div>
                                                  <p className="text-xs font-black text-amber-600 uppercase mb-1">Mẹo phát âm</p>
                                                  <p className="text-sm text-amber-900 font-medium">{currentQuestionFeedback.feedback.pronunciation_tip}</p>
                                                </div>
                                              </div>
                                            )}

                                            <div className="space-y-2 pt-2 border-t border-gray-100">
                                              <p className="text-xs font-black text-green-600 uppercase">Expert Version (Mẫu IELTS 8.0+)</p>
                                              <div className="p-4 rounded-2xl bg-green-50 border border-green-100 group relative">
                                                <p className="text-sm text-green-800 font-bold leading-relaxed pr-8 italic">"{currentQuestionFeedback.improvedVersion}"</p>
                                                <button 
                                                  onClick={() => speak(currentQuestionFeedback.improvedVersion)}
                                                  className="absolute top-4 right-4 p-2 hover:bg-green-200 rounded-full transition-colors"
                                                >
                                                  <Volume2 className="w-4 h-4 text-green-600" />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <button 
                                          onClick={() => {
                                            setCurrentQuestionFeedback(null);
                                            setCurrentQuestionTranscript(null);
                                            setChatInput("");
                                          }}
                                          className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-all font-bold group"
                                        >
                                          <RotateCcw className="w-6 h-6 mb-1 group-hover:rotate-180 transition-transform duration-500" />
                                          <span className="text-xs">Luyện lại câu này</span>
                                        </button>
                                        <button 
                                          onClick={proceedToNextQuestion}
                                          className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg transition-all group"
                                        >
                                          Tiếp tục <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          )}

                          {challengeStep === 'summary' && (
                            <div className="space-y-8 max-w-3xl mx-auto">
                              <div className="bg-white rounded-3xl p-8 border border-indigo-100 shadow-sm text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50" />
                                <div className="relative z-10">
                                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                     <CheckCircle2 className="w-10 h-10 text-green-600" />
                                  </div>
                                  <h3 className="text-3xl font-black text-gray-900 mb-2">Kết Quả - Ngày {selectedChallengeDay.day}</h3>
                                  <p className="text-gray-500 font-medium mb-6">Chủ đề: {selectedChallengeDay.title}</p>
                                  
                                  <div className="flex justify-center gap-8 mb-4">
                                    <div className="text-center">
                                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Điểm Trung Bình</p>
                                      <p className="text-4xl font-black text-indigo-600">
                                        {(currentFeedbacks.length > 0 
                                          ? currentFeedbacks.reduce((acc, curr) => acc + (typeof curr === 'string' ? JSON.parse(curr).score : (curr.score || 0)), 0) / currentFeedbacks.length 
                                          : 0).toFixed(1)}
                                        <span className="text-lg text-gray-400">/10</span>
                                      </p>
                                    </div>
                                    <div className="w-px h-12 bg-gray-100" />
                                    <div className="text-center">
                                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Câu trả lời</p>
                                      <p className="text-4xl font-black text-gray-900">{currentFeedbacks.length}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100 text-xs text-gray-500">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {challengeSessionDate ? `Hoàn thành lúc: ${new Date(challengeSessionDate).toLocaleTimeString()} - ${new Date(challengeSessionDate).toLocaleDateString()}` : 'Đang xử lý...'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col gap-6">
                                <h4 className="font-black text-gray-900 flex items-center gap-2 text-xl italic uppercase tracking-tighter">
                                  <FileText className="w-6 h-6 text-indigo-600" /> Báo cáo chi tiết
                                </h4>
                                {currentFeedbacks.map((fb, idx) => {
                                   const fbData = typeof fb === 'string' ? JSON.parse(fb) : fb;
                                   return (
                                     <div key={idx} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4 hover:shadow-md transition-shadow duration-300">
                                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-50 pb-4">
                                          <div className="space-y-1 text-left">
                                             <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">CÂU HỎI {idx + 1}</p>
                                             <p className="text-sm font-bold text-gray-900 leading-tight">{selectedChallengeDay.questions[idx].question}</p>
                                          </div>
                                          <div className="flex items-center gap-2 self-start md:self-center">
                                            <div className="bg-indigo-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg shadow-indigo-200">
                                              Score: {fbData.score}/10
                                            </div>
                                          </div>
                                       </div>
                                       
                                       <div className="grid grid-cols-2 gap-3">
                                          <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-50 text-left">
                                             <p className="text-[10px] font-black text-blue-400 uppercase">Grammar</p>
                                             <p className="text-lg font-black text-blue-700">{typeof fbData.feedback === 'object' ? fbData.feedback.grammar?.score ?? 0 : fbData.score ?? 0}<span className="text-xs text-blue-400">/10</span></p>
                                          </div>
                                          <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-50 text-left">
                                             <p className="text-[10px] font-black text-purple-400 uppercase">Vocabulary</p>
                                             <p className="text-lg font-black text-purple-700">{typeof fbData.feedback === 'object' ? fbData.feedback.vocabulary?.score ?? 0 : fbData.score ?? 0}<span className="text-xs text-purple-400">/10</span></p>
                                          </div>
                                       </div>

                                       <div className="space-y-4 text-left">
                                          <div className="space-y-1">
                                             <p className="text-[10px] text-gray-400 font-bold uppercase">Phân tích chuyên sâu:</p>
                                             <p className="text-sm text-gray-600 font-medium leading-relaxed italic pr-4">"{currentTranscript[idx]}"</p>
                                          </div>
                                          
                                          <div className="p-4 bg-green-50 rounded-2xl border border-green-100 group relative">
                                             <div className="flex items-center justify-between mb-2">
                                                <p className="text-[10px] font-black text-green-600 uppercase">Mẫu luyện lại (IELTS 8.0+):</p>
                                                <button onClick={() => speak(fbData.improvedVersion)} className="p-2 hover:bg-green-200 rounded-full transition-colors"><Volume2 className="w-4 h-4 text-green-600" /></button>
                                             </div>
                                             <p className="text-sm text-green-800 font-bold leading-relaxed">"{fbData.improvedVersion}"</p>
                                          </div>

                                          <div className="p-5 bg-indigo-50/30 rounded-2xl border border-indigo-50">
                                            <p className="text-sm text-gray-800 font-medium leading-relaxed">{typeof fbData.feedback === 'object' ? fbData.feedback.overall : fbData.feedback}</p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                              <span className="text-[10px] bg-white border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">#PedagogicalFeedback</span>
                                              <span className="text-[10px] bg-white border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">#SpeakingAnalysis</span>
                                            </div>
                                          </div>
                                       </div>
                                     </div>
                                   );
                                })}
                              </div>

                              <div className="flex flex-col sm:flex-row gap-4">
                                <Button 
                                  onClick={() => {
                                    setChallengeStep('learning');
                                    setCurrentQuestionIndex(0);
                                    setCurrentTranscript([]);
                                    setCurrentFeedbacks([]);
                                  }} 
                                  variant="secondary"
                                  className="flex-1 py-4"
                                >
                                  Luyện tập lại ngày này
                                </Button>
                                <Button 
                                  onClick={() => setChallengeStep('dashboard')} 
                                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700"
                                >
                                  Trở lại Dashboard
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'shadowing' && (
              <motion.div
                key="shadowing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ShadowingModule />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .rotate-y-0 { transform: rotateY(0deg); }
        
        .ProseMirror { font-family: inherit; }
        .ProseMirror h1 { font-size: 2.25rem; font-weight: 800; margin-top: 2.5rem; margin-bottom: 1.5rem; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
        .ProseMirror h2 { font-size: 1.75rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; color: #1f2937; display: flex; align-items: center; gap: 0.5rem; }
        .ProseMirror h2::before { content: ""; display: inline-block; width: 4px; height: 1.5rem; background-color: #6366f1; border-radius: 2px; }
        .ProseMirror h3 { font-size: 1.35rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #374151; }
        .ProseMirror p { margin-bottom: 1.25rem; color: #4b5563; line-height: 1.8; font-size: 1.05rem; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.75rem; margin-bottom: 1.25rem; color: #4b5563; }
        .ProseMirror ul { list-style-type: disc; }
        .ProseMirror ol { list-style-type: decimal; }
        .ProseMirror li { margin-bottom: 0.75rem; line-height: 1.6; }
        .ProseMirror code { background-color: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-size: 0.9em; color: #ef4444; font-family: 'JetBrains Mono', monospace; font-weight: 500; }
        .ProseMirror blockquote { border-left: 4px solid #6366f1; padding: 1.25rem 1.5rem; font-style: normal; color: #4338ca; margin: 2rem 0; background-color: #f5f3ff; border-radius: 0 0.75rem 0.75rem 0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }
        .ProseMirror blockquote p { margin-bottom: 0; font-weight: 500; }
        .ProseMirror blockquote p::before { content: "💡 "; }
        .ProseMirror strong { color: #111827; font-weight: 700; }
        .ProseMirror table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 2rem 0; border-radius: 0.75rem; overflow: hidden; border: 1px solid #e5e7eb; }
        .ProseMirror th, .ProseMirror td { padding: 1rem; text-align: left; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
        .ProseMirror th { background-color: #f9fafb; font-weight: 700; color: #374151; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; }
        .ProseMirror tr:last-child td { border-bottom: none; }
        .ProseMirror td:last-child, .ProseMirror th:last-child { border-right: none; }
        .ProseMirror hr { margin: 3rem 0; border: 0; border-top: 1px solid #e5e7eb; }
      `}</style>
    </div>
  );
}
