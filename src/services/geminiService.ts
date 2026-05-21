import { GoogleGenAI } from "@google/genai";

const MODELS = ['gemini-3-flash-preview', 'gemini-3-pro-preview', 'gemini-2.5-flash'];

export async function callGeminiAI(prompt: string, apiKey: string, modelIndex = 0): Promise<string | null> {
  if (!apiKey) {
    throw new Error('Vui lòng nhập API Key!');
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = MODELS[modelIndex];
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    });

    return response.text || '';
  } catch (error: any) {
    console.error(`Error with model ${MODELS[modelIndex]}:`, error);
    
    // Fallback logic
    if (modelIndex < MODELS.length - 1) {
      console.log(`Falling back to ${MODELS[modelIndex + 1]}...`);
      return callGeminiAI(prompt, apiKey, modelIndex + 1);
    }
    
    throw error;
  }
}

export const generateExplanation = async (question: string, userAnswer: string, correctAnswer: string, apiKey: string) => {
  const prompt = `Bạn là một giáo viên Hóa học THCS giỏi. 
  Câu hỏi: ${question}
  Học sinh chọn: ${userAnswer}
  Đáp án đúng: ${correctAnswer}
  
  Hãy giải thích chi tiết tại sao đáp án đó đúng và tại sao học sinh sai (nếu có). 
  Hãy giải thích bằng tiếng Việt, ngắn gọn, dễ hiểu cho học sinh lớp 8-9. 
  Sử dụng Markdown để định dạng.`;
  
  return callGeminiAI(prompt, apiKey);
};

export const askAITutor = async (userQuestion: string, context: string, apiKey: string) => {
  const prompt = `Bạn là một trợ lý học tập Hóa học THCS thông minh. 
  Bối cảnh: ${context}
  Câu hỏi của học sinh: ${userQuestion}
  
  Hãy trả lời câu hỏi một cách thân thiện, chính xác và dễ hiểu. 
  Nếu câu hỏi không liên quan đến Hóa học, hãy nhắc nhở học sinh tập trung vào môn học. 
  Sử dụng Markdown để định dạng câu trả lời.`;
  
  return callGeminiAI(prompt, apiKey);
};
