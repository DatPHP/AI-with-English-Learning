import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Mic, 
  Square, 
  RotateCcw, 
  Volume2, 
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Headphones,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { ShadowingTopic, ShadowingSentence } from '../types';
import { shadowingData } from '../data/shadowingData';
import { playHighQualityAudio } from '../services/voiceService';
import { SpeakButton } from './SpeakButton';

export const ShadowingModule: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<ShadowingTopic | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const isPlayingAllRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(true);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const abortController = useRef<AbortController | null>(null);

  const activeSentence = selectedTopic?.sentences[currentIndex];

  useEffect(() => {
    // Cleanup recorded URL
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

  const handleNext = () => {
    if (selectedTopic && currentIndex < selectedTopic.sentences.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setRecordedUrl(null);
    } else {
      setIsPlayingAll(false);
      isPlayingAllRef.current = false;
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setRecordedUrl(null);
    }
  };

  const playSentence = async (index: number) => {
    if (!selectedTopic) return;
    const sentence = selectedTopic.sentences[index];
    try {
      await playHighQualityAudio(sentence.text);
    } catch (err) {
      console.error("Playback failed", err);
    }
  };

  const startAutoPlay = async () => {
    if (!selectedTopic) return;
    setIsPlayingAll(true);
    isPlayingAllRef.current = true;
    
    for (let i = currentIndex; i < selectedTopic.sentences.length; i++) {
        if (!isPlayingAllRef.current) break; // Check correct ref value
        setCurrentIndex(i);
        await playSentence(i);
        if (!isPlayingAllRef.current) break; // Check again after playback
        await new Promise(r => setTimeout(r, 1000)); // Gap between sentences
    }
    setIsPlayingAll(false);
    isPlayingAllRef.current = false;
  };

  const stopAutoPlay = () => {
    setIsPlayingAll(false);
    isPlayingAllRef.current = false;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedUrl(url);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Recording forbidden or failed", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      // Stop all tracks to turn off the browser recording indicator
      if (mediaRecorder.current.stream) {
        mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  if (!selectedTopic) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Shadowing Practice</h2>
          <p className="text-gray-600">Luyện nói tiếng Anh theo kỹ thuật "Cái bóng" với giọng AI chất lượng cao.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {shadowingData.map((topic) => (
            <motion.div
              key={topic.id}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedTopic(topic)}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-indigo-200 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  topic.level === 'Advanced' ? 'bg-red-50 text-red-600' : 
                  topic.level === 'Intermediate' ? 'bg-orange-50 text-orange-600' : 
                  'bg-green-50 text-green-600'
                }`}>
                  {topic.level}
                </span>
                <Headphones className="text-indigo-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{topic.title}</h3>
              <p className="text-gray-500 text-sm mb-4 line-clamp-2">{topic.description}</p>
              <div className="flex items-center gap-2 text-xs text-indigo-500 font-medium">
                <BookOpen className="w-4 h-4" />
                <span>{topic.sentences.length} sentences</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button 
        onClick={() => setSelectedTopic(null)}
        className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 mb-6 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" /> Back to Topics
      </button>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        {/* Progress header */}
        <div className="bg-indigo-600 px-8 py-4 flex justify-between items-center text-white">
          <h3 className="font-bold truncate max-w-[250px]">{selectedTopic.title}</h3>
          <div className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
            Sentence {currentIndex + 1} / {selectedTopic.sentences.length}
          </div>
        </div>

        {/* Practice Area */}
        <div className="p-8 md:p-12 min-h-[400px] flex flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full"
            >
              <div className="mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                  {activeSentence?.text}
                </h2>
                {showTranslation && (
                  <p className="text-xl text-gray-400 font-medium italic">
                    {activeSentence?.translation}
                  </p>
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-wrap justify-center items-center gap-6">
                <button 
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="p-3 rounded-full hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-all"
                >
                  <SkipBack className="w-8 h-8" />
                </button>

                <div className="relative">
                  <SpeakButton 
                    text={activeSentence?.text || ""}
                    className="!p-8 !bg-indigo-600 !text-white shadow-xl !rounded-full hover:scale-110 active:scale-95 transition-all"
                  />
                  <div className="absolute -top-2 -right-2 bg-yellow-400 text-white rounded-full p-1.5 shadow-sm">
                    <Volume2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    {!isRecording ? (
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={startRecording}
                        className="p-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-all shadow-md group border-2 border-red-100"
                    >
                        <Mic className="w-8 h-8" />
                    </motion.button>
                    ) : (
                    <motion.button
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        onClick={stopRecording}
                        className="p-8 rounded-full bg-red-600 text-white shadow-xl"
                    >
                        <Square className="w-8 h-8 fill-current" />
                    </motion.button>
                    )}
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {isRecording ? "Recording..." : "Record Me"}
                    </span>
                </div>

                <button 
                  onClick={handleNext}
                  disabled={currentIndex === selectedTopic.sentences.length - 1}
                  className="p-3 rounded-full hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-all"
                >
                  <SkipForward className="w-8 h-8" />
                </button>
              </div>

              {/* Playback recording */}
              {recordedUrl && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-12 flex flex-col items-center p-6 bg-green-50 rounded-2xl border border-green-100"
                >
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                            <button 
                                onClick={() => {
                                    const audio = new Audio(recordedUrl);
                                    audio.play();
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl shadow-md hover:bg-green-700 transition-all font-bold"
                            >
                                <Play className="w-4 h-4 fill-current" /> Nghe lại giọng mình
                            </button>
                        </div>
                        
                        <div className="h-10 w-[2px] bg-green-200"></div>

                        <button 
                            onClick={async () => {
                                // Double comparison
                                await playHighQualityAudio(activeSentence?.text || "");
                                await new Promise(r => setTimeout(r, 500));
                                const audio = new Audio(recordedUrl);
                                audio.play();
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white text-green-600 border-2 border-green-200 rounded-xl hover:bg-green-50 transition-all font-bold"
                        >
                            <RotateCcw className="w-4 h-4" /> So sánh với AI
                        </button>
                    </div>
                    <p className="mt-3 text-xs text-green-700 font-medium">Bạn có thấy mình phát âm giống AI chưa?</p>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <div className="bg-gray-50 border-t border-gray-100 p-6 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setShowTranslation(!showTranslation)}
                    className={`text-sm font-bold flex items-center gap-2 transition-colors ${showTranslation ? 'text-indigo-600' : 'text-gray-400'}`}
                >
                    <MessageSquare className="w-4 h-4" /> {showTranslation ? "Ẩn dịch" : "Hiện dịch"}
                </button>
                <div className="w-px h-4 bg-gray-300"></div>
                <button 
                    onClick={isPlayingAll ? stopAutoPlay : startAutoPlay}
                    className={`text-sm font-bold flex items-center gap-2 transition-colors ${isPlayingAll ? 'text-red-600' : 'text-indigo-600'}`}
                >
                    {isPlayingAll ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4" />} 
                    {isPlayingAll ? "Stop Auto" : "Auto Play"}
                </button>
            </div>

            <div className="flex gap-2">
                {selectedTopic.sentences.map((_, i) => (
                    <div 
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${
                            i === currentIndex ? 'w-8 bg-indigo-600' : 
                            i < currentIndex ? 'w-4 bg-indigo-200' : 'w-4 bg-gray-200'
                        }`}
                    />
                ))}
            </div>

            <button 
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all font-bold"
            >
                Next Sentence <ChevronRight className="w-4 h-4" />
            </button>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h4 className="font-bold text-blue-900 mb-1 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Step 1: Listen
            </h4>
            <p className="text-xs text-blue-700">Nghe AI đọc mẫu để nắm bắt nhịp điệu và cách ngắt nghỉ tự nhiên.</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
            <h4 className="font-bold text-purple-900 mb-1 flex items-center gap-2">
                <Mic className="w-4 h-4" /> Step 2: Record
            </h4>
            <p className="text-xs text-purple-700">Ghi âm lại giọng của mình, cố gắng bắt chước y hệt ngữ điệu AI.</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
            <h4 className="font-bold text-orange-900 mb-1 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Step 3: Compare
            </h4>
            <p className="text-xs text-orange-700">Nghe lại và so sánh. Phát hiện những chỗ chưa giống để sửa đổi.</p>
        </div>
      </div>
    </div>
  );
};
