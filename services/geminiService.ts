import { GoogleGenAI } from "@google/genai";
import { CompanyData, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_ID = 'gemini-2.5-flash';

export const generateAIAnalysis = async (
  companyData: CompanyData, 
  userQuery?: string, 
  history: ChatMessage[] = []
): Promise<string> => {
  try {
    const context = `
      你是 FinSight AI，一位世界级的金融分析师。
      请分析以下 ${companyData.name} (${companyData.ticker}) 的财务数据。
      
      财务背景上下文:
      ${companyData.rawTextContext}
      
      核心指标:
      ${Object.entries(companyData.metrics).map(([key, val]) => `${val.label}: ${val.value}${val.unit || ''}`).join('\n')}
      FinSight 总分: ${companyData.finSightScore}/100
      
      当前风险点:
      ${companyData.risks.map(r => `- [${r.severity}] ${r.description}`).join('\n')}
    `;

    // Construct conversation history for the prompt
    let conversation = "";
    if (history.length > 0) {
      conversation = "对话历史:\n" + history.map(msg => 
        `${msg.role === 'user' ? '用户' : 'AI 分析师'}: ${msg.content}`
      ).join('\n\n') + "\n\n";
    }

    const prompt = userQuery 
      ? `${conversation}用户问题: "${userQuery}"\n请基于上述上下文回答。保持专业、简洁、有洞察力。请务必使用中文回答。`
      : `请提供一份全面的“深度投资摘要”。
         1. 强调核心增长驱动力。
         2. 评估利润率的可持续性。
         3. 给出最终投资建议（买入/持有/卖出理由）。
         输出为 Markdown 格式。控制在 250 字以内。请务必使用中文回答。`;

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: context + "\n\n" + prompt,
      config: {
        systemInstruction: "你是一位专家级金融分析师。使用专业金融术语但要通俗易懂。专注于数据驱动的洞察。请始终使用中文进行回答。",
        temperature: 0.7,
      }
    });

    return response.text || "暂时无法生成分析结果。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "暂时无法生成分析结果，请检查网络或 API 配额。";
  }
};