"use client";

import { viewerTheme } from "@copilotkit/a2ui-renderer";
import {
  CopilotKit,
  createA2UIMessageRenderer,
} from "@copilotkit/react-core/v2";
import { useMemo } from "react";
import { playgroundCatalog } from "./declarative-generative-ui/renderers";
import { recordRendererAction } from "@/lib/wire-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const renderActivityMessages = useMemo(
    () => [
      createA2UIMessageRenderer({
        theme: viewerTheme as never,
        catalog: playgroundCatalog,
        onAction: (action) => {
          recordRendererAction(action);
        },
      }),
    ],
    [],
  );

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      a2ui={{ catalog: playgroundCatalog, includeSchema: true }}
      renderActivityMessages={renderActivityMessages}
      useSingleEndpoint={false}
      enableInspector={false}
    >
      {children}
    </CopilotKit>
  );
}
