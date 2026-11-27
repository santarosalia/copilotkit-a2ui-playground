"""A2UI 1.0 operation builders.

CopilotKit's ``copilotkit.a2ui`` helpers still emit ``version: "v0.9"``.
The playground catalogs speak 1.0 (``@path`` / ``@call``), so tools in this
package build the envelopes themselves and only reuse ``a2ui.render`` to wrap
them in the ``a2ui_operations`` container the AG-UI middleware recognizes.

Child-list templates keep an unprefixed ``path``. ``updateDataModel.path`` is
also unprefixed. Do not blanket-rewrite every ``path`` key.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from copilotkit import a2ui as cpk_a2ui

_A2UI_DIR = Path(__file__).resolve().parent / "a2ui"
_CATALOG = json.loads((_A2UI_DIR / "catalog.json").read_text(encoding="utf-8"))

CATALOG_ID: str = _CATALOG["catalogId"]
PROTOCOL_VERSION: str = _CATALOG["protocolVersion"]

FLIGHT_SURFACE_ID = "flight-results"
BOOKING_SURFACE_ID = "booking-form"
DASHBOARD_SURFACE_ID = "trip-dashboard"

_SCHEMAS = _A2UI_DIR / "schemas"
FLIGHT_SCHEMA: list[dict[str, Any]] = json.loads(
    (_SCHEMAS / "flight_schema.json").read_text(encoding="utf-8")
)
BOOKING_FORM_SCHEMA: list[dict[str, Any]] = json.loads(
    (_SCHEMAS / "booking_form_schema.json").read_text(encoding="utf-8")
)
DASHBOARD_SCHEMA: list[dict[str, Any]] = json.loads(
    (_SCHEMAS / "dashboard_schema.json").read_text(encoding="utf-8")
)


def path_binding(pointer: str) -> dict[str, str]:
    """A 1.0 data binding. ``pointer`` is a JSON pointer, absolute or relative."""
    return {"@path": pointer}


def call_binding(name: str, args: dict[str, Any] | None = None) -> dict[str, Any]:
    """A 1.0 function call. RPC results are not modeled here."""
    return {"@call": name, "args": args or {}}


def child_template(component_id: str, pointer: str) -> dict[str, str]:
    """List/Row/Column template. ``path`` stays unprefixed on purpose."""
    return {"componentId": component_id, "path": pointer}


def create_surface(
    surface_id: str,
    *,
    catalog_id: str = CATALOG_ID,
    components: list[dict[str, Any]] | None = None,
    data_model: Any = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"surfaceId": surface_id, "catalogId": catalog_id}
    if components is not None:
        payload["components"] = components
    if data_model is not None:
        payload["dataModel"] = data_model
    return {"version": "1.0", "createSurface": payload}


def update_components(
    surface_id: str, components: list[dict[str, Any]]
) -> dict[str, Any]:
    return {
        "version": "1.0",
        "updateComponents": {"surfaceId": surface_id, "components": components},
    }


def update_data_model(
    surface_id: str, value: Any, *, path: str = "/"
) -> dict[str, Any]:
    """``value`` is required in 1.0. ``null`` deletes the key at ``path``."""
    if path == "":
        raise ValueError("updateDataModel path must be a JSON pointer")
    return {
        "version": "1.0",
        "updateDataModel": {
            "surfaceId": surface_id,
            "path": path,
            "value": value,
        },
    }


def delete_surface(surface_id: str) -> dict[str, Any]:
    return {"version": "1.0", "deleteSurface": {"surfaceId": surface_id}}


def render(operations: list[dict[str, Any]]) -> str:
    """Serialize operations for the CopilotKit A2UI middleware."""
    return cpk_a2ui.render(operations)


def parse_render(payload: str) -> list[dict[str, Any]]:
    data = json.loads(payload)
    operations = data.get(cpk_a2ui.A2UI_OPERATIONS_KEY)
    if not isinstance(operations, list):
        raise ValueError("render payload is missing a2ui_operations")
    return operations


def _upgrade(value: Any) -> Any:
    if isinstance(value, list):
        return [_upgrade(item) for item in value]
    if not isinstance(value, dict):
        return value
    # ChildList template: path is a structural pointer, not a binding.
    if "componentId" in value and "path" in value and "@path" not in value:
        return {
            key: value[key] if key == "path" else _upgrade(item)
            for key, item in value.items()
        }
    keys = set(value.keys())
    if keys == {"path"} and isinstance(value.get("path"), str):
        return {"@path": value["path"]}
    if "call" in value and "@call" not in value and "args" in value:
        upgraded = {"@call": value["call"], "args": _upgrade(value.get("args", {}))}
        if "catalogId" in value:
            upgraded["catalogId"] = value["catalogId"]
        return upgraded
    return {key: _upgrade(item) for key, item in value.items()}


def upgrade_components(components: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Rewrite v0.9 dynamic values inside a component tree to 1.0.

    Leaves child-list ``path`` fields and ordinary data alone. Not a general
    payload migrator: call it on component arrays only.
    """
    return [_upgrade(component) for component in components]


