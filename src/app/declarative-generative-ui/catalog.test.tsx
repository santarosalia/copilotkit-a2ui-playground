import { DynamicStringSchemaV1 } from "@copilotkit/a2ui-renderer";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => cleanup());
import { z } from "zod";
import { playgroundCatalogDefinitions } from "./definitions";
import {
  FlightCardView,
  MetricTileView,
  PriceTagView,
  StatusPillView,
  invokeAction,
  playgroundCatalog,
} from "./renderers";

describe("playground catalog", () => {
  it("opts into A2UI 1.0 and keeps the basic catalog", () => {
    expect(playgroundCatalog.id).toBe("playground://a2ui-catalog-v1");
    expect(playgroundCatalog.protocolVersion).toBe("1.0");
    for (const name of ["Text", "Button", "TextField", "List", "FlightCard", "MetricTile"]) {
      expect(playgroundCatalog.components.has(name)).toBe(true);
    }
  });

  it("accepts {@path} on bound props, which z.string() rejects", () => {
    const binding = { "@path": "/flights/0/price" };
    expect(
      playgroundCatalogDefinitions.FlightCard.props.shape.price.safeParse(binding).success,
    ).toBe(true);
    expect(
      playgroundCatalogDefinitions.MetricTile.props.shape.label.safeParse(binding).success,
    ).toBe(true);
    expect(DynamicStringSchemaV1.safeParse(binding).success).toBe(true);
    expect(z.string().safeParse(binding).success).toBe(false);
  });
});

describe("custom components", () => {
  const flight = {
    airline: "KE",
    flightNumber: "KE001",
    origin: "ICN",
    destination: "HND",
    departureTime: "09:10",
    arrivalTime: "11:30",
    duration: "2h 20m",
    status: "On Time",
    price: "$240",
  };

  it("renders a flight card and dispatches its action", () => {
    const action = vi.fn();
    const view = render(<FlightCardView {...flight} action={action} />);
    expect(view.getByTestId("flight-card").textContent).toContain("ICN");
    expect(view.getByTestId("flight-card").textContent).toContain("$240");
    view.getByRole("button", { name: "이 편 선택" }).click();
    expect(action).toHaveBeenCalledOnce();
    invokeAction(undefined);
    invokeAction(action);
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("renders price, status, and metric tiles from resolved strings", () => {
    const view = render(
      <div>
        <PriceTagView amount="$420" caption="예상 합계" />
        <StatusPillView text="숙박 지표를 더했습니다" tone="warn" />
        <MetricTileView label="항공" value="$240" hint="KE001" />
        <StatusPillView text="" />
      </div>,
    );
    expect(view.getByTestId("price-tag").textContent).toContain("$420");
    expect(view.getByTestId("status-pill").textContent).toContain("숙박");
    expect(view.getByTestId("metric-tile").textContent).toContain("KE001");
    expect(view.getAllByTestId("status-pill")).toHaveLength(1);
  });
});
