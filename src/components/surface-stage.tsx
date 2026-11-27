"use client";

import {
  A2UIProvider,
  A2UIRenderer,
  useA2UIActions,
  useA2UIError,
} from "@copilotkit/a2ui-renderer";
import { useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import { useEffect, useRef } from "react";
import { playgroundCatalog } from "@/app/declarative-generative-ui/renderers";
import { latestSurfaceOperations, type UserActionLike } from "@/lib/wire";
import { recordRendererAction } from "@/lib/wire-store";

function ApplyOperations({
  surfaceId,
  operations,
}: {
  surfaceId: string;
  operations: unknown[];
}) {
  const { processMessages, getSurface } = useA2UIActions();
  const applied = useRef("");
  useEffect(() => {
    // Dev strict mode runs this effect twice. A second createSurface for the
    // same id is an integrity error and blanks the card.
    const key = JSON.stringify(operations);
    if (applied.current === key) return;
    applied.current = key;
    const messages = operations as Array<Record<string, unknown>>;
    if (getSurface(surfaceId)) {
      processMessages([{ version: "1.0", deleteSurface: { surfaceId } }]);
    }
    processMessages(messages);
  }, [getSurface, operations, processMessages, surfaceId]);
  return null;
}

function SurfaceBody({ surfaceId }: { surfaceId: string }) {
  const error = useA2UIError();
  return (
    <div className="surface-block" data-testid={`surface-${surfaceId}`}>
      <p className="surface-id">{surfaceId}</p>
      {error ? <p role="alert">{error}</p> : null}
      <div className="a2ui-surface">
        <A2UIRenderer surfaceId={surfaceId} />
      </div>
    </div>
  );
}

type LooseCore = {
  properties?: Record<string, unknown>;
  setProperties: (properties: Record<string, unknown>) => void;
  runAgent: (input: { agent: unknown }) => Promise<unknown>;
};

async function forwardAction(core: LooseCore, agent: unknown, action: UserActionLike) {
  const previous = core.properties ?? {};
  core.setProperties({ ...previous, a2uiAction: { userAction: action } });
  try {
    await core.runAgent({ agent });
  } finally {
    const next = { ...(core.properties ?? {}) };
    delete next.a2uiAction;
    core.setProperties(next);
  }
}

export function SurfaceStage({
  operations,
  forwardActions,
}: {
  operations: readonly unknown[];
  forwardActions: boolean;
}) {
  const { agent } = useAgent({ agentId: "default" });
  const { copilotkit } = useCopilotKit();
  const groups = latestSurfaceOperations(operations);

  if (groups.size === 0) {
    return (
      <p className="empty">
        여기에 표면이 쌓입니다. 시나리오를 보내거나, 키 없이 샘플을 재생하세요.
      </p>
    );
  }

  return (
    <div className="stage-list">
      {Array.from(groups.entries()).map(([surfaceId, ops]) => {
        const signature = `${surfaceId}:${ops.length}:${JSON.stringify(ops.at(-1)).length}`;
        return (
          <A2UIProvider
            key={signature}
            catalog={playgroundCatalog}
            onAction={(message) => {
              const action = (
                message as { userAction?: UserActionLike }
              ).userAction;
              if (!action?.name || !action.surfaceId) return;
              recordRendererAction({
                name: action.name,
                surfaceId: action.surfaceId,
                sourceComponentId: action.sourceComponentId ?? "",
                timestamp: action.timestamp ?? new Date().toISOString(),
                context: action.context,
                userMessage: action.userMessage,
              });
              if (!forwardActions) return;
              void forwardAction(copilotkit as unknown as LooseCore, agent, {
                name: action.name,
                surfaceId: action.surfaceId,
                sourceComponentId: action.sourceComponentId ?? "",
                timestamp: action.timestamp ?? new Date().toISOString(),
                context: action.context,
                userMessage: action.userMessage,
              });
            }}
          >
            <ApplyOperations surfaceId={surfaceId} operations={ops} />
            <SurfaceBody surfaceId={surfaceId} />
          </A2UIProvider>
        );
      })}
    </div>
  );
}
