import { CompanyData, UserPreferences } from './types';

// Mock data representing a parsed result from a PDF annual report
export const MOCK_COMPANY_DATA: CompanyData = {
  ticker: "NVDA",
  name: "英伟达 (Nvidia Corporation)",
  industry: "半导体",
  finSightScore: 92,
  summary: "受AI数据中心需求驱动，公司展现出卓越的增长态势。毛利率显著扩张。尽管估值处于高位，但考虑到 PEG 比率，当前价格仍具合理性。",
  metrics: {
    roe: { label: "净资产收益率 (ROE)", value: 115.6, unit: "%", change: 45.2, status: 'good' },
    grossMargin: { label: "毛利率", value: 76.0, unit: "%", change: 12.5, status: 'good' },
    peRatio: { label: "市盈率 (TTM)", value: 72.4, unit: "x", change: -5.0, status: 'neutral' },
    debtToAsset: { label: "资产负债率", value: 32.1, unit: "%", change: 2.1, status: 'good' },
    netMargin: { label: "净利率", value: 55.2, unit: "%", change: 15.3, status: 'good' },
    currentRatio: { label: "流动比率", value: 3.5, unit: "x", change: 0.2, status: 'good' },
    freeCashFlow: { label: "自由现金流", value: 27.0, unit: "十亿$", change: 150.0, status: 'good' },
    revenueGrowth: { label: "营收增长率", value: 126.0, unit: "%", change: 80.0, status: 'good' }
  },
  dimensions: [
    { subject: '成长能力', A: 98, B: 65, fullMark: 100 },
    { subject: '盈利能力', A: 95, B: 55, fullMark: 100 },
    { subject: '估值水平', A: 40, B: 60, fullMark: 100 },
    { subject: '财务安全', A: 88, B: 70, fullMark: 100 },
    { subject: '现金流', A: 92, B: 50, fullMark: 100 },
    { subject: 'ESG评分', A: 75, B: 70, fullMark: 100 },
  ],
  trends: [
    { year: '2020', revenue: 16.68, netProfit: 4.33, cashFlow: 5.8 },
    { year: '2021', revenue: 26.91, netProfit: 9.75, cashFlow: 9.1 },
    { year: '2022', revenue: 26.97, netProfit: 4.37, cashFlow: 5.6 },
    { year: '2023', revenue: 60.92, netProfit: 29.76, cashFlow: 28.0 },
    { year: '2024', revenue: 96.31, netProfit: 55.20, cashFlow: 48.5 }, // Estimated/TTM
  ],
  risks: [
    { id: '1', severity: 'high', category: '估值风险', description: '市销率 (P/S) 处于历史高位 (35x)，远超行业平均水平。' },
    { id: '2', severity: 'medium', category: '客户集中度', description: '前五大客户贡献了约 45% 的营收，存在依赖风险。' },
    { id: '3', severity: 'low', category: '地缘政治', description: '出口管制政策可能持续影响中国区的数据中心业务收入。' },
  ],
  rawTextContext: `
    英伟达 (NVIDIA Corporation) 年度报告摘要。
    全年营收同比增长 126% 至 609 亿美元。
    数据中心业务营收增长 217%，达到 475 亿美元。
    GAAP 毛利率从去年的 56.9% 攀升至 72.7%。
    运营费用增长 13%。
    自由现金流达到 270 亿美元。
    主要风险因素包括 CoWoS 先进封装产能的供应链限制以及地缘政治出口管制。
    管理层对 2025 财年保持乐观展望，理由是 Hopper 架构产品的持续强劲需求。
  `
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  weights: {
    '成长能力': 50,
    '盈利能力': 50,
    '估值水平': 50,
    '财务安全': 50,
    '现金流': 50,
    'ESG评分': 50
  },
  activeMetrics: ['roe', 'grossMargin', 'peRatio', 'revenueGrowth'],
  customAlerts: []
};

export const SAMPLE_PROMPTS = [
  "解释 2023 年净利润突然飙升的原因。",
  "管理层讨论中提到的前三大风险是什么？",
  "对比一下研发投入趋势和营收增长的关系。"
];