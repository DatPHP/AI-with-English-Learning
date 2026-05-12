import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || "" 
});

export async function analyzeInput(text: string, userId: string) {
  const model = "gemini-3-flash-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: `Analyze the following English learning content and categorize it as either 'vocabulary' or 'grammar'.
    
    If it's vocabulary:
    - Extract a list of words.
    - For each word, provide: word, phonetic, Vietnamese meaning, word family (họ hàng từ), and an example sentence.
    - If information is missing, use your knowledge to fill it in.
    
    If it's grammar:
    - Format it as a structured, professional educational blog post.
    - Use a clear hierarchy: Title, Category, and Content.
    - Content MUST use Markdown with:
        - Numbered headers (1., 1.1., 1.1.1.) for logical sections.
        - Bullet points for lists.
        - Bold text for key terms.
        - Blockquotes (>) for examples, with "Ví dụ:" and explanations.
        - Tables for comparisons if applicable.
    - The content should be comprehensive, accurate, and easy to follow, similar to a high-quality textbook.
    - Use Google Search to ensure the rules and examples are up-to-date and accurate.
    
    Input text:
    ${text}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["vocabulary", "grammar"] },
          vocabulary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                phonetic: { type: Type.STRING },
                meaning: { type: Type.STRING },
                wordFamily: { type: Type.STRING },
                example: { type: Type.STRING },
                category: { type: Type.STRING }
              },
              required: ["word", "meaning"]
            }
          },
          grammar: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              category: { type: Type.STRING }
            },
            required: ["title", "content"]
          }
        },
        required: ["type"]
      }
    }
  });

  const result = JSON.parse(response.text || "{}");
  
  if (result.type === 'vocabulary') {
    return {
      type: 'vocabulary',
      data: result.vocabulary.map((item: any) => ({
        ...item,
        userId,
        createdAt: new Date().toISOString()
      }))
    };
  } else {
    return {
      type: 'grammar',
      data: {
        ...result.grammar,
        userId,
        createdAt: new Date().toISOString()
      }
    };
  }
}

export async function analyzeDocument(content: string | { data: string, mimeType: string }, userId: string) {
  const model = "gemini-3-flash-preview";
  
  const contents: any[] = [];
  if (typeof content === 'string') {
    contents.push({ text: `Analyze the following English learning content extracted from a document.
    1. Identify the main vocabulary words or grammar structures present.
    2. Use Google Search to find more detailed information, accurate definitions, usage rules, and common examples for these findings.
    3. Supplement and refine the information to ensure high accuracy and educational value.
    4. Categorize the result as either 'vocabulary' or 'grammar'.
    
    If it's vocabulary:
    - Extract a list of words.
    - For each word, provide: word, phonetic, Vietnamese meaning, word family (họ hàng từ), and an example sentence.
    
    If it's grammar:
    - Format it as a structured, professional educational blog post.
    - Use a clear hierarchy: Title, Category, and Content.
    - Content MUST use Markdown with:
        - Numbered headers (1., 1.1., 1.1.1.) for logical sections.
        - Bullet points for lists.
        - Bold text for key terms.
        - Blockquotes (>) for examples, with "Ví dụ:" and explanations.
        - Tables for comparisons if applicable.
    - The content should be comprehensive, accurate, and easy to follow, similar to a high-quality textbook.
    - Use Google Search to ensure the rules and examples are up-to-date and accurate.
    
    Content:
    ${content}
    ` });
  } else {
    contents.push({
      inlineData: {
        data: content.data,
        mimeType: content.mimeType
      }
    });
    contents.push({
      text: `Scan this document for English vocabulary or grammar points. 
      1. Identify the main vocabulary words or grammar structures present in the document.
      2. Use Google Search to find more detailed information, accurate definitions, usage rules, and common examples for these findings.
      3. Supplement and refine the information to ensure high accuracy and educational value.
      4. Categorize the result as either 'vocabulary' or 'grammar'.
      
      If it's vocabulary:
      - Extract a list of words.
      - For each word, provide: word, phonetic, Vietnamese meaning, word family (họ hàng từ), and an example sentence.
      
      If it's grammar:
      - Format it as a structured, professional educational blog post.
      - Use a clear hierarchy: Title, Category, and Content.
      - Content MUST use Markdown with:
          - Numbered headers (1., 1.1., 1.1.1.) for logical sections.
          - Bullet points for lists.
          - Bold text for key terms.
          - Blockquotes (>) for examples, with "Ví dụ:" and explanations.
          - Tables for comparisons if applicable.
      - The content should be comprehensive, accurate, and easy to follow, similar to a high-quality textbook.
      - Use Google Search to ensure the rules and examples are up-to-date and accurate.
      `
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["vocabulary", "grammar"] },
          vocabulary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                phonetic: { type: Type.STRING },
                meaning: { type: Type.STRING },
                wordFamily: { type: Type.STRING },
                example: { type: Type.STRING },
                category: { type: Type.STRING }
              },
              required: ["word", "meaning"]
            }
          },
          grammar: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              category: { type: Type.STRING }
            },
            required: ["title", "content"]
          }
        },
        required: ["type"]
      }
    }
  });

  const result = JSON.parse(response.text || "{}");
  
  if (result.type === 'vocabulary') {
    return {
      type: 'vocabulary',
      data: result.vocabulary.map((item: any) => ({
        ...item,
        userId,
        createdAt: new Date().toISOString()
      }))
    };
  } else {
    return {
      type: 'grammar',
      data: {
        ...result.grammar,
        userId,
        createdAt: new Date().toISOString()
      }
    };
  }
}

