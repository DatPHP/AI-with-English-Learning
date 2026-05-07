const audioCache = new Map<string, string>();

/**
 * Frontend Voice Service to interact with our ElevenLabs API proxy.
 */
export async function playHighQualityAudio(text: string, voiceId?: string) {
  try {
    const cacheKey = `${voiceId || "default"}_${text}`;
    let audioUrl = audioCache.get(cacheKey);

    if (!audioUrl) {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, voiceId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate audio");
      }

      const audioBlob = await response.blob();
      audioUrl = URL.createObjectURL(audioBlob);
      audioCache.set(cacheKey, audioUrl);
    }

    const audio = new Audio(audioUrl);
    
    return new Promise((resolve, reject) => {
      audio.play().catch(reject);
      audio.onended = () => {
        // We don't revoke the URL here because we are caching it
        resolve(true);
      };
    });
  } catch (error) {
    console.error("Voice Service Error:", error);
    // Fallback to browser TTS if ElevenLabs fails
    const utter = new SpeechSynthesisUtterance(text);
    return new Promise((resolve) => {
      utter.onend = () => resolve(true);
      window.speechSynthesis.speak(utter);
    });
  }
}
