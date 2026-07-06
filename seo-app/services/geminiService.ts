
import { GoogleGenAI, Type } from "@google/genai";
import { 
  KeywordMetric, 
  AnalysisResult, 
  ViewMode, 
  AIOverviewResult, 
  GroundingSource,
  PageAuditResult,
  TitleDiagnosis 
} from "../types";

const getAIClient = () => {
  const savedKey = localStorage.getItem('GEMINI_API_KEY');
  if (!savedKey) return null;
  return new GoogleGenAI({ apiKey: savedKey });
};

const MODEL_NAME = 'gemini-3-flash-preview';

const SYSTEM_INSTRUCTION = '你是一位專業的台灣在地 SEO 顧問。請務必全程使用「繁體中文」回答，包含所有 JSON 欄位中的文字內容（標題、建議、分析說明等），不要使用英文或簡體中文，專有名詞、程式碼與 HTML 標籤除外。';

const isRetryableError = (err: any): boolean => {
  const code = err?.error?.code ?? err?.code ?? err?.status;
  return code === 503 || code === 429 || code === 'UNAVAILABLE' || code === 'RESOURCE_EXHAUSTED';
};

const withRetry = async <T,>(fn: () => Promise<T>, retries = 2, baseDelayMs = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (err: any) {
    if (retries > 0 && isRetryableError(err)) {
      await new Promise(resolve => setTimeout(resolve, baseDelayMs));
      return withRetry(fn, retries - 1, baseDelayMs * 2);
    }
    if (isRetryableError(err)) {
      throw new Error('Gemini 模型目前流量較高，請稍後再試一次。');
    }
    throw err;
  }
};

const extractSources = (response: any): GroundingSource[] => {
  return response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter((chunk: any) => chunk.web)
    ?.map((chunk: any) => ({
      title: chunk.web.title || chunk.web.uri,
      uri: chunk.web.uri
    })) || [];
};

/**
 * 1. 搜尋趨勢 (Rising Trends)
 */
export const fetchKeywordAnalysis = async (topic: string): Promise<AnalysisResult> => {
  const ai = getAIClient();
  if (!ai) throw new Error("請先在頂部設定 API Key");
  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL_NAME,
    contents: `分析主題「${topic}」在台灣的近期搜尋趨勢，找出 6-8 個爆紅或高熱度詞。`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          keywords: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                keyword: { type: Type.STRING },
                searchVolume: { type: Type.NUMBER },
                difficulty: { type: Type.NUMBER },
                currentRank: { type: Type.NUMBER },
                trend: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                opportunityScore: { type: Type.NUMBER },
                optimizationSuggestion: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                trendType: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  }));
  const jsonResult = JSON.parse(response.text);
  return { topic, totalVolume: 0, keywords: jsonResult.keywords || [], viewMode: 'trending', sources: extractSources(response) };
};

/**
 * 2. 機會關鍵字 (Related Keywords)
 */
export const fetchRelatedKeywords = async (topic: string): Promise<AnalysisResult> => {
  const ai = getAIClient();
  if (!ai) throw new Error("請先在頂部設定 API Key");
  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL_NAME,
    contents: `分析主題「${topic}」的 5-8 個長尾機會詞，避開主詞。`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          keywords: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                keyword: { type: Type.STRING },
                searchVolume: { type: Type.NUMBER },
                difficulty: { type: Type.NUMBER },
                currentRank: { type: Type.NUMBER },
                trend: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                opportunityScore: { type: Type.NUMBER },
                optimizationSuggestion: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  }));
  const jsonResult = JSON.parse(response.text);
  return { topic, totalVolume: 0, keywords: jsonResult.keywords || [], viewMode: 'related', sources: extractSources(response) };
};

/**
 * 3. 標題 CTR 診斷 (3 Suggestions)
 */
export const analyzeArticleTitle = async (title: string, kw?: string): Promise<TitleDiagnosis> => {
  const ai = getAIClient();
  if (!ai) throw new Error("請先在頂部設定 API Key");
  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL_NAME,
    contents: `診斷標題「${title}」針對核心詞「${kw || ''}」的點擊率。`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          diagnosis: { type: Type.STRING },
          suggestedTitles: { type: Type.ARRAY, minItems: 3, maxItems: 3, items: { type: Type.STRING } },
          scores: { type: Type.OBJECT, properties: { seo: { type: Type.NUMBER }, ctr: { type: Type.NUMBER } } }
        }
      }
    }
  }));
  return JSON.parse(response.text);
};

