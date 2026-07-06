import os

MODEL = "claude-sonnet-5"
MAX_TOKENS = 2048


class ClaudeConfigError(Exception):
    pass


def generate_content(messages, system_prompt):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ClaudeConfigError(
            "尚未設定 ANTHROPIC_API_KEY 環境變數，無法呼叫 Claude API 生成內容。"
            "請在環境變數中設定有效的金鑰後再試一次。"
        )

    from anthropic import Anthropic

    client = Anthropic(api_key=api_key)
    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=system_prompt,
        messages=messages,
    )
    return "".join(block.text for block in response.content if block.type == "text")
