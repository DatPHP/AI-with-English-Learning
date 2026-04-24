/**
 * Frontend Voice Service to interact with our ElevenLabs API proxy.
 */
export async function playHighQualityAudio(text: string, voiceId?: string) {
  try {
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
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    return new Promise((resolve, reject) => {
      audio.play().catch(reject);
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve(true);
      };
    });
  } catch (error) {
    console.error("Voice Service Error:", error);
    // Fallback to browser TTS if ElevenLabs fails
    const utter = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utter);
  }
}
