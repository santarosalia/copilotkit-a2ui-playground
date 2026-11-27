"use client";

/**
 * React renderers for the playground catalog.
 *
 * Adapted in structure from CopilotKit examples/integrations/langgraph-python
 * (MIT). The catalog opts into A2UI 1.0 and merges basicCatalogV1.
 */

import {
  createCatalog,
  type CatalogRenderers,
} from "@copilotkit/a2ui-renderer";
import {
  CATALOG_ID,
  PROTOCOL_VERSION,
  playgroundCatalogDefinitions,
  type PlaygroundCatalogDefinitions,
} from "./definitions";

export type FlightCardProps = {
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  status: string;
  price: string;
  action?: unknown;
};

export function invokeAction(action: unknown): void {
  if (typeof action === "function") {
    (action as () => void)();
  }
}

function statusTone(status: string): "ok" | "warn" | "alert" | "info" {
  if (/cancel/i.test(status)) return "alert";
  if (/delay/i.test(status)) return "warn";
  if (/time|정시/i.test(status)) return "ok";
  return "info";
}

export function FlightCardView(props: FlightCardProps) {
  const tone = statusTone(String(props.status ?? ""));
  return (
    <article className="flight-card" data-testid="flight-card">
      <header>
        <span className="mono">{props.airline}</span>
        <span className="flight-price">{props.price}</span>
      </header>
      <p className="flight-route">
        <strong>{props.origin}</strong>
        <span aria-hidden="true">→</span>
        <strong>{props.destination}</strong>
      </p>
      <p className="flight-times">
        <span>{props.departureTime}</span>
        <span>{props.duration}</span>
        <span>{props.arrivalTime}</span>
      </p>
      <footer>
        <StatusPillView text={props.flightNumber} tone="info" />
        <StatusPillView text={String(props.status ?? "")} tone={tone} />
        <button
          type="button"
          className="text-button"
          onClick={() => invokeAction(props.action)}
        >
          이 편 선택
        </button>
      </footer>
    </article>
  );
}

export function PriceTagView({
  amount,
  caption,
}: {
  amount: string;
  caption?: string;
}) {
  return (
    <p className="price-tag" data-testid="price-tag">
      {caption ? <span>{caption}</span> : null}
      <strong>{amount}</strong>
    </p>
  );
}

export function StatusPillView({
  text,
  tone = "info",
}: {
  text: string;
  tone?: "info" | "ok" | "warn" | "alert";
}) {
  if (!text) return null;
  return (
    <span className={`status-pill tone-${tone}`} data-testid="status-pill">
      {text}
    </span>
  );
}

export function MetricTileView({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="metric-tile" data-testid="metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <em>{hint}</em> : null}
    </article>
  );
}

function asText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

const renderers: CatalogRenderers<PlaygroundCatalogDefinitions> = {
  FlightCard: ({ props }) => (
    <FlightCardView
      airline={asText(props.airline)}
      flightNumber={asText(props.flightNumber)}
      origin={asText(props.origin)}
      destination={asText(props.destination)}
      departureTime={asText(props.departureTime)}
      arrivalTime={asText(props.arrivalTime)}
      duration={asText(props.duration)}
      status={asText(props.status)}
      price={asText(props.price)}
      action={props.action}
    />
  ),
  PriceTag: ({ props }) => (
    <PriceTagView amount={asText(props.amount)} caption={props.caption} />
  ),
  StatusPill: ({ props }) => (
    <StatusPillView text={asText(props.text)} tone={props.tone} />
  ),
  MetricTile: ({ props }) => (
    <MetricTileView
      label={asText(props.label)}
      value={asText(props.value)}
      hint={props.hint ? asText(props.hint) : undefined}
    />
  ),
};

export const playgroundCatalog = createCatalog(
  playgroundCatalogDefinitions,
  renderers,
  {
    catalogId: CATALOG_ID,
    protocolVersion: PROTOCOL_VERSION === "1.0" ? "1.0" : "v0.9",
    includeBasicCatalog: true,
  },
);
