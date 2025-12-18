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
    你是一个专业的账单数据提取助手。
    你的任务是从提供的文本中提取财务记录（特别是麻将或游戏结果）。
    文本可能包含跨越不同日期和年份的多条记录。
    
    当前参考日期: ${todayStr} (年份: ${currentYear})
    可用圈子: ${availableCircles.length > 0 ? availableCircles.join(', ') : '无'}
    
    提取规则:
    1. **日期 (Date)**: 
       - 提取 YYYY-MM-DD 格式的日期。
       - 处理相对日期（如“昨天”、“上周五”）。
       - **特别注意简写格式**: 如 "2.6" 代表 2月6日, "2.14" 代表 2月14日。
       - 如果未指定年份，默认为当前年份 (${currentYear})；如果该月/日相对于今天是在未来，则推断为去年。
       - 如果文本明确提到了年份（如 "21年"），请使用该年份。
       - 如果某条记录没有日期，使用 ${todayStr}。
       - 上下文继承：如果第一行是 "5月1日"，后续行没有日期，则默认也是 5月1日。
    
    2. **金额 (Amount)**: 
       - 提取数值。
       - 忽略货币符号。
       - 处理简写格式: 如 "2.6+800" 中，2.6是日期，+800是金额。
    
    3. **输赢 (isWin)**: 
       - true: 赢钱 (关键词: 赢, +, 收, 入, win, 正数)。
       - false: 输钱 (关键词: 输, -, 出, loss, 给, 负数)。
    
    4. **圈子名称 (Circle Name)**:
       - 尝试匹配 "可用圈子" 中的名称。
       - 允许模糊匹配（如 "同事" 匹配 "同事圈"）。
       - 如果找到匹配项，返回 "可用圈子" 中的确切名称。
       - 如果未找到，保持 undefined 或 null。
    
    5. **备注 (Note)**: 
       - 提取具体的描述（如 "和老王", "在棋牌室"）。
       - **重要**: 不要包含已提取的日期、金额或圈子名称。
       - 如果没有剩余描述，返回空字符串 ("")。
    
    6. **排除汇总数据**:
       - **忽略仅包含“月”或“年”而没有具体“日”的行**。例如: "1月-7640", "2024年总计+500", "2月+4810"。
       - 忽略包含 "汇总", "合计", "总计", "小计", "结余", "账目" 等关键词的行。
       - 你的目标是提取**单次**的记录，而不是汇总。
    
    7. **无效输入**:
       - 如果文本不包含任何财务上下文，返回空数组。
       - 除非明确说明 "平局" 或 "0"，否则不要返回金额为 0 的记录。

    输入文本:
    "${text}"
    
    输出格式:
    返回一个标准的 JSON 对象，该对象必须包含一个名为 "records" 的键，其值为对象数组。
    不要包含 markdown 代码块（如 \`\`\`json）。只返回纯 JSON 字符串。
    
    示例输入: 
    "2.6 +800
    2.14 -190 雀神会"
    
    示例输出:
    {
      "records": [
        {"date": "${currentYear}-02-06", "amount": 800, "isWin": true, "note": "", "circleName": null},
        {"date": "${currentYear}-02-14", "amount": 190, "isWin": false, "note": "", "circleName": "雀神会"}
      ]
    }
  `;

  try {
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-V3",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        stream: false,
        max_tokens: 2048,
        temperature: 0.1,
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
    
    // Find the first '{' and last '}' to extract JSON object
    const firstCurly = jsonString.indexOf('{');
    const lastCurly = jsonString.lastIndexOf('}');
    
    if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
        jsonString = jsonString.substring(firstCurly, lastCurly + 1);
    }

    let data: any[] = [];
    try {
      const parsed = JSON.parse(jsonString);
      
      // Handle { "records": [...] } format (preferred)
      if (parsed.records && Array.isArray(parsed.records)) {
          data = parsed.records;
      } 
      // Handle direct array format (legacy fallback)
      else if (Array.isArray(parsed)) {
          data = parsed;
      }
      // Handle single object format (legacy fallback)
      else if (typeof parsed === 'object' && parsed !== null) {
          // If it looks like a record, wrap it
          if (parsed.amount !== undefined || parsed.isWin !== undefined) {
              data = [parsed];
          } else {
              // Maybe wrapped in another key?
              const keys = Object.keys(parsed);
              if (keys.length === 1 && Array.isArray(parsed[keys[0]])) {
                  data = parsed[keys[0]];
              }
          }
      }
    } catch (e) {
      console.warn('Failed to parse JSON:', e);
      // Try array fallback for some edge cases
      if (jsonString.startsWith('[') && jsonString.endsWith(']')) {
          try {
              data = JSON.parse(jsonString);
          } catch (e2) {
              throw e;
          }
      } else {
          throw e;
      }
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
