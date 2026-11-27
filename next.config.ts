import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  // Next.js 16 writes agent rule files when it detects a coding agent.
  agentRules: false,
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) },
  serverExternalPackages: ["@copilotkit/runtime"],
};

export default nextConfig;
