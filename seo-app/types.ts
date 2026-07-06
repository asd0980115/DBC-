
export type ViewMode = 'trending' | 'related' | 'ai_overview' | 'low_ctr' | 'gsc_page' | 'impact';

export type TrendType = 'top' | 'rising' | 'general';

export type AuditStatus = 'error' | 'warning' | 'success';

export interface AuditItem {
  status: AuditStatus;
  label: string;
  value: string;
  suggestion: string;
}

export interface SpecificAction {
  keyword: string;
  rank: string;
  action: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  id?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AIOverviewResult {
  topic: string;
  intentKeywords: string[];
  faqs: FAQItem[];
  schemaCode: string;
  sources?: GroundingSource[];
}

export interface PageAuditResult {
  target: string;
  score: number;
  pros: string[];
  cons: string[];
  semanticAdvice: string;
  specificActions: SpecificAction[];
  risingKeywordsSuggestion: string[];
  titleOptimization: {
    diagnosis: string;
    example: string;
  };
  difficultyAssessment: string;
  stats: {
    wordCount: number;
    keywordDensity: string;
    readingTime: number;
    titleLength: number;
  };
  auditItems: AuditItem[];
  eeatAdvice: {
    experience: string;
    expertise: string;
    authority: string;
    trust: string;
  };
}

export interface TitleDiagnosis {
  diagnosis: string;
  suggestedTitles: string[];
  scores: {
    seo: number;
    ctr: number;
  };
}

export interface KeywordMetric {
  keyword: string;
  searchVolume: number;
  currentRank: number;
  difficulty: number;
  competitiveDensity: number;
  trend: number[];
  opportunityScore: number;
  tags?: string[];
  optimizationSuggestion?: string;
  trendType?: TrendType; 
  growth?: string;
}

export interface TrackedOptimization {
  id: string;
  keyword: string;
  appliedAt: string;
  suggestion: string;
  originalRank: number;
  originalVolume: number;
}

export interface AnalysisResult {
  topic: string;
  totalVolume: number;
  keywords: KeywordMetric[];
  viewMode: ViewMode;
  sources?: GroundingSource[];
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
