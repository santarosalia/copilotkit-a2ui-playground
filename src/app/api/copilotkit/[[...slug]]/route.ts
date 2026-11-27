import {
  CopilotRuntime,
  CopilotKitIntelligence,
  createCopilotEndpoint,
  InMemoryAgentRunner,
} from "@copilotkit/runtime/v2";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";
import { handle } from "hono/vercel";

/**
 * Runtime route, adapted from CopilotKit examples/integrations/langgraph-python (MIT).
 * A2UI middleware stays on, but the injected v0.9 `generate_a2ui` tool stays off.
 * The Python graph owns the 1.0 tools.
 * Without CPK_INTELLIGENCE_API_KEY the runner is in-memory. No other paid service.
 */

const agent = new LangGraphAgent({
  deploymentUrl: process.env.AGENT_URL || "http://localhost:8123",
  graphId: "sample_agent",
  langsmithApiKey: process.env.LANGSMITH_API_KEY || "",
});

const runtime = new CopilotRuntime({
  agents: { default: agent },
  ...(process.env.CPK_INTELLIGENCE_API_KEY
    ? {
        intelligence: new CopilotKitIntelligence({
          apiKey: process.env.CPK_INTELLIGENCE_API_KEY,
        }),
        // Demo identity. Replace this before any multi-user deployment.
        identifyUser: () => ({ id: "playground-user", name: "Playground" }),
      }
    : {
        runner: new InMemoryAgentRunner(),
        // Local single-user playground. Do not use access:"open" if more than
        // one person can reach this server.
        threads: { access: "open" },
      }),
  a2ui: {
    injectA2UITool: false,
  },
});

const app = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
