"""Schema helpers and the fixed-schema operation sequences."""

from __future__ import annotations

import json

import pytest

from src.a2ui_v1 import (
    assert_component_tree,
    BOOKING_FORM_SCHEMA,
    CATALOG_ID,
    DASHBOARD_SCHEMA,
    FLIGHT_SCHEMA,
    PROTOCOL_VERSION,
    build_booking_form_operations,
    build_dashboard_operations,
    build_dashboard_patch_operations,
    build_flight_operations,
    child_template,
    parse_render,
    path_binding,
    render,
    update_data_model,
    upgrade_components,
)
from src.model import DEFAULT_MODEL_SPEC, parse_agent_model, resolve_model_spec


FLIGHTS = [
    {
        "airline": "KE",
        "flightNumber": "KE001",
        "origin": "ICN",
        "destination": "NRT",
        "departureTime": "09:10",
        "arrivalTime": "11:25",
        "duration": "2h 15m",
        "status": "On Time",
        "price": "$240",
    }
]

METRICS = [
    {"label": "항공", "value": "$240", "hint": "KE001"},
    {"label": "숙박", "value": "$180", "hint": "1박"},
]


def test_catalog_is_pinned_to_v1() -> None:
    assert CATALOG_ID == "playground://a2ui-catalog-v1"
    assert PROTOCOL_VERSION == "1.0"


def test_render_wraps_a2ui_operations_without_rewriting_version() -> None:
    payload = render(build_flight_operations(FLIGHTS))
    operations = parse_render(payload)
    assert operations[0]["version"] == "1.0"
    assert "v0.9" not in payload
    assert operations[0]["createSurface"]["catalogId"] == CATALOG_ID


def test_flight_schema_uses_v1_bindings_and_keeps_child_template_path() -> None:
    encoded = json.dumps(FLIGHT_SCHEMA)
    assert '"@path"' in encoded
    assert '"path": "airline"' not in encoded
    template = FLIGHT_SCHEMA[2]["children"]
    assert template == child_template("flightCard", "/flights")
    assert "@path" not in template


def test_booking_form_binds_inputs_and_submit_context() -> None:
    by_id = {component["id"]: component for component in BOOKING_FORM_SCHEMA}
    assert by_id["name"]["value"] == path_binding("/form/name")
    assert by_id["seats"]["value"] == path_binding("/form/seats")
    assert by_id["window"]["value"] == path_binding("/form/windowSeat")
    context = by_id["submit"]["action"]["event"]["context"]
    assert context["email"] == {"@path": "/form/email"}
    ops = build_booking_form_operations(
        {
            "name": "홍길동",
            "email": "a@b.c",
            "date": "2026-12-01",
            "seats": 2,
            "windowSeat": True,
            "note": "초안",
        }
    )
    assert ops[-1]["updateDataModel"]["value"]["form"]["seats"] == 2
    assert "value" in ops[-1]["updateDataModel"]


def test_dashboard_emits_an_incremental_data_update() -> None:
    ops = build_dashboard_operations(
        title="도쿄 출장",
        metrics=METRICS,
        total="$420",
        alert="숙박이 추가되었습니다",
    )
    assert [next(iter(op.keys() - {"version"})) for op in ops] == [
        "createSurface",
        "updateComponents",
        "updateDataModel",
        "updateDataModel",
    ]
    assert ops[2]["updateDataModel"]["value"]["metrics"] == METRICS[:1]
    assert ops[3]["updateDataModel"]["value"]["metrics"] == METRICS
    assert ops[3]["updateDataModel"]["value"]["alert"] == "숙박이 추가되었습니다"
    template = next(item for item in DASHBOARD_SCHEMA if item["id"] == "metrics")
    assert template["children"]["path"] == "/metrics"
    assert "@path" not in template["children"]


def test_dashboard_patch_repeats_create_for_the_same_surface() -> None:
    ops = build_dashboard_patch_operations(
        title="도쿄 출장",
        metrics=METRICS,
        total="$420",
        alert="갱신",
    )
    assert ops[0]["createSurface"]["surfaceId"] == "trip-dashboard"
    assert ops[-1]["updateDataModel"]["value"]["metrics"] == METRICS


def test_component_ids_reject_hyphens() -> None:
    with pytest.raises(ValueError, match="cannot contain"):
        assert_component_tree(
            [
                {"id": "root", "component": "Text"},
                {"id": "flight-card", "component": "FlightCard"},
            ]
        )


def test_update_data_model_requires_a_value_and_rejects_an_empty_path() -> None:
    message = update_data_model("trip-dashboard", None)
    assert message["updateDataModel"]["value"] is None
    with pytest.raises(ValueError):
        update_data_model("trip-dashboard", {}, path="")


def test_upgrade_rewrites_bindings_but_not_child_templates() -> None:
    upgraded = upgrade_components(
        [
            {
                "id": "root",
                "component": "Column",
                "children": {"componentId": "row", "path": "/items"},
            },
            {
                "id": "row",
                "component": "Text",
                "text": {"path": "label"},
                "extra": {"call": "formatString", "args": {"value": {"path": "/title"}}},
            },
        ]
    )
    assert upgraded[0]["children"] == {"componentId": "row", "path": "/items"}
    assert upgraded[1]["text"] == {"@path": "label"}
    assert upgraded[1]["extra"]["@call"] == "formatString"
    assert upgraded[1]["extra"]["args"]["value"] == {"@path": "/title"}


def test_default_model_spec_is_configurable(monkeypatch: pytest.MonkeyPatch) -> None:
    assert DEFAULT_MODEL_SPEC == "openai:gpt-6-luna"
    monkeypatch.delenv("COPILOTKIT_AGENT_MODEL", raising=False)
    assert resolve_model_spec() == "openai:gpt-6-luna"
    monkeypatch.setenv("COPILOTKIT_AGENT_MODEL", "openai:gpt-6-luna")
    assert parse_agent_model(resolve_model_spec()) == ("openai", "gpt-6-luna")
    with pytest.raises(ValueError):
        parse_agent_model("not-a-spec")
