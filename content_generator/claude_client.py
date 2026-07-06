import os

MODEL = "claude-opus-4-8"
MAX_TOKENS = 8000
MAX_SEARCH_USES = 6


class ClaudeConfigError(Exception):
    pass


def _extract_result(response):
    text_parts = []
    sources = []
    seen_urls = set()

    def add_source(url, title):
        if url and url not in seen_urls:
            seen_urls.add(url)
            sources.append({"title": title or url, "url": url})

    for block in response.content:
        if block.type == "text":
            text_parts.append(block.text)
            for citation in (getattr(block, "citations", None) or []):
                add_source(getattr(citation, "url", None), getattr(citation, "title", None))
        elif block.type == "web_search_tool_result":
            content = block.content
            if isinstance(content, list):
                for item in content:
                    add_source(getattr(item, "url", None), getattr(item, "title", None))

    return {
        "text": "".join(text_parts).strip(),
        "sources": sources,
        "stop_reason": response.stop_reason,
    }


def generate_content(user_message, system_prompt):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ClaudeConfigError(
            "尚未設定 ANTHROPIC_API_KEY 環境變數，無法呼叫 Claude API 生成內容。"
            "請在環境變數中設定有效的金鑰後再試一次。"
        )

    from anthropic import Anthropic

    client = Anthropic(api_key=api_key)
    tools = [{
        "type": "web_search_20260209",
        "name": "web_search",
        "max_uses": MAX_SEARCH_USES,
    }]
    messages = [{"role": "user", "content": user_message}]

    while True:
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            thinking={"type": "adaptive"},
            output_config={"effort": "high"},
            system=system_prompt,
            tools=tools,
            messages=messages,
        )

        if response.stop_reason == "refusal":
            raise ClaudeConfigError("Claude 因安全考量拒絕了這個請求，請調整關鍵字後再試一次。")

        if response.stop_reason != "pause_turn":
            return _extract_result(response)

        messages = messages + [{"role": "assistant", "content": response.content}]
