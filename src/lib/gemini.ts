import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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
    - Format it as a structured blog post with a title, category, and markdown content.
    - Improve the content to be more educational and clear.
    
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
