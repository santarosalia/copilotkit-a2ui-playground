import bookingSchema from "../../agent/src/a2ui/schemas/booking_form_schema.json";
import dashboardSchema from "../../agent/src/a2ui/schemas/dashboard_schema.json";
import flightSchema from "../../agent/src/a2ui/schemas/flight_schema.json";
import catalogMeta from "../../agent/src/a2ui/catalog.json";
import { frameFromOperation, type WireFrame } from "./wire";

export const CATALOG_ID = catalogMeta.catalogId;
export const PROTOCOL_VERSION = catalogMeta.protocolVersion;

type Operation = Record<string, unknown>;

function createSurface(surfaceId: string): Operation {
  return {
    version: "1.0",
    createSurface: { surfaceId, catalogId: CATALOG_ID },
  };
}

function updateComponents(surfaceId: string, components: unknown): Operation {
  return {
    version: "1.0",
    updateComponents: { surfaceId, components },
  };
}

function updateDataModel(surfaceId: string, value: unknown): Operation {
  return {
    version: "1.0",
    updateDataModel: { surfaceId, path: "/", value },
  };
}

const FLIGHTS = [
  {
    airline: "KE",
    flightNumber: "KE001",
    origin: "ICN",
    destination: "HND",
    departureTime: "09:10",
    arrivalTime: "11:30",
    duration: "2h 20m",
    status: "On Time",
    price: "$240",
  },
  {
    airline: "OZ",
    flightNumber: "OZ102",
    origin: "ICN",
    destination: "NRT",
    departureTime: "13:00",
    arrivalTime: "15:20",
    duration: "2h 20m",
    status: "Delayed",
    price: "$210",
  },
];

const METRICS = [
  { label: "항공", value: "$240", hint: "KE001" },
  { label: "숙박", value: "$180", hint: "시부야" },
];

export const SAMPLE_OPERATIONS = {
  flights: [
    createSurface("flight-results"),
    updateComponents("flight-results", flightSchema),
    updateDataModel("flight-results", { flights: FLIGHTS }),
  ],
  form: [
    createSurface("booking-form"),
    updateComponents("booking-form", bookingSchema),
    updateDataModel("booking-form", {
      form: {
        name: "김하늘",
        email: "haneul@example.com",
        date: "2026-12-03",
        seats: 1,
        windowSeat: true,
        note: "값을 고친 뒤 예약 요청을 누르세요",
      },
    }),
  ],
  dashboard: [
    createSurface("trip-dashboard"),
    updateComponents("trip-dashboard", dashboardSchema),
    updateDataModel("trip-dashboard", {
      title: "# 도쿄 출장",
      total: "$420",
      metrics: METRICS.slice(0, 1),
      alert: "",
    }),
    updateDataModel("trip-dashboard", {
      title: "# 도쿄 출장",
      total: "$420",
      metrics: METRICS,
      alert: "숙박 지표를 더했습니다",
    }),
  ],
} as const;

export type SampleId = keyof typeof SAMPLE_OPERATIONS;

export function sampleFrames(id: SampleId): WireFrame[] {
  return SAMPLE_OPERATIONS[id].flatMap((operation, index) => {
    const frame = frameFromOperation(operation, { messageId: `sample-${id}`, index });
    return frame ? [frame] : [];
  });
}