/**
 * 4. 成效監測 (優化：提升生成速度與精確任務建議)
 */
export const analyzeGSCReport = async (dataA: any, dataB: any): Promise<any> => {
  const ai = getAIClient();
  if (!ai) throw new Error("請先在頂部設定 API Key");
  
  const prompt = `分析 SEO 數據對比並提供 3 個高精確度優化任務：
  優化前: 點擊 ${dataA.clicks}, 曝光 ${dataA.impressions}, CTR ${dataA.ctr}, 排名 ${dataA.rank}
  優化後: 點擊 ${dataB.clicks}, 曝光 ${dataB.impressions}, CTR ${dataB.ctr}, 排名 ${dataB.rank}
  
  要求：拒絕模糊大方向。必須提供具體的 HTML 標籤修改、具體要增加的關鍵字內容、以及具體的內連路徑。`;

  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["growthMetrics", "dataAnalysis", "actionTasks"],
        properties: {
          growthMetrics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["label", "before", "after", "growth", "isPositive"],
              properties: { label: { type: Type.STRING }, before: { type: Type.STRING }, after: { type: Type.STRING }, growth: { type: Type.STRING }, isPositive: { type: Type.BOOLEAN } }
            }
          },
          dataAnalysis: { type: Type.ARRAY, items: { type: Type.STRING } },
          actionTasks: {
            type: Type.ARRAY,
            minItems: 3,
            maxItems: 3,
            items: {
              type: Type.OBJECT,
              required: ["taskTitle", "targetMetric", "technicalTask", "contentTask", "linkTask"],
              properties: { 
                taskTitle: { type: Type.STRING },
                targetMetric: { type: Type.STRING },
                technicalTask: { type: Type.STRING },
                contentTask: { type: Type.STRING },
                linkTask: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  }));
  return JSON.parse(response.text);
};

/**
 * 5. AI 內容策略 (AI Overview & FAQ)
 */
export const fetchAIOverviewAnalysis = async (topic: string): Promise<AIOverviewResult> => {
  const ai = getAIClient();
  if (!ai) throw new Error("請先在頂部設定 API Key");
  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL_NAME,
    contents: `針對主題「${topic}」產出 SGE 策略、FAQ 與 Schema 代碼。`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intentKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          faqs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { question: { type: Type.STRING }, answer: { type: Type.STRING } }
            }
          },
          schemaCode: { type: Type.STRING }
        }
      }
    }
  }));
  const jsonResult = JSON.parse(response.text);
  return { ...jsonResult, topic, sources: extractSources(response) };
};

/**
 * 6. EEAT 品質診斷 (Full Audit)
 */
export const analyzeURLDiagnosis = async (content: string): Promise<PageAuditResult> => {
  const ai = getAIClient();
  if (!ai) throw new Error("請先在頂部設定 API Key");
  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL_NAME,
    contents: `診斷內容的 EEAT 品質並提供具體優化建議："""${content}"""`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          specificActions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { keyword: { type: Type.STRING }, rank: { type: Type.STRING }, action: { type: Type.STRING } }
            }
          },
          risingKeywordsSuggestion: { type: Type.ARRAY, items: { type: Type.STRING } },
          eeatAdvice: {
            type: Type.OBJECT,
            properties: { experience: { type: Type.STRING }, expertise: { type: Type.STRING }, authority: { type: Type.STRING }, trust: { type: Type.STRING } }
          }
        }
      }
    }
  }));
  const result = JSON.parse(response.text);
  return {
    target: content.substring(0, 50),
    ...result,
    pros: [], cons: [], semanticAdvice: "", auditItems: [],
    titleOptimization: { diagnosis: "", example: "" },
    stats: { wordCount: content.length, keywordDensity: "AI", readingTime: Math.ceil(content.length/500), titleLength: 0 },
    difficultyAssessment: ""
  };
};
