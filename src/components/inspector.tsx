"use client";

import type { WireFrame } from "@/lib/wire";

const DIRECTION_LABEL = {
  agent_to_renderer: "agent → renderer",
  renderer_to_agent: "renderer → agent",
} as const;

export function Inspector({ frames }: { frames: readonly WireFrame[] }) {
  return (
    <ol className="wire-log" aria-live="polite" data-testid="wire-log">
      {frames.length === 0 ? (
        <li className="empty">
          아직 메시지가 없습니다. 에이전트 활동의 a2ui_operations와, 버튼을
          눌렀을 때의 action이 여기 쌓입니다.
        </li>
      ) : (
        frames.map((frame) => (
          <li key={frame.id} className={`wire-frame direction-${frame.direction}`}>
            <div className="wire-meta">
              <span>{DIRECTION_LABEL[frame.direction]}</span>
              <span className="mono">{frame.kind}</span>
              <span className="mono">v{frame.version.replace(/^v/, "")}</span>
              {frame.surfaceId ? <span className="mono">{frame.surfaceId}</span> : null}
            </div>
            <p className="wire-source">
              {frame.source === "activity"
                ? "AG-UI activity a2ui-surface"
                : "a2uiAction을 1.0 action 봉투로 정규화"}
            </p>
            <pre>{JSON.stringify(frame.payload, null, 2)}</pre>
          </li>
        ))
      )}
    </ol>
  );
}
