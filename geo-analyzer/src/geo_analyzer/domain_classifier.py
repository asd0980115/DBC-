"""Classify a cited domain into a category, so citation counts can be read
as "who is AI actually trusting" instead of a flat list of hostnames.

Categories are intentionally coarse and rule-based (no ML) so they stay
auditable and easy to extend per-market: add a pattern, not a model.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

SOCIAL_PATTERNS = [r"facebook\.com", r"instagram\.com", r"threads\.net", r"line\.me", r"youtube\.com", r"tiktok\.com"]
GOV_PATTERNS = [r"\.gov\.tw$", r"\.gov$", r"mohw\.gov\.tw"]
JOURNAL_PATTERNS = [r"ncbi\.nlm\.nih\.gov", r"pubmed", r"pmc\.", r"doi\.org", r"cochrane"]
NEWS_MEDIA_PATTERNS = [r"ltn\.com\.tw", r"udn\.com", r"chinatimes\.com", r"ettoday\.net", r"cna\.com\.tw", r"health\.\w+\.com"]
DIRECTORY_REVIEW_PATTERNS = [r"drbird\.tw", r"google\.com/search", r"maps\.google"]


def _matches_any(domain: str, patterns: list[str]) -> bool:
    return any(re.search(p, domain, re.I) for p in patterns)


@dataclass
class DomainClassifier:
    """own_domains/competitor_domains are supplied per-brand; everything
    else falls back to the built-in generic pattern categories above."""

    own_domains: list[str] = field(default_factory=list)
    competitor_domains: dict[str, str] = field(default_factory=dict)  # domain -> competitor name

    def classify(self, domain: str) -> str:
        domain = (domain or "").strip().lower()
        if not domain:
            return "unknown"
        if any(d.lower() in domain or domain in d.lower() for d in self.own_domains):
            return "own"
        if domain in self.competitor_domains:
            return "competitor"
        if _matches_any(domain, SOCIAL_PATTERNS):
            return "social"
        if _matches_any(domain, JOURNAL_PATTERNS):
            return "medical_journal"
        if _matches_any(domain, GOV_PATTERNS):
            return "government_health_authority"
        if _matches_any(domain, NEWS_MEDIA_PATTERNS):
            return "news_media"
        if _matches_any(domain, DIRECTORY_REVIEW_PATTERNS):
            return "directory_or_review"
        return "other_long_tail"
