/** What the browser may know. Never includes secret values. */
export type Readiness = {
  llmConfigured: boolean;
  model: string;
  agentUrl: string;
};

export const DEFAULT_MODEL_SPEC = "openai:gpt-6-luna";

export function readinessFromEnv(
  env: Record<string, string | undefined>,
): Readiness {
  return {
    llmConfigured: Boolean(env.OPENAI_API_KEY?.trim()),
    model: env.COPILOTKIT_AGENT_MODEL?.trim() || DEFAULT_MODEL_SPEC,
    agentUrl: env.AGENT_URL?.trim() || "http://localhost:8123",
  };
}
