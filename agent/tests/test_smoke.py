"""Import and render every fixed scenario without calling a model."""

from src.a2ui_fixed_schema import (
    open_dashboard,
    patch_dashboard,
    search_flights,
    show_booking_form,
)
from src.a2ui_v1 import parse_render


def test_tools_render_v1_payloads() -> None:
    flight = search_flights.invoke(
        {
            "flights": [
                {
                    "airline": "KE",
                    "flightNumber": "KE001",
                    "origin": "ICN",
                    "destination": "HND",
                    "departureTime": "09:10",
                    "arrivalTime": "11:30",
                    "duration": "2h 20m",
                    "status": "On Time",
                    "price": "$240",
                },
                {
                    "airline": "OZ",
                    "flightNumber": "OZ102",
                    "origin": "ICN",
                    "destination": "NRT",
                    "departureTime": "13:00",
                    "arrivalTime": "15:20",
                    "duration": "2h 20m",
                    "status": "Delayed",
                    "price": "$210",
                },
            ]
        }
    )
    form = show_booking_form.invoke(
        {
            "name": "홍길동",
            "email": "hong@example.com",
            "date": "2026-12-02",
            "seats": 1,
            "window_seat": True,
            "note": "입력하면 제출 액션이 에이전트로 돌아갑니다",
        }
    )
    metrics = [
        {"label": "항공", "value": "$240", "hint": "KE001"},
        {"label": "숙박", "value": "$180", "hint": "시부야"},
    ]
    board = open_dashboard.invoke(
        {
            "title": "# 도쿄 출장",
            "metrics": metrics,
            "total": "$420",
            "alert": "숙박 지표를 더했습니다",
        }
    )
    patched = patch_dashboard.invoke(
        {
            "title": "# 도쿄 출장",
            "metrics": metrics + [{"label": "식대", "value": "$60", "hint": "2인"}],
            "total": "$480",
            "alert": "식대를 더했습니다",
        }
    )
    for payload in (flight, form, board, patched):
        operations = parse_render(payload)
        assert operations
        assert all(op["version"] == "1.0" for op in operations)
