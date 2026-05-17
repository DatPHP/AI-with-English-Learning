import { ElevenLabsClient } from "elevenlabs";

/**
 * ElevenLabs Service to handle TTS requests.
 * Uses the official ElevenLabs SDK.
 */
export class ElevenLabsService {
  private client: ElevenLabsClient | null = null;

  constructor() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (apiKey) {
      this.client = new ElevenLabsClient({ apiKey });
    }
  }

  /**
   * Generates audio from text using ElevenLabs.
   * @param text The text to convert to speech.
   * @param voiceId Optional voice ID (Default: Rachel - 21m00Tcm4llvDq8ikWAM)
   */
  async textToSpeech(text: string, voiceId: string = "21m00Tcm4llvDq8ikWAM") {
    if (!this.client) {
      throw new Error("ELEVENLABS_API_KEY is not configured.");
    }

    try {
      // Improved settings for more human-like variations
      const audio = await this.client.generate({
        voice: voiceId,
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.5,
          use_speaker_boost: true
        }
      });

      return audio;
    } catch (error: any) {
      console.error("ElevenLabs API Error:", error.message);
      throw error;
    }
  }
}

export const elevenLabsService = new ElevenLabsService();
