"""Turns a GEODataset into the numbers that actually matter:
corrected mention rate, domain-category trust breakdown, which topics/
prompts already work, and what the brand's own best-performing pages
look like structurally.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd

from .brand_match import BrandAliases, reclassify_response_list
from .content_signals import analyze_title
from .domain_classifier import DomainClassifier
from .loaders import GEODataset


@dataclass
class BrandMatchAudit:
    total_responses: int
    reported_own_mentions: int
    corrected_own_mentions: int
    reclassified_as_competitor_count: int
    top_reclassified_names: list[tuple[str, int]] = field(default_factory=list)

    @property
    def reported_mention_rate(self) -> float:
        return self.reported_own_mentions / self.total_responses if self.total_responses else 0.0

    @property
    def corrected_mention_rate(self) -> float:
        return self.corrected_own_mentions / self.total_responses if self.total_responses else 0.0


def audit_brand_matching(response_list: pd.DataFrame, brand: BrandAliases) -> BrandMatchAudit:
    """Compare the upstream self/competitor tags against alias-aware detection.

    A large gap here (as in the first dataset this was built for: 0.7%
    reported vs. ~14% corrected) means the GEO tool's brand dictionary is
    missing an alias, and every rate/ranking downstream is wrong until it's
    fixed at the source.
    """
    if response_list.empty:
        return BrandMatchAudit(0, 0, 0, 0)

    fixed = reclassify_response_list(response_list, brand)
    total = len(fixed)
    reported_yes = (fixed["own_brand_mentioned"] == "Yes").sum()
    corrected_yes = (fixed["own_brand_mentioned_fixed"] == "Yes").sum()

    was_no_now_yes = fixed[(fixed["own_brand_mentioned"] == "No") & (fixed["own_brand_mentioned_fixed"] == "Yes")]
    reclassified_count = len(was_no_now_yes)

    names: dict[str, int] = {}
    for raw in was_no_now_yes["competitor_mentioned"].fillna(""):
        for part in str(raw).split(";"):
            part = part.strip()
            if part and brand.matches_text(part):
                names[part] = names.get(part, 0) + 1
    top_names = sorted(names.items(), key=lambda kv: -kv[1])[:5]

    return BrandMatchAudit(
        total_responses=total,
        reported_own_mentions=int(reported_yes),
        corrected_own_mentions=int(corrected_yes),
        reclassified_as_competitor_count=reclassified_count,
        top_reclassified_names=top_names,
    )


def domain_category_breakdown(citation_domain: pd.DataFrame, classifier: DomainClassifier) -> pd.DataFrame:
    """Roll up per-domain citation counts into trust categories
    (own / social / government / medical_journal / news_media / ...)."""
    if citation_domain.empty:
        return pd.DataFrame(columns=["category", "citation_count", "share"])

    df = citation_domain.copy()
    df["category"] = df["domain"].apply(classifier.classify)
    df["citation_count"] = pd.to_numeric(df["citation_count"], errors="coerce").fillna(0)
    total = df["citation_count"].sum()
    grouped = df.groupby("category", as_index=False)["citation_count"].sum()
    grouped["share"] = grouped["citation_count"] / total if total else 0
    return grouped.sort_values("citation_count", ascending=False)


def top_own_pages(citation_url: pd.DataFrame, brand: BrandAliases, top_n: int = 15) -> pd.DataFrame:
    """The brand's own URLs ranked by citation count, with title-pattern
    signals attached (question-style / pain-point framing / etc.) so the
    reader can see what already works, at a glance."""
    if citation_url.empty:
        return pd.DataFrame()

    own = citation_url[citation_url["is_own_url"] == "Yes"].copy()
    own["citation_count"] = pd.to_numeric(own["citation_count"], errors="coerce").fillna(0)
    own = own.sort_values("citation_count", ascending=False).head(top_n)

    def title_from_url(url: str) -> str:
        # e.g. https://boweleasy.com/舒眠大腸胃鏡/ -> 舒眠大腸胃鏡
        path = url.split("?", 1)[0].rstrip("/").rsplit("/", 1)[-1]
        return path or url

    own["inferred_title"] = own["url"].apply(title_from_url)
    signal_rows = own["inferred_title"].apply(analyze_title)
    own["is_question_style"] = [s.is_question_style for s in signal_rows]
    own["has_pain_point_framing"] = [s.has_pain_point_framing for s in signal_rows]
    own["has_specific_procedure_term"] = [s.has_specific_procedure_term for s in signal_rows]
    return own[["url", "citation_count", "inferred_title", "is_question_style", "has_pain_point_framing", "has_specific_procedure_term"]]


def topic_performance(prompt_analysis: pd.DataFrame) -> pd.DataFrame:
    """Keyword/topic-level rollup rows only (prompt is NaN = the aggregate
    row for that keyword), sorted by citation rate so the strongest topics
    surface first."""
    if prompt_analysis.empty:
        return pd.DataFrame()

    def pct_to_float(s: pd.Series) -> pd.Series:
        return pd.to_numeric(s.astype(str).str.rstrip("%"), errors="coerce")

    rollup = prompt_analysis[prompt_analysis["prompt"].isna()].copy()
    rollup["citation_rate_num"] = pct_to_float(rollup["citation_rate"])
    rollup["mention_rate_num"] = pct_to_float(rollup["mention_rate"])
    return rollup.sort_values("citation_rate_num", ascending=False)[
        ["topic", "keyword", "mention_rate", "citation_rate", "citation_rate_num", "share_of_voice", "rank"]
    ]


def branded_vs_unbranded_prompts(prompt_analysis: pd.DataFrame, brand: BrandAliases) -> pd.DataFrame:
    """Split individual-prompt rows (not the keyword rollups) by whether the
    prompt text itself names the brand, to quantify how much entity
    association in the query drives citation."""
    if prompt_analysis.empty:
        return pd.DataFrame()

    rows = prompt_analysis[prompt_analysis["prompt"].notna()].copy()
    rows["prompt_names_brand"] = rows["prompt"].apply(brand.matches_text)

    def pct_to_float(s: pd.Series) -> pd.Series:
        return pd.to_numeric(s.astype(str).str.rstrip("%"), errors="coerce")

    rows["citation_rate_num"] = pct_to_float(rows["citation_rate"])
    rows["mention_rate_num"] = pct_to_float(rows["mention_rate"])
    return rows.groupby("prompt_names_brand")[["citation_rate_num", "mention_rate_num"]].mean().reset_index()
