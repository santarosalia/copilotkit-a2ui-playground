export type Scenario = {
  id: "flights" | "form" | "dashboard" | "freeform";
  label: string;
  prompt: string;
  detail: string;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "flights",
    label: "항공편 카드",
    detail: "고정 스키마. 데이터만 바뀝니다.",
    prompt:
      "인천에서 도쿄로 가는 항공편 두 개를 카드로 보여 줘. 하나는 정시, 하나는 지연으로.",
  },
  {
    id: "form",
    label: "예약 폼",
    detail: "입력은 데이터 모델에 묶이고, 제출은 에이전트로 돌아갑니다.",
    prompt:
      "출장 예약 폼을 띄워 줘. 이름은 김하늘, 이메일은 haneul@example.com, 날짜는 2026-12-03, 인원 1, 창가 좌석. 안내 문구는 '값을 고친 뒤 예약 요청을 누르세요'로.",
  },
  {
    id: "dashboard",
    label: "대시보드",
    detail: "한 턴 안에서 데이터 모델이 두 번 갱신됩니다.",
    prompt:
      "도쿄 출장 대시보드를 열어 줘. 제목은 '# 도쿄 출장', 합계는 $420, 지표는 항공 $240 (KE001)과 숙박 $180 (시부야). 알림은 '숙박 지표를 더했습니다'.",
  },
  {
    id: "freeform",
    label: "자유 생성",
    detail: "보조 모델이 1.0 컴포넌트 트리를 만듭니다.",
    prompt:
      "항공편 카드나 예약 폼, 대시보드 말고, 비 오는 도쿄에 대한 짧은 확인 카드를 A2UI로 자유롭게 그려 줘.",
  },
];
