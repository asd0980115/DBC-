"""GEO citation analyzer CLI.

Usage:
    python cli.py analyze --data-dir data/raw --brand 月易 \
        --aliases 月易診所,boweleasy --own-domain boweleasy.com \
        --out reports/findings.md

    python cli.py brief --topic 隱私、美學與性別友善 --keyword 性別友善 \
        --brand 月易 --aliases 月易診所,boweleasy --out reports/brief.md
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

from geo_analyzer.brand_match import BrandAliases
from geo_analyzer.brief_generator import generate_brief
from geo_analyzer.domain_classifier import DomainClassifier
from geo_analyzer.loaders import load_dataset
from geo_analyzer.metrics import topic_performance
from geo_analyzer.report import build_report


def _parse_brand_args(args) -> BrandAliases:
    aliases = args.aliases.split(",") if args.aliases else []
    own_domains = args.own_domain.split(",") if args.own_domain else []
    return BrandAliases(canonical_name=args.brand, aliases=aliases, own_domains=own_domains)


def cmd_analyze(args) -> None:
    dataset = load_dataset(args.data_dir)
    brand = _parse_brand_args(args)
    classifier = DomainClassifier(own_domains=brand.own_domains)
    report_text = build_report(dataset, brand, classifier)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(report_text, encoding="utf-8")
    print(f"報告已寫入 {out_path}")


def cmd_brief(args) -> None:
    brand = _parse_brand_args(args)
    citation_rate_hint = None

    if args.data_dir:
        dataset = load_dataset(args.data_dir)
        perf = topic_performance(dataset.prompt_analysis)
        if not perf.empty:
            match = perf[(perf["topic"] == args.topic) & (perf["keyword"] == args.keyword)]
            if not match.empty:
                citation_rate_hint = match.iloc[0]["citation_rate_num"]

    brief = generate_brief(args.topic, args.keyword, brand, citation_rate_hint=citation_rate_hint)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(brief.to_markdown(), encoding="utf-8")
    print(f"內容簡報已寫入 {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    subparsers = parser.add_subparsers(dest="command", required=True)

    analyze_parser = subparsers.add_parser("analyze", help="分析一批 GEO 匯出 CSV，產生找法報告")
    analyze_parser.add_argument("--data-dir", required=True, help="放置 6 種 GEO 匯出 CSV 的資料夾")
    analyze_parser.add_argument("--brand", required=True, help="品牌簡稱（目前 GEO 工具追蹤用的名稱）")
    analyze_parser.add_argument("--aliases", default="", help="品牌其他稱呼，逗號分隔，例如：月易診所,boweleasy")
    analyze_parser.add_argument("--own-domain", default="", help="品牌自有網域，逗號分隔")
    analyze_parser.add_argument("--out", default="reports/findings.md")
    analyze_parser.set_defaults(func=cmd_analyze)

    brief_parser = subparsers.add_parser("brief", help="針對單一主題/關鍵字產生 GEO 內容簡報")
    brief_parser.add_argument("--topic", required=True)
    brief_parser.add_argument("--keyword", required=True)
    brief_parser.add_argument("--brand", required=True)
    brief_parser.add_argument("--aliases", default="")
    brief_parser.add_argument("--own-domain", default="")
    brief_parser.add_argument("--data-dir", default=None, help="選填：提供的話會附上目前的引用率作為基準值")
    brief_parser.add_argument("--out", default="reports/brief.md")
    brief_parser.set_defaults(func=cmd_brief)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