export async function getChatResponse(messages: { role: 'user' | 'model', text: string }[], vocabulary: string[]) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `You are a helpful and friendly English conversation partner named EngMaster AI. 
  Your goal is to help the user practice English by having a natural conversation.
  The conversation should be themed around these vocabulary words the user has learned: ${vocabulary.join(', ')}.
  Try to use at least one or two of these words in each of your responses naturally.
  Keep your responses concise (1-3 sentences) to encourage the user to speak more.
  Ask open-ended questions related to the vocabulary and the user's life.
  If the user makes a significant grammatical mistake, gently correct it and explain why, then continue the conversation.
  Speak English only.`;

  const response = await ai.models.generateContent({
    model,
    contents: messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    })),
    config: {
      systemInstruction
    }
  });

  return response.text || "I'm sorry, I couldn't understand that. Can we try again?";
}

export async function getChatSuggestion(messages: { role: 'user' | 'model', text: string }[], vocabulary: string[]) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `You are an English teacher. Based on the current conversation history and the target vocabulary: ${vocabulary.join(', ')}, 
  provide ONE brief suggestion (max 12 words) for what the user could say next to continue the conversation. 
  The suggestion should be a complete sentence or a question in English.
  Return ONLY the suggested text, nothing else.`;

  const response = await ai.models.generateContent({
    model,
    contents: messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    })),
    config: {
      systemInstruction
    }
  });

  return response.text?.trim() || "Could you tell me more about that?";
}

export async function evaluateChallengeAnswer(
  dayTitle: string,
  question: string,
  userAnswer: string,
  keywords: { word: string; meaning: string }[]
) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `You are a Senior IELTS Speaking Examiner and Expert English Coach.
  Topic Context: ${dayTitle}
  Specific Question: "${question}"
  Target Keywords to emphasize: ${keywords.map(k => `${k.word} (${k.meaning})`).join(', ')}

  CONTEXTUAL AWARENESS: 
  The 'userAnswer' text is generated by a Speech-to-Text (STT) engine. 
  1. If you see words that sound similar to the keywords but are spelled wrong (e.g., "environment" heard as "in buy run ment"), assume the user said it correctly but the STT failed.
  2. Be lenient with STT artifacts while remaining strict on actual grammatical structures.

  TASK: 
  1. Detailed Analysis: Analyze Grammar, Vocabulary, and Coherence.
  2. Pedagogical Feedback (Phản hồi sư phạm): Explain WHY something is wrong or how to improve.
  3. Natural Version: Provide a high-scoring IELTSBand 8+ version of the response using the keywords.
  4. Pronunciation Prediction: Based on common Vietnamese mistakes and the STT output, identify specific sounds the user might need to practice (e.g., ending sounds, vowel reduction).

  JSON FORMAT REQUIRED:
  {
    "feedback": {
      "overall": "Summary evaluation (Vietnamese)",
      "grammar": { "score": 1-10, "notes": "Specific grammar tips (Vietnamese)" },
      "vocabulary": { "score": 1-10, "notes": "Vocabulary usage tips (Vietnamese)" },
      "pronunciation_tip": "Specific sound/word to focus on (Vietnamese)"
    },
    "improvedVersion": "Polished English version",
    "score": 1-10 (Overall weighted score)
  }`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      { 
        role: 'user', 
        parts: [{ text: `User's spoken answer (via STT): "${userAnswer}"` }] 
      }
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json"
    }
  });

  try {
    const parsed = JSON.parse(response.text || "{}");
    return parsed;
  } catch (e) {
    return {
      feedback: {
        overall: "AI không thể xử lý phản hồi chi tiết. Vui lòng thử lại.",
        grammar: { score: 0, notes: "" },
        vocabulary: { score: 0, notes: "" },
        pronunciation_tip: ""
      },
      improvedVersion: userAnswer,
      score: 5
    };
  }
}
