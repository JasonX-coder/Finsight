import { UserPreferences } from './types';

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
