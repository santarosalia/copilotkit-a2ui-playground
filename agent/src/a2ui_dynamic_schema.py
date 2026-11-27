"""Dynamic A2UI 1.0 tool.

A secondary model call fills ``render_a2ui``. We upgrade any v0.9
``{path}`` / ``{call}`` values inside the component tree before wrapping
the operations. Child-list templates are left alone.

CopilotKit does not yet complete the 1.0 RPC pair
(``callRendererFunction`` / ``callAgentFunction``). This tool must not emit
those messages. Actions use the ``action.event`` object instead.
"""

from __future__ import annotations

import json
from typing import Any

from copilotkit import a2ui as cpk_a2ui
from langchain.tools import ToolRuntime, tool
from langchain_core.messages import SystemMessage
from langchain_core.tools import tool as lc_tool

from src.a2ui_v1 import (
    CATALOG_ID,
    create_surface,
    render,
    update_components,
    update_data_model,
    upgrade_components,
)
from src.model import create_chat_model, explain_tool_call_failure

V1_GUIDELINES = """
Generate A2UI version 1.0 components for catalog playground://a2ui-catalog-v1.

Rules:
- Exactly one component has id "root". Ids are unique. Children are id references.
- Data bindings are {"@path": "/pointer"} or a relative {"@path": "field"} inside a template.
- Function calls are {"@call": "formatString", "args": {"value": "Hello ${/name}"}}.
- A repeating child is {"componentId": "templateId", "path": "/items"} — path is NOT prefixed.
- Do not emit callRendererFunction, callAgentFunction, or version "v0.9".
- Text headings are Markdown in Text.text ("# Title"). Text.variant is only caption or body.
- TextField, CheckBox, and Slider values that the user edits must be @path bindings.
- Button.action is {"event": {"name": "...", "context": {...}}}. Button.child is a Text id.
- Prefer the basic components (Text, Row, Column, Card, List, Button, TextField) plus
  FlightCard, PriceTag, StatusPill, and MetricTile.
- Do not invent component names.
"""


@lc_tool
def render_a2ui(
    surfaceId: str,
    components: list[dict],
    data: dict | None = None,
    catalogId: str = CATALOG_ID,
) -> str:
    """Render one A2UI 1.0 surface. The root component id must be "root"."""
    return "rendered"


@tool
def generate_a2ui(runtime: ToolRuntime[Any]) -> str:
    """Draw a freeform A2UI 1.0 card from the conversation.

    Use this only when the user asks for a custom layout that is not a flight
    card, the booking form, or the trip dashboard.
    """
    state = runtime.state
    messages = list(state.get("messages", []))[:-1]
    context_entries = state.get("copilotkit", {}).get("context", [])
    context_text = "\n\n".join(
        entry.get("value", "")
        for entry in context_entries
        if isinstance(entry, dict) and entry.get("value")
    )
    prompt = V1_GUIDELINES + ("\n\nCatalog context:\n" + context_text if context_text else "")

    model = create_chat_model()
    model_with_tool = model.bind_tools([render_a2ui], tool_choice="render_a2ui")
    try:
        response = model_with_tool.invoke([SystemMessage(content=prompt), *messages])
    except Exception as exc:  # noqa: BLE001 — surface a short reason, do not dump the payload
        return json.dumps({"error": explain_tool_call_failure(str(exc))}, ensure_ascii=False)
    if not getattr(response, "tool_calls", None):
        return json.dumps(
            {"error": explain_tool_call_failure("LLM did not call render_a2ui")},
            ensure_ascii=False,
        )

    raw_args = response.tool_calls[0]["args"]
    if isinstance(raw_args, str):
        try:
            raw_args = json.loads(raw_args)
        except json.JSONDecodeError as exc:
            return json.dumps(
                {"error": explain_tool_call_failure(str(exc))},
                ensure_ascii=False,
            )
    if not isinstance(raw_args, dict):
        return json.dumps(
            {"error": explain_tool_call_failure("tool arguments were not an object")},
            ensure_ascii=False,
        )
    args = raw_args
    surface_id = str(args.get("surfaceId") or "dynamic-surface")
    catalog_id = str(args.get("catalogId") or CATALOG_ID)
    components = upgrade_components(list(args.get("components") or []))
    data = args.get("data") or {}

    operations: list[dict[str, Any]] = [
        create_surface(surface_id, catalog_id=catalog_id),
        update_components(surface_id, components),
    ]
    if data:
        operations.append(update_data_model(surface_id, data))
    # Touch the constant so a rename of the middleware key fails review.
    assert cpk_a2ui.A2UI_OPERATIONS_KEY == "a2ui_operations"
    return render(operations)
