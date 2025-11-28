export interface FinancialMetric {
  label: string;
  value: number | string;
  unit?: string;
  change?: number; // percentage
  status?: 'good' | 'neutral' | 'bad';
}

export interface RiskFlag {
  id: string;
  severity: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  isCustom?: boolean;
}

export interface DimensionScore {
  subject: string; // e.g., Growth, Valuation
  A: number; // Company Score
  B: number; // Industry Average
  fullMark: number;
}

export interface TrendData {
  year: string;
  revenue: number;
  netProfit: number;
  cashFlow: number;
}

export interface CompanyData {
  ticker: string;
  name: string;
  industry: string;
  finSightScore: number;
  summary: string;
  metrics: Record<string, FinancialMetric>;
  dimensions: DimensionScore[];
  trends: TrendData[];
  risks: RiskFlag[];
  rawTextContext: string; // For Gemini to analyze
}

export enum ViewState {
  HOME,
  ANALYZING,
  DASHBOARD
}

// Personalization Types
export interface AlertConfig {
  id: string;
  metricKey: string;
  operator: 'gt' | 'lt';
  value: number;
  active: boolean;
}

export interface UserPreferences {
  weights: Record<string, number>; // Dimension Subject -> weight (0-100)
  activeMetrics: string[]; // Keys of metrics to display
  customAlerts: AlertConfig[];
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
}