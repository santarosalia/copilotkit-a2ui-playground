import { describe, expect, it } from "vitest";
import { explainRunError } from "./run-error";

describe("explainRunError", () => {
  it("names the vLLM flags when tool-call JSON breaks", () => {
    const message = explainRunError(
      "JSONDecodeError: Unterminated string starting at position 120 while parsing tool_call arguments",
    );
    expect(message).toContain("--enable-auto-tool-choice");
    expect(message).toContain("hermes");
    expect(message).toContain("qwen3_xml");
  });

  it("points at VLLM_BASE_URL when the server is down", () => {
    expect(explainRunError("fetch failed: connect ECONNREFUSED 127.0.0.1:8000")).toContain(
      "http://localhost:8000/v1",
    );
  });

  it("keeps an already-explained agent message and clips noise", () => {
    expect(explainRunError("vLLM이 도구 호출 JSON을 끝까지 주지 못했습니다. hermes")).toContain(
      "hermes",
    );
    expect(explainRunError("x".repeat(900)).length).toBeLessThan(420);
  });
});
