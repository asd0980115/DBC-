"""Alias-aware brand matching.

Real-world finding from the first dataset this tool was built against: the
source GEO tool tracked the brand under a short name ("月易") but the AI
platforms almost always answer using the full public name ("月易診所"). The
tool's own self/competitor tagging did an exact match on the short name, so
~14% of the responses that were genuinely about the brand got filed under
"競品提及" (competitor mention) with the brand's own full name listed as if
it were a rival. That single mismatch corrupted every downstream metric:
mention rate, citation rate, and the competitive leaderboard all understated
the brand and invented a fake #1 competitor.

`BrandAliases` fixes this by re-deriving "is this response actually about
us" from a caller-supplied list of aliases (short name, full name, domain,
common misspellings) instead of trusting the upstream exact-match label.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

import pandas as pd


def _normalize(text: str) -> str:
    return re.sub(r"\s+", "", str(text)).lower()


@dataclass
class BrandAliases:
    """A brand's set of names/domains, used to re-detect self-mentions."""

    canonical_name: str
    aliases: list[str] = field(default_factory=list)
    own_domains: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        names = [self.canonical_name, *self.aliases]
        self._normalized_names = [_normalize(n) for n in names if n]
        self._normalized_domains = [_normalize(d) for d in self.own_domains if d]

    def matches_text(self, text: str) -> bool:
        norm = _normalize(text)
        return any(name in norm for name in self._normalized_names)

    def matches_domain(self, domain: str) -> bool:
        norm = _normalize(domain)
        return any(d in norm or norm in d for d in self._normalized_domains)


def reclassify_response_list(df: pd.DataFrame, brand: BrandAliases) -> pd.DataFrame:
    """Recompute `own_brand_mentioned` / `competitor_mentioned` on a response_list frame.

    Adds two columns rather than mutating the originals in place, so a
    before/after comparison (see metrics.brand_match_audit) stays possible:
      - own_brand_mentioned_fixed: "Yes"/"No"
      - competitor_mentioned_fixed: competitor string with the brand's own
        aliases stripped out
    """
    out = df.copy()

    def fix_own(row) -> str:
        if brand.matches_text(row.get("prompt", "")) or brand.matches_text(row.get("response_text", "")):
            return "Yes"
        if brand.matches_domain(str(row.get("cited_domains", ""))):
            return "Yes"
        return row.get("own_brand_mentioned", "No")

    def fix_competitor(row) -> str:
        raw = str(row.get("competitor_mentioned", "") or "")
        if not raw:
            return raw
        parts = [p.strip() for p in raw.split(";") if p.strip()]
        kept = [p for p in parts if not brand.matches_text(p)]
        return ";".join(kept)

    out["own_brand_mentioned_fixed"] = out.apply(fix_own, axis=1)
    out["competitor_mentioned_fixed"] = out.apply(fix_competitor, axis=1)
    return out
