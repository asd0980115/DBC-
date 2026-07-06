
/**
 * 專業 SEO 實算邏輯 (JS 運算)
 * 用於分析內容長度、關鍵字佈局等物理指標，避免 AI 隨機生成數據。
 */

export interface RawSEOStats {
  wordCount: number;
  keywordCount: number;
  density: number;
  readingTime: number;
  titleLength: number;
}

export const calculateContentStats = (text: string, keyword: string): RawSEOStats => {
  const cleanText = text.trim();
  // 針對中文與英文不同的計數邏輯
  const wordCount = cleanText.length;
  
  // 關鍵字出現次數
  const keywordRegex = new RegExp(keyword, 'gi');
  const matches = cleanText.match(keywordRegex);
  const keywordCount = matches ? matches.length : 0;
  
  // 關鍵字密度 (通常建議 1% - 3%)
  const density = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;
  
  // 閱讀時間 (估計每分鐘閱讀 500 字)
  const readingTime = Math.ceil(wordCount / 500);
  
  return {
    wordCount,
    keywordCount,
    density,
    readingTime,
    titleLength: wordCount // 在內容分析中，此處指傳入段落長度
  };
};

export const getAuditLevel = (stats: RawSEOStats, targetKeyword: string) => {
  const items = [];

  // 1. 字數診斷
  if (stats.wordCount < 800) {
    items.push({
      status: 'error',
      label: '內容長度不足',
      value: `${stats.wordCount} 字`,
      suggestion: '對於競爭詞彙，Google 傾向長度超過 1500 字的深度內容。'
    });
  } else if (stats.wordCount < 1500) {
    items.push({
      status: 'warning',
      label: '內容豐富度中等',
      value: `${stats.wordCount} 字`,
      suggestion: '建議補充更多細節，提升至 2000 字以上以增加權威感。'
    });
  } else {
    items.push({
      status: 'success',
      label: '內容長度優異',
      value: `${stats.wordCount} 字`,
      suggestion: '長文有助於覆蓋更多長尾關鍵字。'
    });
  }

  // 2. 密度診斷
  if (stats.density > 4) {
    items.push({
      status: 'error',
      label: '關鍵字堆砌過度',
      value: `${stats.density.toFixed(2)}%`,
      suggestion: '關鍵字出現過於頻繁，可能會被 Google 判定為垃圾訊息。建議降至 2% 左右。'
    });
  } else if (stats.density < 0.5) {
    items.push({
      status: 'warning',
      label: '關鍵字佈局不足',
      value: `${stats.density.toFixed(2)}%`,
      suggestion: `未能在文中自然提及「${targetKeyword}」，建議在首尾段落加強佈置。`
    });
  } else {
    items.push({
      status: 'success',
      label: '關鍵字比例理想',
      value: `${stats.density.toFixed(2)}%`,
      suggestion: '分佈自然，符合高品質內容規範。'
    });
  }

  return items;
};
