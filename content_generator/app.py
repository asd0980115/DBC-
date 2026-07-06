from datetime import date

from flask import Flask, jsonify, render_template, request

from claude_client import ClaudeConfigError, generate_content
from knowledge_base import (
    add_fact,
    delete_fact,
    get_keyword_entry,
    list_keywords,
    set_fact_verified,
    upsert_keyword,
)
from prompt_builder import SYSTEM_PROMPT, build_generation_messages

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/keywords")
def api_list_keywords():
    return jsonify(list_keywords())


@app.route("/api/kb/<path:keyword>")
def api_get_keyword(keyword):
    entry = get_keyword_entry(keyword)
    if entry is None:
        return jsonify({"error": "找不到此關鍵字"}), 404
    return jsonify(entry)


@app.route("/api/kb", methods=["POST"])
def api_upsert_keyword():
    body = request.get_json(force=True) or {}
    keyword = (body.get("keyword") or "").strip()
    if not keyword:
        return jsonify({"error": "keyword 為必填"}), 400
    entry = upsert_keyword(keyword, body)
    return jsonify(entry)


@app.route("/api/kb/<path:keyword>/facts", methods=["POST"])
def api_add_fact(keyword):
    body = request.get_json(force=True) or {}
    for field in ("label", "value", "source_name"):
        if not (body.get(field) or "").strip():
            return jsonify({"error": f"{field} 為必填"}), 400
    entry = add_fact(keyword, body)
    if entry is None:
        return jsonify({"error": "找不到此關鍵字，請先建立關鍵字條目"}), 404
    return jsonify(entry)


@app.route("/api/kb/<path:keyword>/facts/<fact_id>/verify", methods=["POST"])
def api_verify_fact(keyword, fact_id):
    body = request.get_json(force=True) or {}
    entry = set_fact_verified(keyword, fact_id, body.get("verified", True))
    if entry is None:
        return jsonify({"error": "找不到此關鍵字或數據"}), 404
    return jsonify(entry)


@app.route("/api/kb/<path:keyword>/facts/<fact_id>", methods=["DELETE"])
def api_delete_fact(keyword, fact_id):
    entry = delete_fact(keyword, fact_id)
    if entry is None:
        return jsonify({"error": "找不到此關鍵字"}), 404
    return jsonify(entry)


@app.route("/api/generate", methods=["POST"])
def api_generate():
    body = request.get_json(force=True) or {}
    keyword = (body.get("keyword") or "").strip()
    doctor_name = (body.get("doctor_name") or "").strip()
    last_updated = (body.get("last_updated") or "").strip() or date.today().strftime("%Y年%m月")

    if not keyword:
        return jsonify({"error": "keyword 為必填"}), 400

    entry = get_keyword_entry(keyword)
    if entry is None:
        return jsonify({"error": "找不到此關鍵字，請先在知識庫建立資料"}), 404

    verified_facts = [f for f in entry.get("facts", []) if f.get("verified")]
    if not verified_facts:
        return jsonify({
            "error": (
                "此關鍵字尚無「已審核」的醫學數據，請先在知識庫新增數據並由醫療專業人員"
                "標記為已審核（verified）後再生成，以避免產出未經查證的醫學數字。"
            )
        }), 400

    messages = build_generation_messages(
        keyword=keyword,
        entry=entry,
        verified_facts=verified_facts,
        doctor_name=doctor_name,
        last_updated=last_updated,
    )

    try:
        content = generate_content(messages, SYSTEM_PROMPT)
    except ClaudeConfigError as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "keyword": keyword,
        "sources_used": [
            {
                "label": f["label"],
                "source_name": f["source_name"],
                "source_url": f.get("source_url", ""),
            }
            for f in verified_facts
        ],
        "content": content,
    })


if __name__ == "__main__":
    app.run(debug=True, port=5001)
