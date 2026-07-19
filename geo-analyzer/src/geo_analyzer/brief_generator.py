"""Turns the mined GEO patterns into a content brief for a specific
topic/keyword - the piece that lets the analysis feed straight into writing
the next article instead of staying a one-off report.

Everything here is a direct translation of a finding from metrics.py /
content_signals.py into an instruction a writer can follow. If a finding
changes (e.g. a different market's data shows AI prefers a different
citation shape), update the corresponding rule here, not the caller.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from .brand_match import BrandAliases

MEDICAL_AUTHORITY_TOPIC_HINTS = ["手術", "治療", "疫苗", "藥物", "副作用", "風險", "併發症", "麻醉"]
EXPERIENCE_TOPIC_HINTS = ["隱私", "友善", "美學", "心理", "感受", "環境", "陪同"]


@dataclass
class ContentBrief:
    topic: str
    keyword: str
    title_recommendations: list[str] = field(default_factory=list)
    structure_checklist: list[str] = field(default_factory=list)
    entity_checklist: list[str] = field(default_factory=list)
    authority_checklist: list[str] = field(default_factory=list)
    data_notes: list[str] = field(default_factory=list)

    def to_markdown(self) -> str:
        lines = [f"# GEO 內容簡報：{self.topic} / {self.keyword}", ""]

        def section(title: str, items: list[str]) -> None:
            if not items:
                return
            lines.append(f"## {title}")
            for item in items:
                lines.append(f"- {item}")
            lines.append("")

        section("標題建議", self.title_recommendations)
        section("內文結構檢查表", self.structure_checklist)
        section("品牌實體強化檢查表", self.entity_checklist)
        section("權威來源搭配建議", self.authority_checklist)
        section("依實際數據的補充說明", self.data_notes)
        return "\n".join(lines)


def _is_medical_authority_topic(topic: str, keyword: str) -> bool:
    text = f"{topic}{keyword}"
    return any(h in text for h in MEDICAL_AUTHORITY_TOPIC_HINTS)


def _is_experience_topic(topic: str, keyword: str) -> bool:
    text = f"{topic}{keyword}"
    return any(h in text for h in EXPERIENCE_TOPIC_HINTS)


def generate_brief(
    topic: str,
    keyword: str,
    brand: BrandAliases,
    citation_rate_hint: float | None = None,
) -> ContentBrief:
    """Build a content brief for one topic/keyword pair.

    `citation_rate_hint` (0-100) is optional context from metrics.topic_performance
    for this exact topic/keyword, used only to add a data note - it does not
    change the checklist logic itself.
    """
    brief = ContentBrief(topic=topic, keyword=keyword)

    brief.title_recommendations = [
        f"用第一人稱痛點或情境句破題，而非關鍵字堆砌（例：「{keyword}會不會很尷尬？」而非「{keyword}介紹」）",
        f"標題中放入至少一個具體、可被引用的專業詞（例如實際術式/檢查/項目名稱），讓 AI 有明確實體可摘錄",
        "避免空泛形容詞開頭（最新、專業、優質），AI 摘錄時容易被視為行銷用語而略過",
    ]

    brief.structure_checklist = [
        "第一句先給「直接答案」（可用引號或粗體標出關鍵結論），AI 常整段摘錄第一句作為回答",
        "直接答案之後，用條列式（bullet）展開 3-5 個具體重點，每點以粗體詞開頭",
        "針對常見追問補一個小段「如果你想知道更多」或 FAQ 區塊，對應「其他人也問了」類型的長尾問題",
        "包含具體可查證的細節（費用範圍、恢復期天數、適用對象排除條件），抽象敘述不容易被引用",
    ]

    aliases_display = "、".join([brand.canonical_name, *brand.aliases]) or brand.canonical_name
    brief.entity_checklist = [
        f"內文中至少出現一次品牌的完整慣用稱呼（目前追蹤到的別名：{aliases_display}），不要只用簡稱",
        "確認官網其他頁面、社群貼文對品牌的稱呼一致，避免 AI 因稱呼不一致而無法建立品牌與內容的關聯",
        "若品牌有明確的差異化技術/特色名詞，在文中重複出現 2 次以上，強化 AI 對「品牌 x 特色」的實體連結",
    ]

    if _is_medical_authority_topic(topic, keyword):
        brief.authority_checklist = [
            "此主題屬於醫療風險/技術類，AI 傾向同時引用官方衛生單位或醫學文獻佐證，建議文中明確引用/連結至少一個政府衛教頁或學術來源",
            "避免只靠品牌自身背書；在關鍵醫療聲明旁註明依據來源，可提高被視為可信內容並一併引用的機率",
        ]
    elif _is_experience_topic(topic, keyword):
        brief.authority_checklist = [
            "此主題屬於體驗/隱私/友善類，品牌第一人稱敘述（診所實際作法、真實流程細節）本身就是可信來源，不需過度倚賴外部背書",
            "可補充真實情境描述（例如陪診安排、環境設計細節），這類具體描述在既有數據中引用率明顯較高",
        ]
    else:
        brief.authority_checklist = [
            "視內容屬性決定：涉及安全/療效的敘述搭配外部權威來源，涉及品牌自身服務/體驗的敘述可直接以第一人稱具體描述",
        ]

    if citation_rate_hint is not None:
        brief.data_notes.append(
            f"此關鍵字目前的網站引用率約為 {citation_rate_hint:.1f}%，可作為這篇文章上線後追蹤是否提升的基準值"
        )

    return brief
