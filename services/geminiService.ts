// Removed GoogleGenerativeAI import as we use direct fetch for SiliconFlow
export interface ParsedRecord {
  amount: number;
  isWin: boolean;
  date: string;
  note: string;
  circleName?: string;
}

export const analyzeText = async (text: string, availableCircles: string[] = [], apiKey?: string): Promise<ParsedRecord[]> => {
  // Use provided key or fallback to environment variable
  const key = apiKey || import.meta.env.VITE_SILICONFLOW_API_KEY;
  
  if (!key) {
    console.error('SiliconFlow API Key is missing. Please set VITE_SILICONFLOW_API_KEY in .env or provide it.');
    throw new Error('API Key is missing');
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentYear = today.getFullYear();

  const prompt = `
    You are an expert data extraction assistant.
    Your task is to extract financial records (specifically Mahjong or game results) from the provided text.
    The text may contain multiple records spanning different dates and years.
    
    Current Date Reference: ${todayStr} (Year: ${currentYear})
    Available Circles: ${availableCircles.length > 0 ? availableCircles.join(', ') : 'None'}
    
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

    4. **Circle Name** (circleName):
       - Try to match the input text with one of the "Available Circles".
       - Fuzzy match is allowed (e.g. "同事" matches "同事圈").
       - If a match is found, return the EXACT name from "Available Circles".
       - If no match is found, leave it undefined or null.
    
    5. **Note**: 
       - Extract specific descriptions if present (e.g., "with John", "at Club").
       - **IMPORTANT**: Do NOT include information that has already been extracted as Date, Amount, or Circle Name.
       - If the text says "和同事打牌" and "同事圈" is identified as the circle, the note should NOT contain "同事".
       - If NO specific description remains, return an EMPTY STRING ("").
       - DO NOT invent notes like "Game result", "Mahjong", "Win", "Loss", "Record".
    
    6. **Invalid Input**:
       - If the text does NOT contain any financial context (no amount, no win/loss keywords), or is just casual conversation (e.g., "hello", "test", "whatever", "随便说点什么"), return an **EMPTY ARRAY []**.
       - Do NOT return a record with amount 0 unless the text explicitly says "won 0" or "lost 0" (e.g. "平局", "没输没赢").
       - If the input is empty or meaningless, return [].

    Input Text:
    "${text}"
    
    Output Format:
    Return a VALID JSON ARRAY of objects. Each object must have keys: "date", "amount", "isWin", "note", "circleName".
    Example: [{"date": "2023-05-20", "amount": 200, "isWin": true, "note": "开心", "circleName": "同事圈"}]
    Example for invalid input: []
    
    Do not include markdown code blocks (like \`\`\`json). Just the raw JSON string.
  `;

  try {
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-V3.2", // Using DeepSeek-V3.2 model
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        stream: false,
        max_tokens: 2048,
        temperature: 0.1, // Low temperature for consistent JSON output
        response_format: {
          type: "json_object"
        }
      })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP Error: ${response.status}`);
    }

    const dataResponse = await response.json();
    console.log("DeepSeek API Response:", JSON.stringify(dataResponse, null, 2));
    const textResponse = dataResponse.choices[0]?.message?.content || '';
    
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
      // Sometimes AI returns a single object inside a key or just a single object
      console.warn('Failed to parse as JSON array, trying to fix structure', e);
      // Heuristic: if it starts with { and ends with }, wrap in []
      if (jsonString.startsWith('{') && jsonString.endsWith('}')) {
        try {
             const parsed = JSON.parse(jsonString);
             // Check if it's wrapped in a key like "records": [...]
             const keys = Object.keys(parsed);
             if (keys.length === 1 && Array.isArray(parsed[keys[0]])) {
                 data = parsed[keys[0]];
             } else {
                 data = [parsed];
             }
        } catch(e2) {
             throw e;
        }
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
      note: item.note || '',
      circleName: item.circleName || undefined
    })).filter((item: any) => {
        // Double check: filter out records with 0 amount unless the original text implies a draw/zero
        // This prevents "ghost" records from casual conversation
        if (item.amount === 0) {
            const hasZeroKeyword = /0|零|平|没输|没赢/.test(text);
            return hasZeroKeyword;
        }
        return true;
    });

  } catch (error: any) {
    console.error('Error analyzing text with SiliconFlow:', error);
    // Pass the actual error message to the UI
    const errorMessage = error?.message || 'Unknown error';
    if (errorMessage.includes('API Key is missing')) {
        throw new Error('API Key 未配置，请检查 .env 文件');
    }
    throw new Error(`AI 分析失败: ${errorMessage}`);
  }
};
