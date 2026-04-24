import React, { useState } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { playHighQualityAudio } from '../services/voiceService';
import { motion } from 'framer-motion';

interface SpeakButtonProps {
  text: string;
  voiceId?: string;
  className?: string;
  label?: string;
}

export const SpeakButton: React.FC<SpeakButtonProps> = ({ 
  text, 
  voiceId, 
  className = "", 
  label 
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSpeak = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await playHighQualityAudio(text, voiceId);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleSpeak}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-50 ${className}`}
      id="elevenlabs-speak-button"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Volume2 className="w-4 h-4" />
      )}
      {label && <span className="text-sm font-medium">{label}</span>}
    </motion.button>
  );
};
