
import React, { useState, useEffect } from 'react';
import { Loader2, Zap, TrendingUp, FileSearch, Bot, Sparkles, Copy, AlertCircle, Globe, LineChart, SearchCode, Link as LinkIcon, CheckCircle2, AlertTriangle, XCircle, BarChart4, History, Trophy, ListTodo, ArrowUpRight, ArrowDownRight, Lightbulb, ArrowRight, BrainCircuit, Activity, Settings, Key, ShieldCheck, RefreshCw, FileText, Code, CheckSquare, Settings2, FileSignature, Anchor } from 'lucide-react';
import { fetchKeywordAnalysis, analyzeArticleTitle, fetchAIOverviewAnalysis, fetchRelatedKeywords, analyzeURLDiagnosis, analyzeGSCReport } from './services/geminiService';
import { AnalysisResult, LoadingState, ViewMode, AIOverviewResult, AuditStatus, TitleDiagnosis, PageAuditResult } from './types';
import { KeywordCard } from './components/KeywordCard';

const App: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('trending');
  const [dataA, setDataA] = useState({ clicks: '', impressions: '', ctr: '', rank: '' });
  const [dataB, setDataB] = useState({ clicks: '', impressions: '', ctr: '', rank: '' });
  
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [showKeySettings, setShowKeySettings] = useState(false);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [diagnosisResult, setDiagnosisResult] = useState<TitleDiagnosis | null>(null);
  const [auditResult, setAuditResult] = useState<PageAuditResult | null>(null);
  const [aioResult, setAioResult] = useState<AIOverviewResult | null>(null);
  const [impactData, setImpactData] = useState<any | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [error, setError] = useState<React.ReactNode | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('GEMINI_API_KEY');
    if (saved) {
      setApiKeyInput(saved);
      setIsKeySaved(true);
    } else {
      setShowKeySettings(true); 
    }
  }, []);

  const saveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('GEMINI_API_KEY', apiKeyInput.trim());
      setIsKeySaved(true);
      setShowKeySettings(false);
      setError(null);
    }
  };

  const clearResults = () => {
    setResult(null); setDiagnosisResult(null); setAuditResult(null); setAioResult(null); setImpactData(null); setError(null);
  };

  const performSearch = async () => {
    if (!isKeySaved) {
      setError("請先在設定中輸入並儲存 API Key。");
      setShowKeySettings(true);
      return;
    }
    if (!topic && viewMode !== 'impact') return;
    setLoadingState(LoadingState.LOADING);
    clearResults();
    try {
      switch (viewMode) {
        case 'trending': setResult(await fetchKeywordAnalysis(topic)); break;
        case 'related': setResult(await fetchRelatedKeywords(topic)); break;
        case 'low_ctr': setDiagnosisResult(await analyzeArticleTitle(topic)); break;
        case 'ai_overview': setAioResult(await fetchAIOverviewAnalysis(topic)); break;
        case 'gsc_page': setAuditResult(await analyzeURLDiagnosis(topic)); break;
        case 'impact': setImpactData(await analyzeGSCReport(dataA, dataB)); break;
      }
      setLoadingState(LoadingState.SUCCESS);
    } catch (err: any) {
      setLoadingState(LoadingState.ERROR);
      setError(err.message || "分析失敗，請檢查 API Key 或網路。");
    }
  };

  const viewConfig = {
    trending: { title: "搜尋趨勢", desc: "市場爆紅關鍵字 (6-8項)", icon: <TrendingUp size={20} />, color: "bg-blue-600", button: "分析趨勢" },
    related: { title: "機會關鍵字", desc: "延伸潛力長尾詞 (避開主詞)", icon: <LinkIcon size={20} />, color: "bg-indigo-600", button: "尋找機會" },
    ai_overview: { title: "AI 內容策略", desc: "SGE 佈局、FAQ 與 Schema", icon: <Bot size={20} />, color: "bg-violet-600", button: "生成策略" },
    low_ctr: { title: "標題 CTR 診斷", desc: "診斷報告與 3 項標題建議", icon: <SearchCode size={20} />, color: "bg-red-600", button: "診斷標題" },
    gsc_page: { title: "EEAT 品質診斷", desc: "深度權威評估與內容優化", icon: <FileSearch size={20} />, color: "bg-emerald-600", button: "開始診斷" },
    impact: { title: "成效監測", desc: "數據指標對比與高精確度優化任務", icon: <LineChart size={20} />, color: "bg-slate-900", button: "分析成效" }
  };

  const currentConfig = viewConfig[viewMode];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center space-x-2">
          <div className={`${currentConfig.color} rounded-lg p-1.5`}><Zap size={18} className="text-white" /></div>
          <h1 className="font-bold text-xl text-slate-900 tracking-tight">SEO Striker</h1>
        </div>
        <button onClick={() => setShowKeySettings(!showKeySettings)} className={`p-2 rounded-full transition-all ${isKeySaved ? 'text-green-600 bg-green-50' : 'text-slate-400 bg-slate-100'}`}>
           <Settings size={20} />
        </button>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4">
        {showKeySettings && (
          <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl mb-6 border border-slate-800 animate-fade-in">
             <div className="flex items-center gap-2 mb-3">
                <Key size={16} className="text-amber-400" />
                <h3 className="text-sm font-black tracking-widest text-amber-400 uppercase">Gemini API 設定</h3>
             </div>
             <div className="flex gap-2">
                <input type="password" placeholder="貼上 API Key..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs outline-none focus:border-amber-500" value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} />
                <button onClick={saveApiKey} className="bg-amber-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-black">儲存</button>
             </div>
          </div>
        )}

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">{currentConfig.icon} {currentConfig.title}</h2>
          <p className="text-slate-400 text-xs mb-4">{currentConfig.desc}</p>
          <div className="space-y-4">
            {viewMode === 'impact' ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-1"><History size={10}/> 優化前 (Before)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="點擊" className="p-2.5 bg-white rounded-xl text-xs border border-slate-200" value={dataA.clicks} onChange={e => setDataA({...dataA, clicks: e.target.value})} />
                    <input type="number" placeholder="曝光" className="p-2.5 bg-white rounded-xl text-xs border border-slate-200" value={dataA.impressions} onChange={e => setDataA({...dataA, impressions: e.target.value})} />
                    <input type="text" placeholder="點閱率%" className="p-2.5 bg-white rounded-xl text-xs border border-slate-200" value={dataA.ctr} onChange={e => setDataA({...dataA, ctr: e.target.value})} />
                    <input type="number" placeholder="排名" className="p-2.5 bg-white rounded-xl text-xs border border-slate-200" value={dataA.rank} onChange={e => setDataA({...dataA, rank: e.target.value})} />
                  </div>
                </div>
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase mb-3 flex items-center gap-1"><Sparkles size={10}/> 優化後 (After)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="點擊" className="p-2.5 bg-white rounded-xl text-xs border border-slate-200" value={dataB.clicks} onChange={e => setDataB({...dataB, clicks: e.target.value})} />
                    <input type="number" placeholder="曝光" className="p-2.5 bg-white rounded-xl text-xs border border-slate-200" value={dataB.impressions} onChange={e => setDataB({...dataB, impressions: e.target.value})} />
                    <input type="text" placeholder="點閱率%" className="p-2.5 bg-white rounded-xl text-xs border border-slate-200" value={dataB.ctr} onChange={e => setDataB({...dataB, ctr: e.target.value})} />
                    <input type="number" placeholder="排名" className="p-2.5 bg-white rounded-xl text-xs border border-slate-200" value={dataB.rank} onChange={e => setDataB({...dataB, rank: e.target.value})} />
                  </div>
                </div>
              </div>
            ) : (
              <textarea rows={4} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="輸入主題、關鍵字或網頁內容..." className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none text-base font-bold resize-none transition-all" />
            )}
            <button onClick={performSearch} disabled={loadingState === LoadingState.LOADING} className={`w-full py-4 ${currentConfig.color} text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2`}>
              {loadingState === LoadingState.LOADING ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />} {currentConfig.button}
            </button>
          </div>
        </div>

        {error && <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 text-xs text-amber-900 font-bold flex items-start gap-2 animate-fade-in"><AlertCircle size={16} className="shrink-0" /> {error}</div>}

        <div className="space-y-6 pb-20">
          {impactData && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-slate-900 text-white p-5 rounded-3xl flex items-center justify-between"><h3 className="font-black">分析報告已生成</h3><BarChart4 size={24} className="opacity-30" /></div>
              
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-4">核心指標變化</p>
                <div className="space-y-2">
                  {impactData.growthMetrics?.map((metric: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl">
                      <div><p className="text-[10px] font-black text-slate-400">{metric.label}</p><div className="flex items-center gap-2"><span className="text-xs text-slate-400 line-through">{metric.before}</span><span className="text-sm font-black text-slate-900">{metric.after}</span></div></div>
                      <div className={`flex items-center gap-1 font-black text-sm ${metric.isPositive ? 'text-green-600' : 'text-red-600'}`}>{metric.isPositive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}{metric.growth}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-600 text-white p-5 rounded-3xl"><p className="text-[10px] font-black text-blue-200 uppercase mb-3">數據趨勢洞察</p><div className="space-y-2">{impactData.dataAnalysis?.map((item: string, i: number) => <p key={i} className="text-xs font-bold leading-relaxed">• {item}</p>)}</div></div>
              
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><CheckSquare size={12}/> 高精確度執行計畫 (Action Plan)</p>
                {impactData.actionTasks && impactData.actionTasks.length > 0 ? impactData.actionTasks.map((task: any, i: number) => (
                  <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4 animate-fade-in" style={{animationDelay: `${i * 100}ms`}}>
                    <div className="flex justify-between items-start border-b border-slate-50 pb-2">
                      <h4 className="text-sm font-black text-slate-900">{i+1}. {task.taskTitle}</h4>
                      <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 rounded uppercase tracking-tighter">Target: {task.targetMetric}</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="bg-amber-100/50 p-1.5 rounded-lg h-fit"><Settings2 size={12} className="text-amber-600" /></div>
                        <div><p className="text-[9px] font-black text-amber-600 uppercase mb-0.5">技術層面 (HTML/Technical)</p><p className="text-[11px] text-slate-600 font-bold leading-relaxed">{task.technicalTask}</p></div>
                      </div>
                      <div className="flex gap-3">
                        <div className="bg-blue-100/50 p-1.5 rounded-lg h-fit"><FileSignature size={12} className="text-blue-600" /></div>
                        <div><p className="text-[9px] font-black text-blue-600 uppercase mb-0.5">內容增補 (Keywords/Content)</p><p className="text-[11px] text-slate-600 font-bold leading-relaxed">{task.contentTask}</p></div>
                      </div>
                      <div className="flex gap-3">
                        <div className="bg-emerald-100/50 p-1.5 rounded-lg h-fit"><Anchor size={12} className="text-emerald-600" /></div>
                        <div><p className="text-[9px] font-black text-emerald-600 uppercase mb-0.5">結構路徑 (Linking/Anchor)</p><p className="text-[11px] text-slate-600 font-bold leading-relaxed">{task.linkTask}</p></div>
                      </div>
                    </div>
                  </div>
                )) : (
                   <div className="p-8 text-center bg-white rounded-3xl border border-slate-100"><Loader2 size={24} className="animate-spin text-slate-300 mx-auto mb-2" /><p className="text-xs text-slate-400 font-bold">正在整理精確任務建議...</p></div>
                )}
              </div>
            </div>
          )}

          {diagnosisResult && (
            <div className="animate-fade-in space-y-4">
              <div className="bg-red-600 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between">
                <div><h3 className="text-xl font-black">標題診斷結果</h3><div className="flex gap-3 mt-2"><span className="text-[10px] font-black px-2 py-0.5 bg-white/20 rounded">SEO: {diagnosisResult.scores?.seo ?? 0}</span><span className="text-[10px] font-black px-2 py-0.5 bg-white/20 rounded">CTR: {diagnosisResult.scores?.ctr ?? 0}</span></div></div>
                <SearchCode size={32} className="opacity-20" />
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-xs font-bold text-slate-700 leading-relaxed mb-6">{diagnosisResult.diagnosis}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-3">三項點擊率優化建議標題</p>
                <div className="space-y-3">
                  {diagnosisResult.suggestedTitles?.map((title, i) => (
                    <div key={i} className="group p-4 bg-blue-50 border border-blue-100 rounded-2xl flex justify-between items-center active:scale-[0.98] transition-all"><span className="text-xs font-black text-blue-900 pr-4 flex-1">{title}</span><button onClick={() => navigator.clipboard.writeText(title)} className="p-2 bg-white text-blue-600 rounded-xl shadow-sm"><Copy size={14} /></button></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="animate-fade-in space-y-4">
              <div className={`${currentConfig.color} text-white p-6 rounded-3xl shadow-xl`}><h3 className="text-xl font-black">{result.topic}</h3></div>
              <div className="space-y-3">{result.keywords?.map((k, i) => <KeywordCard key={i} data={k} showDiagnosis={viewMode === 'trending'} />)}</div>
            </div>
          )}

          {aioResult && (
            <div className="animate-fade-in space-y-4">
              <div className="bg-violet-600 text-white p-5 rounded-3xl flex items-center justify-between"><h3 className="font-black">AI Overview 策略佈局</h3><Bot size={24} className="opacity-30" /></div>
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-1"><Sparkles size={12}/> 意圖關鍵字佈局</p>
                <div className="flex flex-wrap gap-2 mb-6">{aioResult.intentKeywords?.map((kw, i) => <span key={i} className="px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-[10px] font-bold border border-violet-100">{kw}</span>)}</div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-1"><FileText size={12}/> 建議 FAQ 問答集</p>
                <div className="space-y-3 mb-6">
                  {aioResult.faqs?.map((faq, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-xs font-black mb-1">Q: {faq.question}</p><p className="text-[11px] text-slate-600 font-bold leading-relaxed">{faq.answer}</p></div>
                  ))}
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-1"><Code size={12}/> Schema 結構化資料 (建議插入)</p>
                <pre className="bg-slate-900 text-blue-400 p-4 rounded-xl text-[10px] overflow-x-auto no-scrollbar font-mono leading-relaxed">{aioResult.schemaCode}</pre>
              </div>
            </div>
          )}

          {auditResult && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between"><div><h3 className="text-2xl font-black">{auditResult.score} / 100</h3><p className="text-emerald-100 text-[10px] font-bold">SEO 品質權威診斷</p></div><Trophy size={40} className="opacity-30" /></div>
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-500"/> EEAT 四維度詳細評估</p>
                 <div className="grid grid-cols-2 gap-3 mb-6">
                    {['experience', 'expertise', 'authority', 'trust'].map((key) => (
                      <div key={key} className="bg-slate-50 p-3 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">{key}</p><p className="text-[10px] text-slate-700 font-bold leading-snug">{auditResult.eeatAdvice[key as keyof typeof auditResult.eeatAdvice]}</p></div>
                    ))}
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2"><ListTodo size={12} className="text-emerald-500"/> 內容優化優先動作</p>
                 <div className="space-y-4 mb-6">
                   {auditResult.specificActions?.map((item, i) => (
                     <div key={i} className="border-l-4 border-emerald-500 pl-4 space-y-1"><p className="text-sm font-black text-slate-900 leading-tight">{i + 1}. {item.keyword}</p><p className="text-[11px] font-black text-emerald-600 uppercase tracking-tighter">建議排名 #{item.rank}</p><p className="text-xs text-slate-600 font-bold leading-relaxed">{item.action}</p></div>
                   ))}
                 </div>
                 <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                   <p className="text-[10px] font-black text-blue-500 uppercase mb-2">統計數據</p>
                   <div className="grid grid-cols-2 gap-4"><div className="text-[10px] font-bold text-slate-600">總字數：{auditResult.stats.wordCount} 字</div><div className="text-[10px] font-bold text-slate-600">預估閱讀時間：{auditResult.stats.readingTime} 分鐘</div></div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-100 pb-safe shadow-lg z-40">
        <div className="max-w-md mx-auto grid grid-cols-6 px-1 py-2">
          {['trending', 'related', 'ai_overview', 'low_ctr', 'gsc_page', 'impact'].map((mode) => (
            <button key={mode} onClick={() => { setViewMode(mode as ViewMode); clearResults(); setTopic(''); setLoadingState(LoadingState.IDLE); }} className={`flex flex-col items-center py-2 transition-all ${viewMode === mode ? 'text-blue-600' : 'text-slate-400'}`}>
              <div className={`p-2 rounded-xl transition-colors ${viewMode === mode ? 'bg-blue-50' : ''}`}>
                {mode === 'trending' ? <TrendingUp size={18} /> : mode === 'related' ? <LinkIcon size={18} /> : mode === 'ai_overview' ? <Bot size={18} /> : mode === 'low_ctr' ? <SearchCode size={18} /> : mode === 'gsc_page' ? <FileSearch size={18} /> : <LineChart size={18} />}
              </div>
              <span className="text-[8px] mt-1 font-black uppercase text-center truncate w-full px-1">{mode === 'trending' ? '趨勢' : mode === 'related' ? '機會' : mode === 'ai_overview' ? '佈局' : mode === 'low_ctr' ? '標題' : mode === 'gsc_page' ? '品質' : '成效'}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default App;
