"""Loaders for the 6 GEO export CSV types (GEO tracking tool: AIO / AI Mode / Gemini / GPT).

Each `load_*` function reads one export type and renames columns to stable
English keys, so downstream code never has to touch the Chinese headers
directly. This is what lets the same analysis run again for a different
brand or a different export batch - only the input CSVs change.
"""
from __future__ import annotations

import glob
import os
from dataclasses import dataclass

import pandas as pd

RESPONSE_LIST_COLUMNS = {
    "回應時間": "response_time",
    "追蹤平台": "platform",
    "主題": "topic",
    "關鍵字": "keyword",
    "提示詞": "prompt",
    "回應": "response_text",
    "自家品牌提及": "own_brand_mentioned",
    "競品提及": "competitor_mentioned",
    "品牌排名": "brand_rank",
    "情緒指數": "sentiment_score",
    "引用網域": "cited_domains",
    "引用明細": "citation_detail",
    "關鍵字搜尋量": "keyword_search_volume",
    "AI搜尋關鍵字": "ai_search_keyword",
    "品牌排名清單": "brand_rank_list",
    "情緒正向字詞": "positive_terms",
    "情緒負向字詞": "negative_terms",
    "其他人也問了以下項目": "people_also_ask",
    "其他人也搜尋了以下項目": "people_also_search",
}

OVERVIEW_COLUMNS = {
    "我的品牌": "brand",
    "當期區間起日": "period_start",
    "當期區間迄日": "period_end",
    "前期區間起日": "prev_period_start",
    "前期區間迄日": "prev_period_end",
    "追蹤平台": "platforms",
    "指標名稱": "metric_name",
    "當期數值": "current_value",
    "前一期數值": "prev_value",
    "變化值": "delta",
    "上升主題數": "topics_up",
    "下降主題數": "topics_down",
}

PROMPT_ANALYSIS_COLUMNS = {
    "我的品牌": "brand",
    "當期區間起日": "period_start",
    "當期區間迄日": "period_end",
    "前期區間起日": "prev_period_start",
    "前期區間迄日": "prev_period_end",
    "追蹤平台": "platforms",
    "主題": "topic",
    "關鍵字": "keyword",
    "關鍵字搜量": "keyword_search_volume",
    "提示詞": "prompt",
    "品牌提及率": "mention_rate",
    "品牌提及率變化": "mention_rate_delta",
    "網站引用率": "citation_rate",
    "網站引用率變化": "citation_rate_delta",
    "情緒分析": "sentiment_score",
    "情緒分析變化": "sentiment_delta",
    "品牌聲量佔比": "share_of_voice",
    "品牌聲量佔比變化": "share_of_voice_delta",
    "排名": "rank",
    "排名變化": "rank_delta",
}

COMPETITIVE_COLUMNS = {
    "名次": "position",
    "品牌名稱- 品牌提及率": "brand_by_mention_rate",
    "品牌提及率": "mention_rate",
    "品牌名稱- 網站引用率": "brand_by_citation_rate",
    "網站引用率": "citation_rate",
    "品牌名稱-聲量佔比": "brand_by_share_of_voice",
    "品牌聲量佔比": "share_of_voice",
}

CITATION_DOMAIN_COLUMNS = {
    "我的品牌": "brand",
    "當期區間起日": "period_start",
    "當期區間迄日": "period_end",
    "前期區間起日": "prev_period_start",
    "前期區間迄日": "prev_period_end",
    "追蹤平台": "platforms",
    "網域名稱": "domain",
    "引用次數": "citation_count",
    "佔比": "share",
    "趨勢": "trend",
    "是否為自家網域": "is_own_domain",
}

CITATION_URL_COLUMNS = {
    "我的品牌": "brand",
    "當期區間起日": "period_start",
    "當期區間迄日": "period_end",
    "前期區間起日": "prev_period_start",
    "前期區間迄日": "prev_period_end",
    "追蹤平台": "platforms",
    "網址": "url",
    "所屬網域": "domain",
    "引用次數": "citation_count",
    "變化": "delta",
    "是否為自家網址": "is_own_url",
}


def _read(path: str, columns: dict) -> pd.DataFrame:
    df = pd.read_csv(path, encoding="utf-8-sig")
    df = df.rename(columns=columns)
    return df


def load_response_list(path: str) -> pd.DataFrame:
    return _read(path, RESPONSE_LIST_COLUMNS)


def load_overview(path: str) -> pd.DataFrame:
    return _read(path, OVERVIEW_COLUMNS)


def load_prompt_analysis(path: str) -> pd.DataFrame:
    return _read(path, PROMPT_ANALYSIS_COLUMNS)


def load_competitive(path: str) -> pd.DataFrame:
    return _read(path, COMPETITIVE_COLUMNS)


def load_citation_domain(path: str) -> pd.DataFrame:
    return _read(path, CITATION_DOMAIN_COLUMNS)


def load_citation_url(path: str) -> pd.DataFrame:
    return _read(path, CITATION_URL_COLUMNS)


@dataclass
class GEODataset:
    response_list: pd.DataFrame
    overview: pd.DataFrame
    prompt_analysis: pd.DataFrame
    competitive: pd.DataFrame
    citation_domain: pd.DataFrame
    citation_url: pd.DataFrame


# Filename fragments used to auto-detect each export type inside a data directory.
_PATTERNS = {
    "response_list": ["GEO_ResponseList", "ResponseList"],
    "overview": ["01_Overview_Metrics", "Overview_Metrics"],
    "prompt_analysis": ["02_PromptAnalysis", "PromptAnalysis"],
    "competitive": ["03_CompetitiveAnalysis", "CompetitiveAnalysis"],
    "citation_domain": ["04_Citation_Domain", "Citation_Domain"],
    "citation_url": ["05_Citation_URL", "Citation_URL"],
}


def _find_one(data_dir: str, fragments: list[str]) -> str | None:
    for fragment in fragments:
        matches = glob.glob(os.path.join(data_dir, f"*{fragment}*.csv"))
        if matches:
            return matches[0]
    return None


def load_dataset(data_dir: str) -> GEODataset:
    """Auto-discover and load all 6 export types from a directory.

    Any file can be missing - callers that only have some of the exports
    still get a usable (partially empty) dataset instead of a crash, since
    not every GEO export bundle includes all six files.
    """
    paths = {key: _find_one(data_dir, fragments) for key, fragments in _PATTERNS.items()}

    def _load_or_empty(key: str, loader):
        path = paths[key]
        return loader(path) if path else pd.DataFrame()

    return GEODataset(
        response_list=_load_or_empty("response_list", load_response_list),
        overview=_load_or_empty("overview", load_overview),
        prompt_analysis=_load_or_empty("prompt_analysis", load_prompt_analysis),
        competitive=_load_or_empty("competitive", load_competitive),
        citation_domain=_load_or_empty("citation_domain", load_citation_domain),
        citation_url=_load_or_empty("citation_url", load_citation_url),
    )
