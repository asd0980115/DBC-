"""Structural signals mined from what AI actually cites, used to explain
*why* certain pages/answers get picked up.

These are cheap, regex-level heuristics on purpose - the point is to turn
"AI seems to like this page" into a checklist a content writer can apply,
not to build a predictive model.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

QUESTION_MARKERS = ["嗎", "？", "?", "怎麼辦", "如何", "為什麼", "是什麼"]
PAIN_POINT_MARKERS = ["不再", "不用", "免除", "擔心", "困擾", "壓力", "別讓", "難以啟齒"]


@dataclass
class TitleSignals:
    is_question_style: bool
    has_pain_point_framing: bool
    has_specific_procedure_term: bool
    char_length: int


def analyze_title(title: str) -> TitleSignals:
    """Look at a page/article title the way the mined top-cited pages look.

    Pattern observed across this brand's highest-cited own pages: an
    emotional, first-person pain point ("讓每一次就診都不再是壓力") paired
    with a concrete, specific medical/procedure term ("LGBTQ性別友善門診"),
    rather than a generic SEO keyword string.
    """
    is_question = any(m in title for m in QUESTION_MARKERS)
    has_pain_point = any(m in title for m in PAIN_POINT_MARKERS)
    has_procedure_term = bool(re.search(r"[肛痔腸鏡雷射手術疫苗美學贅皮瘻管]{2,}", title))
    return TitleSignals(
        is_question_style=is_question,
        has_pain_point_framing=has_pain_point,
        has_specific_procedure_term=has_procedure_term,
        char_length=len(title),
    )


@dataclass
class ResponseSignals:
    bullet_count: int
    bold_term_count: int
    has_direct_answer_lead: bool
    numbered_step_count: int


def analyze_response_text(text: str) -> ResponseSignals:
    """Mine an AI response body for the structural traits its cited
    passages share: a short direct-answer sentence first, then bullets."""
    text = str(text)
    bullets = len(re.findall(r"^[\-\*•]\s", text, re.MULTILINE))
    bold_terms = len(re.findall(r"\*\*[^*]+\*\*", text))
    numbered_steps = len(re.findall(r"^\d+[.\)]\s", text, re.MULTILINE))
    first_line = text.strip().splitlines()[0] if text.strip() else ""
    direct_answer_lead = bool(re.match(r"^[`\"「]", first_line.strip())) or bool(re.search(r"^`[^`]+`", text.strip()))
    return ResponseSignals(
        bullet_count=bullets,
        bold_term_count=bold_terms,
        has_direct_answer_lead=direct_answer_lead,
        numbered_step_count=numbered_steps,
    )
