/**
 * Playground catalog definitions (A2UI 1.0).
 *
 * Bound props use Dynamic*SchemaV1. A plain z.string() does not describe
 * {"@path": "..."}, so the binder leaves the object in place and React
 * throws error #31 when the renderer prints it.
 *
 * Layout components (Text, Row, Column, Card, List, Button, TextField,
 * CheckBox, Slider, DateTimeInput) come from the basic catalog. These four
 * names are the playground's own.
 */

import {
  ActionSchemaV1,
  DynamicStringSchemaV1,
} from "@copilotkit/a2ui-renderer";
import { z } from "zod";
import catalogMeta from "../../../agent/src/a2ui/catalog.json";

export const CATALOG_ID = catalogMeta.catalogId;
export const PROTOCOL_VERSION = catalogMeta.protocolVersion;

const tone = z.enum(["info", "ok", "warn", "alert"]);

export const playgroundCatalogDefinitions = {
  FlightCard: {
    description:
      "One flight offer. Every text prop may be a literal or an {@path} binding. action fires book_flight.",
    props: z.object({
      airline: DynamicStringSchemaV1,
      flightNumber: DynamicStringSchemaV1,
      origin: DynamicStringSchemaV1,
      destination: DynamicStringSchemaV1,
      departureTime: DynamicStringSchemaV1,
      arrivalTime: DynamicStringSchemaV1,
      duration: DynamicStringSchemaV1,
      status: DynamicStringSchemaV1,
      price: DynamicStringSchemaV1,
      action: ActionSchemaV1.optional(),
    }),
  },
  PriceTag: {
    description:
      "A price figure with a short caption. amount may be an {@path} binding. caption is literal.",
    props: z.object({
      amount: DynamicStringSchemaV1,
      caption: z.string().optional(),
    }),
  },
  StatusPill: {
    description:
      "A one-line status. text may be an {@path} binding. tone is a literal: info, ok, warn, or alert.",
    props: z.object({
      text: DynamicStringSchemaV1,
      tone: tone.optional(),
    }),
  },
  MetricTile: {
    description:
      "One dashboard figure. label, value, and hint may be {@path} bindings, including relative paths inside a list template.",
    props: z.object({
      label: DynamicStringSchemaV1,
      value: DynamicStringSchemaV1,
      hint: DynamicStringSchemaV1.optional(),
    }),
  },
};

export type PlaygroundCatalogDefinitions = typeof playgroundCatalogDefinitions;
