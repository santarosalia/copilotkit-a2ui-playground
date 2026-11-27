import { describe, expect, it } from "vitest";
import { CATALOG_ID, PROTOCOL_VERSION, SAMPLE_OPERATIONS } from "./lib/samples";
import { SCENARIOS } from "./lib/scenarios";
import { lintAuthoredComponents } from "./lib/wire";

describe("smoke", () => {
  it("ships four chat scenarios and three offline samples on protocol 1.0", () => {
    expect(SCENARIOS.map((scenario) => scenario.id)).toEqual([
      "flights",
      "form",
      "dashboard",
      "freeform",
    ]);
    expect(PROTOCOL_VERSION).toBe("1.0");
    expect(CATALOG_ID).toBe("playground://a2ui-catalog-v1");
    for (const operations of Object.values(SAMPLE_OPERATIONS)) {
      expect(operations.every((operation) => operation.version === "1.0")).toBe(true);
      const components = operations.find((operation) => "updateComponents" in operation)
        ?.updateComponents as { components?: unknown } | undefined;
      expect(lintAuthoredComponents((components?.components as unknown[]) ?? [])).toEqual([]);
    }
  });
});
