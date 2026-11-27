import { CopilotChatConfigurationProvider } from "@copilotkit/react-core/v2";
import { Playground } from "@/components/playground";
import { readinessFromEnv } from "@/lib/readiness";

export default function HomePage() {
  return (
    <CopilotChatConfigurationProvider agentId="default">
      <Playground initialReady={readinessFromEnv(process.env)} />
    </CopilotChatConfigurationProvider>
  );
}
