/**
 * Classify A2UI envelopes the way the 1.0 spec names them.
 *
 * CopilotKit carries agent→renderer operations inside an AG-UI activity
 * (`activityType: "a2ui-surface"`, `content.a2ui_operations`). Renderer→agent
 * user actions are not a second socket: the chat runtime puts them on
 * `properties.a2uiAction` and starts another run. `frameFromUserAction`
 * shows that action as the spec's `action` message so the inspector can
 * teach the envelope. The `source` field says which of the two it is.
 */

export const AGENT_TO_RENDERER_KEYS = [
  "createSurface",
  "updateComponents",
  "updateDataModel",
  "deleteSurface",
  "callRendererFunction",
  "agentFunctionResponse",
] as const;

export const RENDERER_TO_AGENT_KEYS = [
  "action",
  "callAgentFunction",
  "rendererFunctionResponse",
  "error",
] as const;

export type AgentToRendererKind = (typeof AGENT_TO_RENDERER_KEYS)[number];
export type RendererToAgentKind = (typeof RENDERER_TO_AGENT_KEYS)[number];

export type WireFrame = {
  id: string;
  direction: "agent_to_renderer" | "renderer_to_agent";
  version: string;
  kind: string;
  surfaceId?: string;
  payload: unknown;
  source: "activity" | "normalized-action";
};

export type UserActionLike = {
  name: string;
  surfaceId: string;
  sourceComponentId: string;
  timestamp: string;
  context?: Record<string, unknown>;
  userMessage?: string;
};

type ActivityLike = {
  id?: string;
  role?: string;
  activityType?: string;
  content?: { a2ui_operations?: unknown };
};

export function operationKind(operation: Record<string, unknown>): string | null {
  for (const key of AGENT_TO_RENDERER_KEYS) {
    if (key in operation) return key;
  }
  for (const key of RENDERER_TO_AGENT_KEYS) {
    if (key in operation) return key;
  }
  return null;
}

export function surfaceIdOf(operation: Record<string, unknown>): string | undefined {
  const kind = operationKind(operation);
  if (!kind) return undefined;
  const body = operation[kind];
  if (!body || typeof body !== "object" || !("surfaceId" in body)) return undefined;
  const surfaceId = (body as { surfaceId?: unknown }).surfaceId;
  return typeof surfaceId === "string" ? surfaceId : undefined;
}

export function frameFromOperation(
  operation: unknown,
  identity: { messageId: string; index: number },
): WireFrame | null {
  if (!operation || typeof operation !== "object") return null;
  const record = operation as Record<string, unknown>;
  const kind = operationKind(record);
  if (!kind) return null;
  const direction = (AGENT_TO_RENDERER_KEYS as readonly string[]).includes(kind)
    ? "agent_to_renderer"
    : "renderer_to_agent";
  const version = typeof record.version === "string" ? record.version : "1.0";
  return {
    id: `${identity.messageId}:${identity.index}:${kind}`,
    direction,
    version,
    kind,
    surfaceId: surfaceIdOf(record),
    payload: operation,
    source: "activity",
  };
}

export function frameFromUserAction(action: UserActionLike): WireFrame {
  const payload = {
    version: "1.0",
    action: {
      name: action.name,
      surfaceId: action.surfaceId,
      sourceComponentId: action.sourceComponentId,
      timestamp: action.timestamp,
      ...(action.context ? { context: action.context } : {}),
      ...(action.userMessage ? { userMessage: action.userMessage } : {}),
    },
  };
  return {
    id: `action:${action.surfaceId}:${action.name}:${action.timestamp}`,
    direction: "renderer_to_agent",
    version: "1.0",
    kind: "action",
    surfaceId: action.surfaceId,
    payload,
    source: "normalized-action",
  };
}

export function framesFromActivityMessages(messages: readonly unknown[]): WireFrame[] {
  const frames: WireFrame[] = [];
  messages.forEach((message, messageIndex) => {
    if (!message || typeof message !== "object") return;
    const activity = message as ActivityLike;
    if (activity.role !== "activity" || activity.activityType !== "a2ui-surface") {
      return;
    }
    const operations = activity.content?.a2ui_operations;
    if (!Array.isArray(operations)) return;
    const messageId = activity.id ?? `activity-${messageIndex}`;
    operations.forEach((operation, index) => {
      const frame = frameFromOperation(operation, { messageId, index });
      if (frame) frames.push(frame);
    });
  });
  return frames;
}

export function operationsFromActivityMessages(messages: readonly unknown[]): unknown[] {
  return framesFromActivityMessages(messages).map((frame) => frame.payload);
}

/** Keep the latest createSurface and the updates that follow it, per surface. */
export function latestSurfaceOperations(
  operations: readonly unknown[],
): Map<string, unknown[]> {
  const groups = new Map<string, unknown[]>();
  for (const operation of operations) {
    if (!operation || typeof operation !== "object") continue;
    const record = operation as Record<string, unknown>;
    const surfaceId = surfaceIdOf(record);
    const kind = operationKind(record);
    if (!surfaceId || !kind) continue;
    if (kind === "createSurface") {
      groups.set(surfaceId, [operation]);
      continue;
    }
    const existing = groups.get(surfaceId);
    if (existing) existing.push(operation);
    else groups.set(surfaceId, [operation]);
  }
  return groups;
}

const TEMPLATE_KEYS = new Set(["componentId", "path"]);

/** Problems in component trees we author. Empty means the tree is 1.0-shaped. */
export function lintAuthoredComponents(components: readonly unknown[]): string[] {
  const problems: string[] = [];
  const ids: string[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (typeof record.id === "string" && typeof record.component === "string") {
      ids.push(record.id);
    }
    const keys = Object.keys(record);
    if (
      keys.length === 2 &&
      keys.every((key) => TEMPLATE_KEYS.has(key)) &&
      typeof record.componentId === "string"
    ) {
      if (typeof record.path !== "string") problems.push("child template path must be a string");
      return;
    }
    if (keys.length === 1 && keys[0] === "path") {
      problems.push("bare {path} binding; author {@path} instead");
    }
    if ("call" in record && !("@call" in record)) {
      problems.push("bare {call} binding; author {@call} instead");
    }
    Object.values(record).forEach(walk);
  };
  walk(components);
  if (ids.filter((id) => id === "root").length !== 1) {
    problems.push("expected exactly one root component");
  }
  if (new Set(ids).size !== ids.length) problems.push("duplicate component id");
  return problems;
}
