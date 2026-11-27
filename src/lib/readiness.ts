/** What the browser may know. Never includes secret values. */

export const DEFAULT_VLLM_BASE_URL = "http://localhost:8000/v1";
export const DEFAULT_VLLM_MODEL = "Qwen/Qwen3-8B";
export const DEFAULT_OPENAI_SPEC = "openai:gpt-6-luna";

export type Readiness = {
  provider: "vllm" | "openai";
  llmConfigured: boolean;
  model: string;
  baseUrl: string;
  agentUrl: string;
};

export function readinessFromEnv(
  env: Record<string, string | undefined>,
): Readiness {
  const agentUrl = env.AGENT_URL?.trim() || "http://localhost:8123";
  const vllmBase = env.VLLM_BASE_URL?.trim().replace(/\/$/, "");
  const openaiKey = Boolean(env.OPENAI_API_KEY?.trim());
  const openaiSpec = env.COPILOTKIT_AGENT_MODEL?.trim();

  if (vllmBase || (!openaiKey && !openaiSpec)) {
    return {
      provider: "vllm",
      llmConfigured: true,
      model: env.VLLM_MODEL?.trim() || DEFAULT_VLLM_MODEL,
      baseUrl: vllmBase || DEFAULT_VLLM_BASE_URL,
      agentUrl,
    };
  }

  return {
    provider: "openai",
    llmConfigured: openaiKey,
    model: openaiSpec || DEFAULT_OPENAI_SPEC,
    baseUrl: "",
    agentUrl,
  };
}