def component_ids(components: list[dict[str, Any]]) -> list[str]:
    return [str(component.get("id")) for component in components]


def assert_component_tree(components: list[dict[str, Any]]) -> None:
    ids = component_ids(components)
    if ids.count("root") != 1:
        raise ValueError("a surface needs exactly one component with id 'root'")
    if len(ids) != len(set(ids)):
        raise ValueError(f"duplicate component ids: {ids}")
    # A2UI 1.0 component ids follow UAX #31. Hyphens are rejected by the renderer.
    hyphenated = [component_id for component_id in ids if "-" in component_id]
    if hyphenated:
        raise ValueError(f"component ids cannot contain '-': {hyphenated}")


def _walk_bindings(value: Any, *, in_template: bool = False) -> list[str]:
    """Return human-readable problems for mixed v0.9 bindings."""
    problems: list[str] = []
    if isinstance(value, list):
        for item in value:
            problems.extend(_walk_bindings(item))
        return problems
    if not isinstance(value, dict):
        return problems
    if "componentId" in value and "path" in value:
        if "@path" in value:
            problems.append("child template must not also carry @path")
        return problems
    if "path" in value and "@path" not in value and set(value.keys()) <= {"path"}:
        problems.append("bare {path} binding; 1.0 uses {@path}")
    if "call" in value and "@call" not in value:
        problems.append("bare {call} binding; 1.0 uses {@call}")
    for item in value.values():
        problems.extend(_walk_bindings(item))
    return problems


def assert_v1_components(components: list[dict[str, Any]]) -> None:
    assert_component_tree(components)
    problems = _walk_bindings(components)
    if problems:
        raise ValueError("; ".join(problems))


def build_flight_operations(flights: list[dict[str, Any]]) -> list[dict[str, Any]]:
    assert_v1_components(FLIGHT_SCHEMA)
    return [
        create_surface(FLIGHT_SURFACE_ID),
        update_components(FLIGHT_SURFACE_ID, FLIGHT_SCHEMA),
        update_data_model(FLIGHT_SURFACE_ID, {"flights": flights}),
    ]


def build_booking_form_operations(form: dict[str, Any]) -> list[dict[str, Any]]:
    assert_v1_components(BOOKING_FORM_SCHEMA)
    return [
        create_surface(BOOKING_SURFACE_ID),
        update_components(BOOKING_SURFACE_ID, BOOKING_FORM_SCHEMA),
        update_data_model(BOOKING_SURFACE_ID, {"form": form}),
    ]


def build_dashboard_operations(
    *,
    title: str,
    metrics: list[dict[str, Any]],
    total: str,
    alert: str,
) -> list[dict[str, Any]]:
    """Create the dashboard, then update the data model in place.

    The second ``updateDataModel`` is the incremental paint: same surface,
    fuller list, plus the alert line. CopilotKit applies the array in order
    inside one ``a2ui-surface`` activity.
    """
    assert_v1_components(DASHBOARD_SCHEMA)
    if not metrics:
        raise ValueError("dashboard needs at least one metric")
    preview = {
        "title": title,
        "total": total,
        "metrics": metrics[:1],
        "alert": "",
    }
    full = {
        "title": title,
        "total": total,
        "metrics": metrics,
        "alert": alert,
    }
    return [
        create_surface(DASHBOARD_SURFACE_ID),
        update_components(DASHBOARD_SURFACE_ID, DASHBOARD_SCHEMA),
        update_data_model(DASHBOARD_SURFACE_ID, preview),
        update_data_model(DASHBOARD_SURFACE_ID, full),
    ]


def build_dashboard_patch_operations(
    *,
    title: str,
    metrics: list[dict[str, Any]],
    total: str,
    alert: str,
) -> list[dict[str, Any]]:
    """A later turn sends a full 1.0 snapshot for the same surface id.

    Each chat activity hosts its own renderer, so a bare updateDataModel in a
    new activity has no surface to update. Repeating createSurface lets that
    card paint, and the playground stage folds it into the existing surface.
    """
    assert_v1_components(DASHBOARD_SCHEMA)
    return [
        create_surface(DASHBOARD_SURFACE_ID),
        update_components(DASHBOARD_SURFACE_ID, DASHBOARD_SCHEMA),
        update_data_model(
            DASHBOARD_SURFACE_ID,
            {"title": title, "total": total, "metrics": metrics, "alert": alert},
        ),
    ]
