
import React, { useState } from 'react';
import { KeywordMetric, TrackedOptimization, TitleDiagnosis } from '../types';
import { TrendSparkline } from './TrendSparkline';
import { ChevronDown, ChevronUp, TrendingUp, AlertCircle, BarChart3, Eye, MousePointerClick, Tag, Flame, Activity, Layers, Lightbulb, Sparkles, Copy, Check, Loader2, CheckCircle2, Type as FontType, SearchCode, History } from 'lucide-react';
import { analyzeArticleTitle } from '../services/geminiService';

interface KeywordCardProps {
  data: KeywordMetric;
  showDiagnosis?: boolean;
}

export const KeywordCard: React.FC<KeywordCardProps> = ({ data, showDiagnosis = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [originalTitle, setOriginalTitle] = useState('');
  const [diagnosisData, setDiagnosisData] = useState<TitleDiagnosis | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isTracked, setIsTracked] = useState(false);

  const getRankColor = (rank: number) => {
    if (rank <= 3) return 'text-green-600 bg-green-50';
    if (rank <= 10) return 'text-emerald-600 bg-emerald-50';
    if (rank <= 20) return 'text-amber-600 bg-amber-50';
    return 'text-red-500 bg-red-50';
  };

  const handleRunDiagnosis = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGenerating(true);
    try {
      // 修復：此處傳入兩個參數 (標題與關鍵字)，已於 geminiService.ts 中更新函式簽名
      const result = await analyzeArticleTitle(originalTitle, data?.keyword);
      setDiagnosisData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleTrackOptimization = (e: React.MouseEvent) => {
    e.stopPropagation();
    const trackedItems: TrackedOptimization[] = JSON.parse(localStorage.getItem('tracked_optimizations') || '[]');
    
    const newItem: TrackedOptimization = {
      id: Date.now().toString(),
      keyword: data?.keyword || '未知詞',
      appliedAt: new Date().toISOString(),
      suggestion: data?.optimizationSuggestion || '一般內容優化與相關詞覆蓋',
      originalRank: data?.currentRank || 0,
      originalVolume: data?.searchVolume || 0
    };

    localStorage.setItem('tracked_optimizations', JSON.stringify([newItem, ...trackedItems]));
    setIsTracked(true);
    setTimeout(() => setIsTracked(false), 2000);
  };

  const currentRank = data?.currentRank || 0;
  const rankStyle = getRankColor(currentRank);
  const isBreakout = data?.growth === 'Breakout' || (data?.growth?.includes('+') && parseInt(data?.growth) > 300);
  const isRising = data?.trendType === 'rising';
  const trendData = Array.isArray(data?.trend) ? data.trend : [0,0,0,0,0,0,0,0,0,0,0,0];

  return (
    <div 
      className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 transition-all active:scale-[0.99] touch-manipulation cursor-pointer mb-3"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex flex-col mb-3">
        <div className="flex gap-1 mb-2 overflow-x-auto no-scrollbar">
          {isRising && (
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-red-50 text-red-600 flex items-center whitespace-nowrap">
              <Flame size={8} className="mr-1" /> 近 3 個月爆紅
            </span>
          )}
          {data?.tags?.map?.((tag, i) => (
            <span key={i} className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 flex items-center whitespace-nowrap">
              {tag}
            </span>
          ))}
        </div>
        
        <div className="flex justify-between items-start">
            <h3 className="font-bold text-slate-900 text-lg leading-tight flex-1 mr-2">{data?.keyword || '關鍵字'}</h3>
            {isRising ? (
                <div className={`px-2 py-1 rounded-md text-[10px] font-black flex items-center ${isBreakout ? 'bg-red-500 text-white animate-pulse' : 'bg-green-100 text-green-700'}`}>
                    {data?.growth || '竄升中'}
                </div>
            ) : (
                <div className={`px-2 py-1 rounded-md text-[10px] font-black ${rankStyle}`}>
                    Rank #{currentRank}
                </div>
            )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-slate-400 text-[9px] uppercase font-black">月搜尋量</span>
          <span className="text-slate-900 font-black">{(data?.searchVolume || 0).toLocaleString()}</span>
        </div>
        
        <div className="flex flex-col items-center w-20">
             <TrendSparkline data={trendData} color={isRising ? "#ef4444" : "#2563EB"} />
        </div>

        <div className="flex flex-col items-end justify-center pl-2">
             <div className="bg-slate-50 rounded-full p-1 border border-slate-100">
                {isExpanded ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}
             </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
            {showDiagnosis && (
                <div className="mb-4 rounded-2xl p-4 bg-blue-50 border border-blue-100" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-blue-600 p-1.5 rounded-lg">
                        <SearchCode size={14} className="text-white" />
                      </div>
                      <h4 className="text-xs font-black uppercase text-blue-700">AI 標題診斷優化</h4>
                    </div>
                    
                    <input 
                      type="text" 
                      placeholder="輸入您目前的標題來分析問題..." 
                      value={originalTitle}
                      onChange={(e) => setOriginalTitle(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-400 font-bold mb-3"
                    />

                    {isGenerating ? (
                      <div className="py-4 flex flex-col items-center"><Loader2 size={20} className="animate-spin text-blue-500 mb-2"/><p className="text-[10px] font-black text-slate-400 uppercase">診斷中...</p></div>
                    ) : diagnosisData ? (
                      <div className="space-y-3">
                        <div className="bg-white/80 p-3 rounded-xl border border-blue-100"><p className="text-[11px] text-slate-700 font-bold">{diagnosisData?.diagnosis}</p></div>
                        <div className="space-y-2">
                          {diagnosisData?.suggestedTitles?.map?.((title, i) => (
                            <div key={i} onClick={() => copyToClipboard(title, i)} className="bg-white border border-slate-200 rounded-xl p-3 active:bg-slate-50 transition-all flex flex-col gap-1 shadow-sm">
                              <p className="text-xs text-slate-700 font-bold leading-relaxed pr-6">{title}</p>
                              <div className="text-[9px] font-black self-end text-green-600">{title?.length || 0} 字</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button onClick={handleRunDiagnosis} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-xs shadow-md active:scale-95 transition-all">
                        開始標題診斷
                      </button>
                    )}
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="text-slate-500 text-[9px] font-black uppercase mb-1">SEO 難度</div>
                    <div className="text-slate-900 font-black text-lg">{data?.difficulty || '-'}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="text-slate-500 text-[9px] font-black uppercase mb-1">機會分數</div>
                    <div className="text-slate-900 font-black text-lg">{data?.opportunityScore || '-'}</div>
                </div>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 relative overflow-hidden">
                <div className="text-slate-500 text-[9px] font-black uppercase mb-1">優化策略建議</div>
                <p className="text-xs text-slate-600 font-bold leading-relaxed mb-4">{data?.optimizationSuggestion || '建議優化頁面內容長度與相關關鍵字覆蓋率。'}</p>
                
                <button 
                  onClick={handleTrackOptimization}
                  className={`w-full py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${isTracked ? 'bg-green-500 text-white' : 'bg-slate-900 text-white active:scale-95'}`}
                >
                  {isTracked ? <Check size={14} /> : <History size={14} />}
                  {isTracked ? '已加入成效監控' : '按下優化建議並開啟監控'}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
