"""LangGraph entrypoint. The graph id is ``sample_agent`` (see langgraph.json).

Adapted from CopilotKit examples/integrations/langgraph-python (MIT).
The fixed-schema tools emit A2UI 1.0. ``injectA2UITool`` is off on the
Node runtime, so this graph owns every A2UI tool, including ``generate_a2ui``.
"""

from copilotkit import CopilotKitMiddleware
from langchain.agents import create_agent

from src.a2ui_dynamic_schema import generate_a2ui
from src.a2ui_fixed_schema import (
    open_dashboard,
    patch_dashboard,
    search_flights,
    show_booking_form,
)
from src.model import create_chat_model

model = create_chat_model(model_kwargs={"parallel_tool_calls": False})

SYSTEM_PROMPT = """
You are the guide for an A2UI 1.0 playground. Reply in the user's language,
in two short sentences, after the tool returns.

Tools:
- search_flights: flight cards. Call once with exactly two flights.
- show_booking_form: a bound form. Call once. When a later message contains
  submit_booking or log_a2ui_event for that action, confirm the submitted
  values and do not open a second form.
- open_dashboard: trip dashboard. Call once when the user asks for the board.
- patch_dashboard: same board, full metric list, when they ask to add or
  change a row. Do not call open_dashboard again for that change.
- generate_a2ui: only for a freeform card that is none of the above.
  It must be A2UI 1.0. Do not call it for flights, the booking form, or
  the dashboard.

When you see book_flight, confirm that one flight and stop.
Never invent a component name. Never claim a surface failed if the tool returned.
"""

graph = create_agent(
    model=model,
    tools=[
        search_flights,
        show_booking_form,
        open_dashboard,
        patch_dashboard,
        generate_a2ui,
    ],
    middleware=[CopilotKitMiddleware()],
    system_prompt=SYSTEM_PROMPT,
)
