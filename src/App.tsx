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
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Toaster, toast } from 'sonner';
import { analyzeInput } from './lib/gemini';
import { Flashcard, GrammarBlog, UserProfile } from './types';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

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
  toast.error(`Lỗi: ${errInfo.error}`);
}

// --- Components ---

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
  const [name, setName] = useState('');

  // App State
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [grammarBlogs, setGrammarBlogs] = useState<GrammarBlog[]>([]);
  const [activeTab, setActiveTab] = useState<'input' | 'vocabulary' | 'grammar'>('input');
  const [selectedBlog, setSelectedBlog] = useState<GrammarBlog | null>(null);

  // Flashcard Learning State
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Hardcoded Admin Check
        if (u.email === 'admin@gmail.com') {
          setProfile({
            uid: u.uid,
            name: 'System Admin',
            email: u.email,
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

    return () => { unsubV(); unsubG(); };
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
          if (email === 'admin@gmail.com' && password === 'admin12345' && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
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
          role: email === 'admin@gmail.com' ? 'admin' : 'user',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', cred.user.uid), newProfile);
        toast.success('Đăng ký thành công!');
      } else {
        await sendPasswordResetEmail(auth, email);
        toast.success('Đã gửi email đặt lại mật khẩu!');
        setAuthMode('login');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputSubmit = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeInput(inputText, user.uid);
      if (result.type === 'vocabulary') {
        const cards = result.data as Flashcard[];
        for (const card of cards) {
          await addDoc(collection(db, 'flashcards'), card);
        }
        toast.success(`Đã thêm ${cards.length} từ vựng mới!`);
        setActiveTab('vocabulary');
      } else {
        const blog = result.data as GrammarBlog;
        await addDoc(collection(db, 'grammarBlogs'), blog);
        toast.success('Đã tạo blog ngữ pháp mới!');
        setActiveTab('grammar');
      }
      setInputText('');
    } catch (e) {
      console.error(e);
      toast.error('Lỗi phân tích nội dung. Vui lòng thử lại.');
    } finally {
      setIsAnalyzing(false);
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
            <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="admin@gmail.com" required />
            {authMode !== 'forgot' && (
              <Input label="Mật khẩu" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />
            )}
            
            <Button className="w-full" loading={loading}>
              {authMode === 'login' ? 'Đăng nhập' : authMode === 'register' ? 'Đăng ký' : 'Gửi yêu cầu'}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-center">
            {authMode === 'login' ? (
              <>
                <button onClick={() => setAuthMode('register')} className="text-sm text-indigo-600 hover:underline">Chưa có tài khoản? Đăng ký</button>
                <button onClick={() => setAuthMode('forgot')} className="text-sm text-gray-500 hover:underline">Quên mật khẩu?</button>
              </>
            ) : (
              <button onClick={() => setAuthMode('login')} className="text-sm text-indigo-600 hover:underline">Quay lại đăng nhập</button>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">Tài khoản mặc định: admin@gmail.com / admin12345</p>
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
                  Dán danh sách từ vựng hoặc nội dung ngữ pháp vào đây. AI sẽ tự động phân loại và xử lý cho bạn.
                </p>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ví dụ: 1. Civilian / 28 : [ n, adj ] / sə'vɪliən / = A person who is not a member of the armed forces..."
                  className="w-full h-64 p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none mb-4 font-mono text-sm"
                  maxLength={5000}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">{inputText.length}/5000 từ</span>
                  <Button onClick={handleInputSubmit} loading={isAnalyzing} disabled={!inputText.trim()}>
                    Phân tích với AI
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
                            <h3 className="text-4xl font-bold text-indigo-900 mb-2">{flashcards[currentCardIndex].word}</h3>
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
                            <div>
                              <h4 className="font-bold text-gray-900">{card.word}</h4>
                              <p className="text-xs text-gray-500 font-mono">{card.phonetic}</p>
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
                        <ReactMarkdown>{selectedBlog.content}</ReactMarkdown>
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
          </AnimatePresence>
        </div>
      </main>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .rotate-y-0 { transform: rotateY(0deg); }
        
        .prose h1 { font-size: 1.875rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; }
        .prose h2 { font-size: 1.5rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem; }
        .prose h3 { font-size: 1.25rem; font-weight: 700; margin-top: 1.25rem; margin-bottom: 0.5rem; }
        .prose p { margin-bottom: 1rem; color: #4b5563; line-height: 1.625; }
        .prose ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
        .prose li { margin-bottom: 0.5rem; }
        .prose code { background-color: #f3f4f6; padding: 0.2rem 0.4rem; rounded: 0.25rem; font-size: 0.875em; }
        .prose blockquote { border-left: 4px solid #6366f1; padding-left: 1rem; font-style: italic; color: #4f46e5; margin: 1.5rem 0; }
      `}</style>
    </div>
  );
}
