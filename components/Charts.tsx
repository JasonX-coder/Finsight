import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { DimensionScore, TrendData } from '../types';

interface RadarProps {
  data: DimensionScore[];
}

export const AnalysisRadarChart: React.FC<RadarProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke="#475569" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <Radar
          name="公司得分"
          dataKey="A"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="#3b82f6"
          fillOpacity={0.4}
        />
        <Radar
          name="行业平均"
          dataKey="B"
          stroke="#10b981"
          strokeWidth={2}
          fill="#10b981"
          fillOpacity={0.1}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
          itemStyle={{ color: '#e2e8f0' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

interface TrendsProps {
  data: TrendData[];
}

export const FinancialTrendChart: React.FC<TrendsProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
          itemStyle={{ fontSize: '12px' }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
        <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" name="营收 ($B)" />
        <Area type="monotone" dataKey="netProfit" stroke="#10b981" fillOpacity={1} fill="url(#colorNet)" name="净利润 ($B)" />
      </AreaChart>
    </ResponsiveContainer>
  );
};