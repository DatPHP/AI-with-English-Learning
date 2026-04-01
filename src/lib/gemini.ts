import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

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
