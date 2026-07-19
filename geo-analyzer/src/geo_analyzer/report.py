"""Assembles the metrics.py outputs into one markdown findings report."""
from __future__ import annotations

from .brand_match import BrandAliases
from .domain_classifier import DomainClassifier
from .loaders import GEODataset
from .metrics import (
    audit_brand_matching,
    branded_vs_unbranded_prompts,
    domain_category_breakdown,
    top_own_pages,
    topic_performance,
)


def build_report(dataset: GEODataset, brand: BrandAliases, classifier: DomainClassifier) -> str:
    lines = [f"# GEO 品牌引用分析報告：{brand.canonical_name}", ""]

    audit = audit_brand_matching(dataset.response_list, brand)
    if audit.total_responses:
        lines += [
            "## 1. 品牌比對校正（brand matching audit）",
            "",
            f"- 原始回報的自家品牌提及率：{audit.reported_mention_rate:.1%}"
            f"（{audit.reported_own_mentions}/{audit.total_responses} 筆）",
            f"- 加入別名比對後校正的提及率：{audit.corrected_mention_rate:.1%}"
            f"（{audit.corrected_own_mentions}/{audit.total_responses} 筆）",
        ]
        if audit.reclassified_as_competitor_count:
            names = "、".join(f"{n}（{c} 筆）" for n, c in audit.top_reclassified_names)
            lines += [
                f"- 有 {audit.reclassified_as_competitor_count} 筆原本被歸類為「競品提及」，"
                f"實際上是品牌自己的別名被誤判：{names}",
                "- 建議：回到 GEO 追蹤工具設定，把這些別名加入「自家品牌」清單，否則提及率、引用率、"
                "競品排名等所有下游指標都會被低估/誤導",
            ]
        lines.append("")

    breakdown = domain_category_breakdown(dataset.citation_domain, classifier)
    if not breakdown.empty:
        lines += ["## 2. AI 引用來源的信任分佈（依網域分類）", ""]
        for _, row in breakdown.iterrows():
            lines.append(f"- {row['category']}：{row['citation_count']:.0f} 次（{row['share']:.1%}）")
        lines.append("")

    pages = top_own_pages(dataset.citation_url, brand)
    if not pages.empty:
        lines += ["## 3. 自家最常被引用的頁面（附標題型態訊號）", ""]
        for _, row in pages.iterrows():
            tags = []
            if row["is_question_style"]:
                tags.append("提問/情境句")
            if row["has_pain_point_framing"]:
                tags.append("痛點框架")
            if row["has_specific_procedure_term"]:
                tags.append("具體專業詞")
            tag_str = f"（{'、'.join(tags)}）" if tags else ""
            lines.append(f"- {row['inferred_title']}：{row['citation_count']:.0f} 次{tag_str}")
        lines.append("")

    topics = topic_performance(dataset.prompt_analysis)
    if not topics.empty:
        lines += ["## 4. 主題/關鍵字表現排行（依網站引用率排序）", ""]
        for _, row in topics.head(10).iterrows():
            kw = row["keyword"] if isinstance(row["keyword"], str) else "(整體主題)"
            lines.append(f"- {row['topic']} / {kw}：品牌提及率 {row['mention_rate']}，網站引用率 {row['citation_rate']}")
        lines.append("")

    branded = branded_vs_unbranded_prompts(dataset.prompt_analysis, brand)
    if not branded.empty:
        lines += ["## 5. 提示詞是否直接點名品牌，對引用率的影響", ""]
        for _, row in branded.iterrows():
            label = "提示詞內有點名品牌" if row["prompt_names_brand"] else "提示詞未點名品牌"
            lines.append(
                f"- {label}：平均網站引用率 {row['citation_rate_num']:.1f}%，"
                f"平均品牌提及率 {row['mention_rate_num']:.1f}%"
            )
        lines.append("")

    return "\n".join(lines)
