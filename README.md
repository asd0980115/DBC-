# 自費療程月報統計系統

上傳含多月分頁的 Excel，自動統計每月新客人數、費用與療程施作次數。

## 快速啟動

```bash
pip install -r requirements.txt
python app/app.py
```

瀏覽器開啟 http://localhost:5000

## 使用流程

1. 上傳 Excel（每個 Sheet = 一個月）
2. 選擇要分析的月份、設定欄位對應（新客欄、費用欄、療程欄）
3. 點「開始分析」查看統計結果

---

# AI 引用內容產生器（GEO Content Generator）

依據「awoo GEO 分析洞察」提出的提升 AI 引用機率規則，只要輸入一個關鍵字，就能快速產生 Google 回覆用的精華內容：

1. 開頭摘要（三句話定義 + 中英術語並列）
2. 2-4 個 H2 問答段落（標題皆為問句，含台灣在地詞與比較型問句，每段包含數字 + 結論句 + 來源引導句）

## 正確性保護機制

為兼顧「快速」與「醫學數據正確」，本工具讓 Claude 在生成當下即時上網搜尋權威來源（衛生福利部、國民健康署、專科醫學會、大型醫院衛教頁面、PubMed 等），並遵守：

- 系統提示明確禁止 Claude 自行捏造、估計或延伸任何醫學數字或來源
- 查不到可靠數據時，只能寫定性描述，不會硬湊數字
- 產出內容附上實際查到的來源連結，方便人工核對
- 產出內容一律標示為草稿，需經醫療專業人員審閱後才能發布

## 快速啟動

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=your-api-key-here   # 或複製 content_generator/.env.example 為 .env
python content_generator/app.py
```

瀏覽器開啟 http://localhost:5001

## 使用流程

1. 輸入關鍵字（例：痔瘡手術），科別與審閱醫師可選填
2. 點「產生內容」，Claude 會搜尋公開資料並產生精華段落
3. 核對下方列出的來源連結，複製內容交由醫療專業人員審閱後再發布
