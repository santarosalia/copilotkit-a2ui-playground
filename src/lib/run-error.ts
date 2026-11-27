const TOOL_CALL_HINT =
  "도구 호출 JSON을 읽지 못했습니다. vLLM을 --enable-auto-tool-choice --tool-call-parser hermes 로 띄웠는지 확인하세요. Qwen3 채팅 모델의 파서는 hermes이고, Qwen3-Coder는 qwen3_xml입니다. 출력이 길면 JSON이 잘립니다.";

const CONNECTION_HINT =
  "vLLM에 연결하지 못했습니다. VLLM_BASE_URL(기본 http://localhost:8000/v1)에서 서버가 떠 있는지 확인하세요.";

function mentions(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

/** Turn a runtime or model failure into one short sentence for the banner. */
export function explainRunError(raw: string): string {
  const text = raw.toLowerCase();
  if (raw.includes("도구 호출 JSON을 끝까지")) return raw.slice(0, 700);
  if (
    mentions(text, [
      "econnrefused",
      "connection refused",
      "connecterror",
      "apiconnectionerror",
      "failed to fetch",
      "fetch failed",
      "und_err_connect",
    ])
  ) {
    return CONNECTION_HINT;
  }
  if (
    mentions(text, [
      "unterminated",
      "jsondecode",
      "json_decode",
      "invalid json",
      "tool call",
      "tool_call",
      "toolcall",
      "finish_reason",
      "length limit",
      "max_tokens",
      "outputparser",
    ])
  ) {
    return TOOL_CALL_HINT;
  }
  const clipped = raw.replace(/\s+/g, " ").trim();
  return clipped.length > 400 ? `${clipped.slice(0, 400)}…` : clipped || "요청에 실패했습니다.";
}
