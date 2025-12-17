import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ParsedRecord {
  amount: number;
  isWin: boolean;
  date: string;
  note: string;
}

export const analyzeText = async (text: string, apiKey?: string): Promise<ParsedRecord[]> => {
  // Use provided key or fallback to environment variable
  const key = apiKey || import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!key) {
    console.error('Gemini API Key is missing. Please set VITE_GEMINI_API_KEY in .env or provide it.');
    throw new Error('API Key is missing');
  }

  const genAI = new GoogleGenerativeAI(key);
  // Use Gemini 3 Pro Preview for best accuracy
  const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview'});

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentYear = today.getFullYear();

  const prompt = `
    You are an expert data extraction assistant.
    Your task is to extract financial records (specifically Mahjong or game results) from the provided text.
    The text may contain multiple records spanning different dates and years.
    
    Current Date Reference: ${todayStr} (Year: ${currentYear})
    
    Extraction Rules:
    1. **Date**: 
       - Extract date in YYYY-MM-DD format.
       - Handle relative dates (e.g., "yesterday", "last Friday") based on the Current Date Reference.
       - If a year is not specified, assume the current year (${currentYear}) UNLESS the month/day is in the future relative to today, in which case assume the previous year.
       - If the text explicitly mentions a year (e.g., "21年", "2022"), use that year.
       - If no date is found for a specific entry, use ${todayStr}.
       - Context carries over: if a line says "May 1st" and subsequent lines don't mention a date, assume they are also for May 1st unless indicated otherwise.
    
    2. **Amount**: 
       - Extract the numeric value.
       - Ignore currency symbols.
    
    3. **isWin**: 
       - true if the user WON money (keywords: 赢, +, 收, 入, win).
       - false if the user LOST money (keywords: 输, -, 出, loss, 给).
    
    4. **Note**: 
       - Extract specific descriptions if present (e.g., "with John", "at Club").
       - If NO specific description is found, return an EMPTY STRING ("").
       - DO NOT invent notes like "Game result", "Mahjong", "Win", "Loss", "Record".
       - Keep it empty unless the user explicitly wrote a remark.
    
    Input Text:
    "${text}"
    
    Output Format:
    Return a VALID JSON ARRAY of objects. Each object must have keys: "date", "amount", "isWin", "note".
    Example: [{"date": "2023-05-20", "amount": 200, "isWin": true, "note": "Mahjong"}]
    
    Do not include markdown code blocks (like \`\`\`json). Just the raw JSON string.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textResponse = response.text();
    
    // Clean up potential markdown formatting
    let jsonString = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Find the first '[' and last ']' to extract JSON array if there's extra text
    const firstBracket = jsonString.indexOf('[');
    const lastBracket = jsonString.lastIndexOf(']');
    
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        jsonString = jsonString.substring(firstBracket, lastBracket + 1);
    } else {
        // Fallback: check for single object { ... }
        const firstCurly = jsonString.indexOf('{');
        const lastCurly = jsonString.lastIndexOf('}');
        if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
             jsonString = jsonString.substring(firstCurly, lastCurly + 1);
        }
    }

    let data: any;
    try {
      data = JSON.parse(jsonString);
    } catch (e) {
      // Sometimes Gemini returns a single object instead of an array if only one record is found
      // Try to parse as single object and wrap in array
      console.warn('Failed to parse as JSON array, trying to fix structure', e);
      // Heuristic: if it starts with { and ends with }, wrap in []
      if (jsonString.startsWith('{') && jsonString.endsWith('}')) {
        data = [JSON.parse(jsonString)];
      } else {
        throw e;
      }
    }

    if (!Array.isArray(data)) {
      // Fallback if it's a single object
      data = [data];
    }
    
    return data.map((item: any) => ({
      amount: Number(item.amount) || 0,
      isWin: Boolean(item.isWin),
      date: item.date || todayStr,
      note: item.note || ''
    }));

  } catch (error: any) {
    console.error('Error analyzing text with Gemini:', error);
    // Pass the actual error message to the UI
    const errorMessage = error?.message || 'Unknown error';
    if (errorMessage.includes('API Key is missing')) {
        throw new Error('API Key 未配置，请检查 .env 文件');
    }
    if (errorMessage.includes('403')) {
        throw new Error('API Key 无效或受限 (403)');
    }
    throw new Error(`AI 分析失败: ${errorMessage}`);
  }
};
