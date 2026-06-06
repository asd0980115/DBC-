import io
import json
import os
import tempfile

import pandas as pd
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "沒有收到檔案"}), 400

    file = request.files["file"]
    if not file.filename.endswith((".xlsx", ".xls")):
        return jsonify({"error": "請上傳 Excel 檔案（.xlsx 或 .xls）"}), 400

    data = file.read()
    xl = pd.ExcelFile(io.BytesIO(data))
    sheets = xl.sheet_names

    # Read first sheet to get column names
    first_df = xl.parse(sheets[0], header=None)
    # Try to detect header row (first non-empty row)
    header_row = 0
    for i, row in first_df.iterrows():
        if row.notna().sum() >= 2:
            header_row = i
            break

    columns = first_df.iloc[header_row].fillna("").tolist()
    columns = [str(c).strip() for c in columns]

    # Store file in session via temp file
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
    tmp.write(data)
    tmp.close()

    return jsonify({
        "tmp_path": tmp.name,
        "sheets": sheets,
        "columns": columns,
        "header_row": header_row,
    })


@app.route("/api/analyze", methods=["POST"])
def analyze():
    body = request.get_json()
    tmp_path = body.get("tmp_path")
    sheets = body.get("sheets", [])  # list of sheet names to process
    header_row = int(body.get("header_row", 0))
    col_map = body.get("col_map", {})
    # col_map keys: client_name, is_new, fee, treatment

    if not tmp_path or not os.path.exists(tmp_path):
        return jsonify({"error": "找不到暫存檔案，請重新上傳"}), 400

    results = []
    xl = pd.ExcelFile(tmp_path)

    for sheet in sheets:
        df = xl.parse(sheet, header=header_row)
        df.columns = [str(c).strip() for c in df.columns]
        df = df.dropna(how="all")

        month_result = {"month": sheet, "new_clients": 0, "total_fee": 0, "treatments": {}}

        # Count new clients
        if col_map.get("is_new"):
            col = col_map["is_new"]
            if col in df.columns:
                new_vals = body.get("new_client_values", ["新", "Y", "y", "yes", "是", "1", "true", "True"])
                mask = df[col].astype(str).str.strip().isin([str(v) for v in new_vals])
                month_result["new_clients"] = int(mask.sum())

        # Sum fees
        if col_map.get("fee"):
            col = col_map["fee"]
            if col in df.columns:
                numeric = pd.to_numeric(df[col], errors="coerce")
                month_result["total_fee"] = float(numeric.sum())

        # Count treatments
        if col_map.get("treatment"):
            col = col_map["treatment"]
            if col in df.columns:
                counts = df[col].dropna().astype(str).str.strip()
                counts = counts[counts != ""]
                treatment_counts = counts.value_counts().to_dict()
                month_result["treatments"] = {k: int(v) for k, v in treatment_counts.items()}

        results.append(month_result)

    # Cleanup temp file
    try:
        os.unlink(tmp_path)
    except Exception:
        pass

    return jsonify({"results": results})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
