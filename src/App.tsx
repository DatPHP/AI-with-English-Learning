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
  File as FileIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Toaster, toast } from 'sonner';
import { analyzeInput, analyzeDocument } from './lib/gemini';
import { Flashcard, GrammarBlog, UserProfile } from './types';
import mammoth from 'mammoth';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
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
        
        .prose h1 { font-size: 2.25rem; font-weight: 800; margin-top: 2.5rem; margin-bottom: 1.5rem; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
        .prose h2 { font-size: 1.75rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; color: #1f2937; display: flex; align-items: center; gap: 0.5rem; }
        .prose h2::before { content: ""; display: inline-block; width: 4px; height: 1.5rem; background-color: #6366f1; border-radius: 2px; }
        .prose h3 { font-size: 1.35rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #374151; }
        .prose p { margin-bottom: 1.25rem; color: #4b5563; line-height: 1.8; font-size: 1.05rem; }
        .prose ul, .prose ol { padding-left: 1.75rem; margin-bottom: 1.25rem; color: #4b5563; }
        .prose ul { list-style-type: disc; }
        .prose ol { list-style-type: decimal; }
        .prose li { margin-bottom: 0.75rem; line-height: 1.6; }
        .prose code { background-color: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-size: 0.9em; color: #ef4444; font-family: 'JetBrains Mono', monospace; font-weight: 500; }
        .prose blockquote { border-left: 4px solid #6366f1; padding: 1.25rem 1.5rem; font-style: normal; color: #4338ca; margin: 2rem 0; background-color: #f5f3ff; border-radius: 0 0.75rem 0.75rem 0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }
        .prose blockquote p { margin-bottom: 0; font-weight: 500; }
        .prose blockquote p::before { content: "💡 "; }
        .prose strong { color: #111827; font-weight: 700; }
        .prose table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 2rem 0; border-radius: 0.75rem; overflow: hidden; border: 1px solid #e5e7eb; }
        .prose th, .prose td { padding: 1rem; text-align: left; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
        .prose th { background-color: #f9fafb; font-weight: 700; color: #374151; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; }
        .prose tr:last-child td { border-bottom: none; }
        .prose td:last-child, .prose th:last-child { border-right: none; }
        .prose hr { margin: 3rem 0; border: 0; border-top: 1px solid #e5e7eb; }
      `}</style>
    </div>
  );
}
