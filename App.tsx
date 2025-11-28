import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ViewState, CompanyData, RiskFlag, FinancialMetric, UserPreferences, ChatMessage, AlertConfig } from './types';
import { MOCK_COMPANY_DATA, SAMPLE_PROMPTS, DEFAULT_PREFERENCES } from './constants';
import { generateAIAnalysis } from './services/geminiService';
import { AnalysisRadarChart, FinancialTrendChart } from './components/Charts';
import { IconSearch, IconUpload, IconAlert, IconSparkles, IconSettings, IconX, IconSend, IconPlus, IconTrash } from './components/Icons';

export default function App() {
  const [viewState, setViewState] = useState<ViewState>(ViewState.HOME);
  const [data, setData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  
  // Personalization State
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [showSettings, setShowSettings] = useState(false);
  const [customRisks, setCustomRisks] = useState<RiskFlag[]>([]);
  const [displayScore, setDisplayScore] = useState<number>(0);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived State: Active Metrics
  const activeMetricsList = useMemo(() => {
    if (!data) return [];
    return preferences.activeMetrics
      .map(key => data.metrics[key])
      .filter(Boolean);
  }, [data, preferences.activeMetrics]);

  // Effect: Recalculate Score based on Weights
  useEffect(() => {
    if (!data) return;
    
    const weights = preferences.weights;
    // Explicitly cast to number[] to ensure type safety and avoid 'unknown' type errors
    const totalWeight = (Object.values(weights) as number[]).reduce((a, b) => a + b, 0);
    
    if (totalWeight === 0) {
      setDisplayScore(data.finSightScore);
      return;
    }

    let weightedSum = 0;
    data.dimensions.forEach(dim => {
      const w = weights[dim.subject] || 50;
      weightedSum += dim.A * w;
    });

    setDisplayScore(Math.round(weightedSum / totalWeight));
  }, [preferences.weights, data]);

  // Effect: Check Custom Alerts
  useEffect(() => {
    if (!data) return;
    
    const newRisks: RiskFlag[] = [];
    preferences.customAlerts.forEach(alert => {
      if (!alert.active) return;
      const metric = data.metrics[alert.metricKey];
      if (!metric) return;
      
      // Clean value (remove non-numeric chars for comparison if needed, but assuming number in types)
      const val = typeof metric.value === 'number' ? metric.value : parseFloat(String(metric.value).replace(/[^0-9.-]+/g, ''));
      
      const isTriggered = alert.operator === 'gt' ? val > alert.value : val < alert.value;
      
      if (isTriggered) {
        newRisks.push({
          id: `custom-${alert.id}`,
          severity: 'high',
          category: '自定义预警',
          description: `${metric.label} 为 ${val}${metric.unit || ''} (${alert.operator === 'gt' ? '大于' : '小于'} ${alert.value})`,
          isCustom: true
        });
      }
    });
    setCustomRisks(newRisks);
  }, [preferences.customAlerts, data]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, aiThinking]);

  // Handlers
  const handleSearch = () => {
    if(!query) return;
    setLoading(true);
    setViewState(ViewState.ANALYZING);
    
    // Simulate API Fetch/Parsing Delay
    setTimeout(() => {
      setData(MOCK_COMPANY_DATA);
      setLoading(false);
      setViewState(ViewState.DASHBOARD);
      
      // Initial AI Welcome Message
      setChatMessages([{
        role: 'ai',
        content: `我已经分析了 ${MOCK_COMPANY_DATA.name}。该公司展现出卓越的增长，但目前的交易倍数较高。您想了解什么具体内容？`,
        timestamp: Date.now()
      }]);
    }, 2500);
  };

  const handleFileProcess = (file: File) => {
    setLoading(true);
    setViewState(ViewState.ANALYZING);
    
    // Simulate Parsing Delay
    setTimeout(() => {
      setData(MOCK_COMPANY_DATA);
      setLoading(false);
      setViewState(ViewState.DASHBOARD);
      
      setChatMessages([{
        role: 'ai',
        content: `已成功解析文件 "${file.name}"。\n基于 ${MOCK_COMPANY_DATA.name} 的数据，我发现其毛利率显著提升，但现金流状况需要留意。您可以随时询问具体的财务细节。`,
        timestamp: Date.now()
      }]);
    }, 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !data) return;
    
    const userMsg: ChatMessage = { role: 'user', content: chatInput, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setAiThinking(true);

    const responseText = await generateAIAnalysis(data, userMsg.content, [...chatMessages, userMsg]);
    
    const aiMsg: ChatMessage = { role: 'ai', content: responseText, timestamp: Date.now() };
    setChatMessages(prev => [...prev, aiMsg]);
    setAiThinking(false);
  };

  const handlePromptClick = (prompt: string) => {
    setChatInput(prompt);
    // Optional: auto-send
    // handleSendMessage(); 
  };

  // --- Settings Modal Logic ---
  const handleWeightChange = (subject: string, val: number) => {
    setPreferences(prev => ({
      ...prev,
      weights: { ...prev.weights, [subject]: val }
    }));
  };

  const toggleMetric = (key: string) => {
    setPreferences(prev => {
      if (prev.activeMetrics.includes(key)) {
        return { ...prev, activeMetrics: prev.activeMetrics.filter(k => k !== key) };
      } else {
        if (prev.activeMetrics.length >= 4) return prev; // Max 4
        return { ...prev, activeMetrics: [...prev.activeMetrics, key] };
      }
    });
  };

  const addAlert = () => {
    const newAlert: AlertConfig = {
      id: Date.now().toString(),
      metricKey: 'peRatio',
      operator: 'gt',
      value: 30,
      active: true
    };
    setPreferences(prev => ({ ...prev, customAlerts: [...prev.customAlerts, newAlert] }));
  };

  const updateAlert = (id: string, field: keyof AlertConfig, value: any) => {
    setPreferences(prev => ({
      ...prev,
      customAlerts: prev.customAlerts.map(a => a.id === id ? { ...a, [field]: value } : a)
    }));
  };

  const removeAlert = (id: string) => {
    setPreferences(prev => ({ ...prev, customAlerts: prev.customAlerts.filter(a => a.id !== id) }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white relative">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setViewState(ViewState.HOME)}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="font-bold text-white text-lg">F</span>
            </div>
            <span className="text-xl font-bold tracking-tight">FinSight 财智眼</span>
          </div>
          
          {viewState === ViewState.DASHBOARD && (
             <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-full px-4 py-1.5 w-96">
                <IconSearch className="w-4 h-4 text-slate-500 mr-2" />
                <input 
                  type="text" 
                  placeholder="搜索其他股票代码..." 
                  className="bg-transparent border-none outline-none text-sm w-full text-slate-200 placeholder-slate-500"
                />
             </div>
          )}

          <div className="flex items-center gap-4">
            {viewState === ViewState.DASHBOARD && (
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-full hover:bg-slate-800 transition-colors"
                title="自定义面板"
              >
                <IconSettings className="w-5 h-5" />
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-medium">
              JD
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        
        {/* HOME VIEW */}
        {viewState === ViewState.HOME && (
          <div className="max-w-3xl mx-auto mt-20 text-center space-y-8 animate-fade-in-up">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
                一眼看穿财报，<br/>十秒读懂公司。
              </h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                AI 驱动的年报深度分析。将 200 页复杂的财务报告转化为关键洞察。支持个性化评分模型与实时 AI 深度问答。
              </p>
            </div>

            <div className="p-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 rounded-2xl shadow-2xl shadow-blue-500/20 max-w-2xl mx-auto">
              <div className="bg-slate-950 rounded-xl p-6 space-y-6">
                <div className="relative">
                  <input 
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="输入股票代码 (如: 600519, NVDA, 腾讯)..." 
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-5 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-slate-600"
                  />
                  <div className="absolute right-3 top-3">
                    <button 
                      onClick={handleSearch}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
                    >
                      开始分析 <IconSearch className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-6">
                  <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      className="flex items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors border border-dashed border-slate-700 hover:border-blue-500 rounded-lg px-8 py-6 w-full justify-center group"
                    >
                      <IconUpload className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      <span>点击或拖拽上传财报 PDF 文件</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 text-sm text-slate-500">
              <span>热门搜索:</span>
              <span className="cursor-pointer hover:text-blue-400 transition-colors bg-slate-900 px-2 py-1 rounded border border-slate-800">贵州茅台</span>
              <span className="cursor-pointer hover:text-blue-400 transition-colors bg-slate-900 px-2 py-1 rounded border border-slate-800">英伟达</span>
              <span className="cursor-pointer hover:text-blue-400 transition-colors bg-slate-900 px-2 py-1 rounded border border-slate-800">阿里巴巴</span>
            </div>
          </div>
        )}

        {/* ANALYZING VIEW */}
        {viewState === ViewState.ANALYZING && (
          <div className="flex flex-col items-center justify-center mt-32 space-y-6">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
              <IconSparkles className="absolute inset-0 m-auto w-8 h-8 text-blue-400 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-white">正在解析财务结构...</h3>
              <p className="text-slate-400">正在通过 AI 提取表格数据、审计附注并计算关键财务比率。</p>
            </div>
            <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-blue-500 animate-progress origin-left"></div>
            </div>
          </div>
        )}

        {/* DASHBOARD VIEW */}
        {viewState === ViewState.DASHBOARD && data && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in pb-12">
            
            {/* Left Column: Key Stats & Radar (4 Cols) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* FinSight Score Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <IconSparkles className="w-32 h-32 text-blue-500" />
                </div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-3xl font-bold text-white">{data.ticker}</h2>
                      <p className="text-slate-400 text-sm">{data.name}</p>
                    </div>
                    <div className="text-right">
                       <span className="text-xs font-bold text-blue-400 uppercase tracking-wider bg-blue-500/10 px-2 py-1 rounded">FinSight 总分</span>
                    </div>
                  </div>
                  
                  <div className="flex items-end gap-2 mt-2">
                    <span className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                      {displayScore}
                    </span>
                    <span className="text-xl text-slate-500 mb-2">/100</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-2">
                    行业排名前 1%。基于您的个性化模型权重计算。
                  </p>
                </div>
              </div>

              {/* Radar Chart */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-[340px]">
                <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">能力雷达图</h3>
                <div className="h-[260px] w-full">
                  <AnalysisRadarChart data={data.dimensions} />
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                {activeMetricsList.map((metric, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 transition-all hover:bg-slate-800/50">
                    <p className="text-xs text-slate-500 uppercase">{metric.label}</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-bold text-white">{metric.value}</span>
                      <span className="text-xs text-slate-400">{metric.unit}</span>
                    </div>
                    <div className={`text-xs mt-2 font-medium ${metric.change && metric.change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {metric.change && metric.change > 0 ? '+' : ''}{metric.change}% 同比
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => setShowSettings(true)}
                  className="bg-slate-950 border border-dashed border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 hover:text-blue-400 hover:border-blue-500/50 transition-colors"
                >
                  <IconSettings className="w-6 h-6 mb-1" />
                  <span className="text-xs">自定义指标</span>
                </button>
              </div>
            </div>

            {/* Middle Column: Analysis & Trends (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Financial Trends */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-[320px]">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">业绩趋势</h3>
                   <div className="flex gap-2">
                      <div className="flex items-center gap-1 text-xs text-slate-400"><div className="w-2 h-2 rounded-full bg-blue-500"></div>营收</div>
                      <div className="flex items-center gap-1 text-xs text-slate-400"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>净利</div>
                   </div>
                </div>
                <div className="h-[220px] w-full">
                  <FinancialTrendChart data={data.trends} />
                </div>
              </div>

              {/* AI Chat Interface */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[500px] relative overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-900/95 flex items-center gap-2">
                  <IconSparkles className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-white">AI 深度问答</h3>
                </div>
                
                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-slate-800 text-slate-200 rounded-bl-none whitespace-pre-wrap'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {aiThinking && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-none flex gap-1">
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Suggested Prompts */}
                {chatMessages.length < 3 && (
                  <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
                     {SAMPLE_PROMPTS.map((prompt, i) => (
                      <button 
                        key={i}
                        onClick={() => handlePromptClick(prompt)}
                        className="whitespace-nowrap text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full transition-colors border border-slate-700"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input Area */}
                <div className="p-4 bg-slate-900/95 border-t border-slate-800">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="询问关于毛利率、风险点或战略方向的问题..." 
                      className="w-full bg-slate-950 border border-slate-700 rounded-full pl-5 pr-12 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || aiThinking}
                      className="absolute right-2 top-2 p-1.5 bg-blue-600 rounded-full text-white hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                    >
                      <IconSend className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Risks & Actions (3 Cols) */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Risk Warnings */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <IconAlert className="w-5 h-5 text-rose-500" />
                  <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">风险监控</h3>
                </div>
                <div className="space-y-3">
                  {[...customRisks, ...data.risks].map((risk) => (
                    <div key={risk.id} className={`p-3 rounded-lg border ${
                      risk.isCustom ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-slate-950/50 border-slate-800/50'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-bold ${risk.isCustom ? 'text-indigo-400' : 'text-slate-300'}`}>
                          {risk.category}
                        </span>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          risk.severity === 'high' ? 'bg-rose-500/20 text-rose-400' : 
                          risk.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'
                        }`}>
                          {risk.severity === 'high' ? '高风险' : risk.severity === 'medium' ? '中风险' : '低风险'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-snug">
                        {risk.description}
                      </p>
                    </div>
                  ))}
                  {customRisks.length === 0 && data.risks.length === 0 && (
                     <p className="text-xs text-slate-500 italic">未检测到重大风险。</p>
                  )}
                </div>
              </div>

               {/* Quick Actions */}
               <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-900/20">
                  <h3 className="font-bold text-lg mb-2">导出研报</h3>
                  <p className="text-sm text-blue-100 mb-4 opacity-90">基于当前分析生成一份详尽的 PDF 投资备忘录。</p>
                  <button className="w-full bg-white text-blue-600 font-bold py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors text-sm">
                    下载 PDF
                  </button>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* SETTINGS MODAL */}
      {showSettings && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <IconSettings className="w-5 h-5 text-blue-500" />
                 个性化分析设置
               </h2>
               <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white transition-colors">
                 <IconX className="w-6 h-6" />
               </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-8">
              
              {/* Section 1: Model Weights */}
              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">模型权重 (影响总分)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {data.dimensions.map(dim => (
                    <div key={dim.subject} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>{dim.subject}</span>
                        <span>{preferences.weights[dim.subject] || 50}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" step="10"
                        value={preferences.weights[dim.subject] || 50}
                        onChange={(e) => handleWeightChange(dim.subject, parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Active Metrics */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">看板核心指标 (选4个)</h3>
                  <span className="text-xs text-slate-500">已选 {preferences.activeMetrics.length}/4</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.keys(data.metrics).map(key => (
                    <button
                      key={key}
                      onClick={() => toggleMetric(key)}
                      className={`text-xs px-3 py-2 rounded-lg border transition-all ${
                        preferences.activeMetrics.includes(key)
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {data.metrics[key].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 3: Custom Alerts */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">自定义预警</h3>
                  <button onClick={addAlert} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors">
                    <IconPlus className="w-3 h-3" /> 添加预警
                  </button>
                </div>
                <div className="space-y-2">
                   {preferences.customAlerts.map((alert) => (
                     <div key={alert.id} className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                       <select 
                        value={alert.metricKey}
                        onChange={(e) => updateAlert(alert.id, 'metricKey', e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-blue-500"
                       >
                         {Object.keys(data.metrics).map(k => (
                           <option key={k} value={k}>{data.metrics[k].label}</option>
                         ))}
                       </select>
                       
                       <select
                        value={alert.operator}
                        onChange={(e) => updateAlert(alert.id, 'operator', e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-blue-500"
                       >
                         <option value="gt">大于</option>
                         <option value="lt">小于</option>
                       </select>

                       <input 
                         type="number"
                         value={alert.value}
                         onChange={(e) => updateAlert(alert.id, 'value', parseFloat(e.target.value))}
                         className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 w-20 outline-none focus:border-blue-500"
                       />
                       
                       <div className="flex-1"></div>
                       <button onClick={() => removeAlert(alert.id)} className="text-rose-500 hover:text-rose-400 p-1">
                         <IconTrash className="w-4 h-4" />
                       </button>
                     </div>
                   ))}
                   {preferences.customAlerts.length === 0 && (
                     <p className="text-xs text-slate-500 italic">未配置自定义预警。</p>
                   )}
                </div>
              </div>

            </div>
            
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
              <button 
                onClick={() => setShowSettings(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}