import { GoogleGenAI } from "@google/genai";
import { CompanyData, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_ID = 'gemini-2.5-flash';

// Helper to clean JSON string from Markdown code blocks
const cleanJsonString = (text: string): string => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// Define the expected structure for the AI to fill
const DATA_STRUCTURE_PROMPT = `
请严格按照以下 JSON 格式返回数据。不要包含任何 Markdown 格式化（如 \`\`\`json）。
必须返回纯 JSON 字符串。所有文本内容必须使用中文。

JSON 结构要求：
{
  "ticker": "股票代码",
  "name": "公司名称",
  "industry": "所属行业",
  "finSightScore": 0-100之间的整数评分,
  "summary": "一段简短的财务状况总结（100字以内）",
  "metrics": {
    "roe": { "label": "净资产收益率 (ROE)", "value": 数值(保留1位小数), "unit": "%", "change": 同比变化百分比(数值), "status": "good"|"neutral"|"bad" },
    "grossMargin": { "label": "毛利率", "value": 数值, "unit": "%", "change": 数值, "status": "good"|"neutral"|"bad" },
    "peRatio": { "label": "市盈率 (TTM)", "value": 数值, "unit": "x", "change": 数值, "status": "good"|"neutral"|"bad" },
    "debtToAsset": { "label": "资产负债率", "value": 数值, "unit": "%", "change": 数值, "status": "good"|"neutral"|"bad" },
    "netMargin": { "label": "净利率", "value": 数值, "unit": "%", "change": 数值, "status": "good"|"neutral"|"bad" },
    "currentRatio": { "label": "流动比率", "value": 数值, "unit": "x", "change": 数值, "status": "good"|"neutral"|"bad" },
    "freeCashFlow": { "label": "自由现金流", "value": 数值, "unit": "亿", "change": 数值, "status": "good"|"neutral"|"bad" },
    "revenueGrowth": { "label": "营收增长率", "value": 数值, "unit": "%", "change": 数值, "status": "good"|"neutral"|"bad" }
  },
  "dimensions": [
    { "subject": "成长能力", "A": 0-100评分, "B": 行业平均分(0-100), "fullMark": 100 },
    { "subject": "盈利能力", "A": 0-100评分, "B": 行业平均分(0-100), "fullMark": 100 },
    { "subject": "估值水平", "A": 0-100评分, "B": 行业平均分(0-100), "fullMark": 100 },
    { "subject": "财务安全", "A": 0-100评分, "B": 行业平均分(0-100), "fullMark": 100 },
    { "subject": "现金流", "A": 0-100评分, "B": 行业平均分(0-100), "fullMark": 100 },
    { "subject": "ESG评分", "A": 0-100评分, "B": 行业平均分(0-100), "fullMark": 100 }
  ],
  "trends": [
    // 过去5年的数据，如果无法获取全部，请根据现有数据估算或填入最接近的数据
    { "year": "2020", "revenue": 营收数值(亿), "netProfit": 净利润数值(亿), "cashFlow": 现金流数值(亿) },
    { "year": "2021", "revenue": 数值, "netProfit": 数值, "cashFlow": 数值 },
    { "year": "2022", "revenue": 数值, "netProfit": 数值, "cashFlow": 数值 },
    { "year": "2023", "revenue": 数值, "netProfit": 数值, "cashFlow": 数值 },
    { "year": "2024", "revenue": 数值, "netProfit": 数值, "cashFlow": 数值 }
  ],
  "risks": [
    { "id": "1", "severity": "high"|"medium"|"low", "category": "风险类别", "description": "风险描述" },
    { "id": "2", "severity": "high"|"medium"|"low", "category": "风险类别", "description": "风险描述" },
    { "id": "3", "severity": "high"|"medium"|"low", "category": "风险类别", "description": "风险描述" }
  ],
  "rawTextContext": "在此处保留你分析使用过的关键原文摘要，用于后续问答上下文。"
}
`;

/**
 * Fetch company data using Google Search Grounding (for Ticker search)
 */
export const fetchCompanyData = async (query: string): Promise<CompanyData> => {
  try {
    const prompt = `
      请搜索关于 "${query}" (股票代码或公司名) 的最新财务报告数据（优先使用2023年报或2024最新季报）。
      
      任务：
      1. 搜索该公司的最新财务核心指标、营收趋势、风险因素。
      2. 像一位专业的金融分析师一样，对数据进行结构化整理。
      3. 估算 FinSight 评分 (0-100)，基于其财务健康状况。
      4. ${DATA_STRUCTURE_PROMPT}
    `;

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2, // Low temperature for more deterministic data extraction
      }
    });

    const text = response.text || "";
    const jsonStr = cleanJsonString(text);
    
    // Attempt to parse
    try {
      const data = JSON.parse(jsonStr) as CompanyData;
      // Ensure specific fields exist
      if (!data.metrics || !data.ticker) {
        throw new Error("Incomplete data generated");
      }
      return data;
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Raw Text:", text);
      throw new Error("AI 无法生成有效的 JSON 数据，请重试。");
    }

  } catch (error) {
    console.error("Fetch Data Error:", error);
    throw error;
  }
};

/**
 * Parse uploaded financial report (PDF/Text)
 */
export const parseFinancialFile = async (fileBase64: string, mimeType: string): Promise<CompanyData> => {
  try {
    const prompt = `
      你是一个智能财报解析引擎。请阅读提供的文档内容，提取关键财务数据。
      
      任务：
      1. 识别文档中的公司名称、年份。
      2. 提取资产负债表、利润表的关键数据。
      3. 分析管理层讨论与分析 (MD&A) 部分的风险点。
      4. ${DATA_STRUCTURE_PROMPT}
    `;

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: fileBase64
            }
          },
          { text: prompt }
        ]
      }
    });

    const text = response.text || "";
    const jsonStr = cleanJsonString(text);

    try {
      const data = JSON.parse(jsonStr) as CompanyData;
      return data;
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Raw Text:", text);
      throw new Error("AI 无法解析文件内容，可能是文件格式不支持或内容无法提取。");
    }

  } catch (error) {
    console.error("File Parse Error:", error);
    throw error;
  }
};

/**
 * Chat with the analyzed data
 */
export const generateAIAnalysis = async (
  companyData: CompanyData, 
  userQuery?: string, 
  history: ChatMessage[] = []
): Promise<string> => {
  try {
    const context = `
      你是 FinSight AI，一位世界级的金融分析师。
      你正在分析 ${companyData.name} (${companyData.ticker}) 的数据。
      
      [核心数据]
      FinSight 总分: ${companyData.finSightScore}
      财务摘要: ${companyData.summary}
      
      [关键指标]
      ${Object.entries(companyData.metrics).map(([k, v]) => `${v.label}: ${v.value}${v.unit}`).join(', ')}
      
      [原文上下文摘要]
      ${companyData.rawTextContext}
    `;

    let conversation = "";
    if (history.length > 0) {
      conversation = "对话历史:\n" + history.map(msg => 
        `${msg.role === 'user' ? '用户' : 'AI 分析师'}: ${msg.content}`
      ).join('\n\n') + "\n\n";
    }

    const prompt = userQuery 
      ? `${conversation}用户问题: "${userQuery}"\n请基于上述财务数据回答。用中文，专业且简练。`
      : `请用中文简要点评该公司的投资价值。`;

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: context + "\n\n" + prompt,
      config: {
        temperature: 0.7,
      }
    });

    return response.text || "暂时无法生成回答。";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "AI 服务暂时不可用。";
  }
};
