"""Fixed-schema A2UI 1.0 tools.

The component trees live in JSON. The model only supplies data. User actions
(``book_flight``, ``submit_booking``) travel back through CopilotKit as an
``a2uiAction`` and show up to the model as a ``log_a2ui_event`` result.
"""

from __future__ import annotations

from typing import TypedDict

from langchain.tools import tool

from src.a2ui_v1 import (
    build_booking_form_operations,
    build_dashboard_operations,
    build_dashboard_patch_operations,
    build_flight_operations,
    render,
)


class Flight(TypedDict):
    airline: str
    flightNumber: str
    origin: str
    destination: str
    departureTime: str
    arrivalTime: str
    duration: str
    status: str
    price: str


class Metric(TypedDict):
    label: str
    value: str
    hint: str


@tool
def search_flights(flights: list[Flight]) -> str:
    """Show two flight cards with the fixed A2UI schema.

    Use short airport codes. ``price`` is a display string like "$289".
    ``status`` is one of "On Time", "Delayed", "Cancelled". Call this once
    per search. The card is already on screen after the tool returns.
    """
    return render(build_flight_operations(list(flights)))


@tool
def show_booking_form(
    name: str,
    email: str,
    date: str,
    seats: int,
    window_seat: bool,
    note: str,
) -> str:
    """Show the booking form. Fields are data-bound; the user can edit them.

    ``date`` is an ISO date (YYYY-MM-DD). ``seats`` is 1-6. ``note`` is a
    short status line shown above the form. After the user submits, you will
    receive a submit_booking action. Confirm the values they sent. Do not
    call this tool again for the same form.
    """
    return render(
        build_booking_form_operations(
            {
                "name": name,
                "email": email,
                "date": date,
                "seats": seats,
                "windowSeat": window_seat,
                "note": note,
            }
        )
    )


@tool
def open_dashboard(
    title: str,
    metrics: list[Metric],
    total: str,
    alert: str,
) -> str:
    """Open the trip dashboard and then update it in the same turn.

    Pass the full metric list (at least two). The tool first paints a single
    metric and then replaces the data model with the full list and ``alert``.
    ``total`` is a display string like "$1,240".
    """
    return render(
        build_dashboard_operations(
            title=title,
            metrics=list(metrics),
            total=total,
            alert=alert,
        )
    )


@tool
def patch_dashboard(
    title: str,
    metrics: list[Metric],
    total: str,
    alert: str,
) -> str:
    """Send a new snapshot of the trip dashboard after the user asks for a change.

    Pass the FULL metric list, including rows you are adding. Uses the same
    surface id as open_dashboard.
    """
    return render(
        build_dashboard_patch_operations(
            title=title,
            metrics=list(metrics),
            total=total,
            alert=alert,
        )
    )
