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
  
  const systemInstruction = `You are a friendly IELTS Speaking Expert. 
  Topic: Day - ${dayTitle}
  Question: "${question}"
  Target Keywords: ${keywords.map(k => `${k.word} (${k.meaning})`).join(', ')}

  Task: 
  1. Evaluate the user's spoken answer (fluency, grammar, vocabulary).
  2. Provide a "Better Version" of their answer using natural IELTS-style English and today's keywords.
  3. Give mini-encouragement.
  
  Return the response in JSON format:
  {
    "feedback": "Your evaluation (in Vietnamese)",
    "improvedVersion": "Exactly what the user should say (in English)",
    "score": 1-10
  }`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: userAnswer }] }],
    config: {
      systemInstruction,
      responseMimeType: "application/json"
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return {
      feedback: "AI không thể xử lý phản hồi.",
      improvedVersion: userAnswer,
      score: 5
    };
  }
}
