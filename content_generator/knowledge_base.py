import json
import os
import threading

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "keywords.json")
_lock = threading.Lock()


def _load():
    if not os.path.exists(DATA_PATH):
        return {}
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _save(data):
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def list_keywords():
    data = _load()
    return [
        {
            "keyword": keyword,
            "specialty": entry.get("specialty", ""),
            "fact_count": len(entry.get("facts", [])),
            "verified_fact_count": sum(1 for f in entry.get("facts", []) if f.get("verified")),
        }
        for keyword, entry in data.items()
    ]


def get_keyword_entry(keyword):
    return _load().get(keyword)


def upsert_keyword(keyword, body):
    with _lock:
        data = _load()
        entry = data.get(keyword, {"facts": []})
        entry["specialty"] = body.get("specialty", entry.get("specialty", ""))
        entry["english_term"] = body.get("english_term", entry.get("english_term", ""))
        entry["chinese_term"] = body.get("chinese_term", entry.get("chinese_term", ""))
        entry["aka"] = body.get("aka", entry.get("aka", []))
        entry["taiwan_local_terms"] = body.get("taiwan_local_terms", entry.get("taiwan_local_terms", []))
        entry["comparison_pairs"] = body.get("comparison_pairs", entry.get("comparison_pairs", []))
        entry.setdefault("facts", [])
        data[keyword] = entry
        _save(data)
        return entry


def add_fact(keyword, fact_body):
    with _lock:
        data = _load()
        entry = data.get(keyword)
        if entry is None:
            return None
        facts = entry.setdefault("facts", [])
        next_id = f"fact-{len(facts) + 1}"
        facts.append({
            "id": next_id,
            "label": fact_body["label"].strip(),
            "value": fact_body["value"].strip(),
            "source_name": fact_body["source_name"].strip(),
            "source_url": (fact_body.get("source_url") or "").strip(),
            # New facts always start unverified. A human must explicitly
            # approve a fact before it can be used in generated content.
            "verified": False,
        })
        _save(data)
        return entry


def set_fact_verified(keyword, fact_id, verified):
    with _lock:
        data = _load()
        entry = data.get(keyword)
        if entry is None:
            return None
        found = False
        for fact in entry.get("facts", []):
            if fact["id"] == fact_id:
                fact["verified"] = bool(verified)
                found = True
        if not found:
            return None
        _save(data)
        return entry


def delete_fact(keyword, fact_id):
    with _lock:
        data = _load()
        entry = data.get(keyword)
        if entry is None:
            return None
        entry["facts"] = [f for f in entry.get("facts", []) if f["id"] != fact_id]
        _save(data)
        return entry
