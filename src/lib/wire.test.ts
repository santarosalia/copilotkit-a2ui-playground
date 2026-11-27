import { describe, expect, it } from "vitest";
import bookingSchema from "../../agent/src/a2ui/schemas/booking_form_schema.json";
import dashboardSchema from "../../agent/src/a2ui/schemas/dashboard_schema.json";
import flightSchema from "../../agent/src/a2ui/schemas/flight_schema.json";
import { SAMPLE_OPERATIONS, sampleFrames } from "./samples";
import { readinessFromEnv } from "./readiness";
import {
  frameFromUserAction,
  framesFromActivityMessages,
  latestSurfaceOperations,
  lintAuthoredComponents,
} from "./wire";

describe("authored schemas stay on A2UI 1.0 bindings", () => {
  it("rejects bare path bindings and keeps child templates", () => {
    expect(lintAuthoredComponents(flightSchema)).toEqual([]);
    expect(lintAuthoredComponents(bookingSchema)).toEqual([]);
    expect(lintAuthoredComponents(dashboardSchema)).toEqual([]);
    const template = (flightSchema as Array<{ id: string; children?: unknown }>).find(
      (component) => component.id === "cards",
    );
    expect(template?.children).toEqual({ componentId: "flightCard", path: "/flights" });
  });
});

describe("wire frames", () => {
  it("reads agent_to_renderer operations out of an a2ui-surface activity", () => {
    const frames = framesFromActivityMessages([
      { id: "user-1", role: "user", content: "항공편" },
      {
        id: "act-1",
        role: "activity",
        activityType: "a2ui-surface",
        content: { a2ui_operations: SAMPLE_OPERATIONS.flights },
      },
    ]);
    expect(frames.map((frame) => frame.kind)).toEqual([
      "createSurface",
      "updateComponents",
      "updateDataModel",
    ]);
    expect(frames.every((frame) => frame.direction === "agent_to_renderer")).toBe(true);
    expect(frames[0]?.version).toBe("1.0");
    expect(frames[0]?.surfaceId).toBe("flight-results");
  });

  it("normalizes a user action into a renderer_to_agent envelope", () => {
    const frame = frameFromUserAction({
      name: "book_flight",
      surfaceId: "flight-results",
      sourceComponentId: "flight-card",
      timestamp: "2026-11-27T00:00:00.000Z",
      context: { flightNumber: "KE001" },
    });
    expect(frame.direction).toBe("renderer_to_agent");
    expect(frame.kind).toBe("action");
    expect(frame.payload).toMatchObject({
      version: "1.0",
      action: { name: "book_flight", context: { flightNumber: "KE001" } },
    });
  });

  it("folds a later createSurface into the latest snapshot", () => {
    const groups = latestSurfaceOperations([
      ...SAMPLE_OPERATIONS.dashboard,
      ...SAMPLE_OPERATIONS.dashboard.slice(0, 1),
      SAMPLE_OPERATIONS.dashboard[3],
    ]);
    const ops = groups.get("trip-dashboard");
    expect(ops).toHaveLength(2);
    expect(ops?.[0]).toMatchObject({ createSurface: { surfaceId: "trip-dashboard" } });
  });

  it("exposes the incremental dashboard sample as four frames", () => {
    expect(sampleFrames("dashboard").map((frame) => frame.kind)).toEqual([
      "createSurface",
      "updateComponents",
      "updateDataModel",
      "updateDataModel",
    ]);
  });
});

describe("readiness", () => {
  it("prefers vLLM and never returns a secret", () => {
    const vllm = readinessFromEnv({
      VLLM_BASE_URL: "http://localhost:8000/v1/",
      VLLM_MODEL: "Qwen/Qwen3-8B",
      VLLM_API_KEY: "local-secret",
      OPENAI_API_KEY: "sk-test",
    });
    expect(vllm.provider).toBe("vllm");
    expect(vllm.llmConfigured).toBe(true);
    expect(vllm.model).toBe("Qwen/Qwen3-8B");
    expect(vllm.baseUrl).toBe("http://localhost:8000/v1");
    expect(JSON.stringify(vllm)).not.toContain("local-secret");
    expect(JSON.stringify(vllm)).not.toContain("sk-test");

    const fallback = readinessFromEnv({
      OPENAI_API_KEY: "sk-test",
      COPILOTKIT_AGENT_MODEL: "openai:gpt-6-luna",
    });
    expect(fallback.provider).toBe("openai");
    expect(fallback.model).toBe("openai:gpt-6-luna");
    expect(JSON.stringify(fallback)).not.toContain("sk-test");

    expect(readinessFromEnv({}).provider).toBe("vllm");
    expect(readinessFromEnv({}).model).toBe("Qwen/Qwen3-8B");
  });
});
