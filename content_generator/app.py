from flask import Flask, jsonify, render_template, request

from claude_client import ClaudeConfigError, generate_content
from prompt_builder import SYSTEM_PROMPT, build_user_message

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/generate", methods=["POST"])
def api_generate():
    body = request.get_json(force=True) or {}
    keyword = (body.get("keyword") or "").strip()
    specialty = (body.get("specialty") or "").strip()
    doctor_name = (body.get("doctor_name") or "").strip()

    if not keyword:
        return jsonify({"error": "請輸入關鍵字"}), 400

    user_message = build_user_message(keyword, specialty, doctor_name)

    try:
        result = generate_content(user_message, SYSTEM_PROMPT)
    except ClaudeConfigError as e:
        return jsonify({"error": str(e)}), 500

    if not result["text"]:
        return jsonify({"error": "生成失敗，請重新嘗試。"}), 500

    return jsonify({
        "keyword": keyword,
        "content": result["text"],
        "sources": result["sources"],
    })


if __name__ == "__main__":
    app.run(debug=True, port=5001)
