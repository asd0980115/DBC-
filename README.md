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
