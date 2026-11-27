"use client";

import {
  CopilotChat,
  useAgent,
  useCopilotKit,
} from "@copilotkit/react-core/v2";
import { useState } from "react";
import type { Readiness } from "@/lib/readiness";
import {
  SAMPLE_OPERATIONS,
  sampleFrames,
  type SampleId,
} from "@/lib/samples";
import { SCENARIOS } from "@/lib/scenarios";
import {
  framesFromActivityMessages,
  operationsFromActivityMessages,
  type WireFrame,
} from "@/lib/wire";
import {
  clearRendererActions,
  useRendererActionFrames,
} from "@/lib/wire-store";
import { Inspector } from "./inspector";
import { SurfaceStage } from "./surface-stage";

type Mode =
  | { kind: "idle" }
  | { kind: "sample"; id: SampleId }
  | { kind: "live" };

export function Playground({ initialReady }: { initialReady: Readiness }) {
  const { agent, isReady } = useAgent({ agentId: "default" });
  const { copilotkit } = useCopilotKit();
  const actionFrames = useRendererActionFrames();
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [ready] = useState(initialReady);

  const liveMessages = agent.messages as readonly unknown[];
  const liveFrames = framesFromActivityMessages(liveMessages);
  const sampleOps =
    mode.kind === "sample" ? SAMPLE_OPERATIONS[mode.id] : [];
  const sampleWire: WireFrame[] =
    mode.kind === "sample" ? sampleFrames(mode.id) : [];
  const agentFrames = mode.kind === "sample" ? sampleWire : liveFrames;
  const stageOps =
    mode.kind === "sample"
      ? sampleOps
      : operationsFromActivityMessages(liveMessages);

  async function send(prompt: string) {
    setError(null);
    setMode({ kind: "live" });
    clearRendererActions();
    if (!isReady) {
      setError("런타임에 아직 연결되지 않았습니다. 에이전트 서버가 8123에서 떠 있는지 확인하세요.");
      return;
    }
    setSending(true);
    try {
      agent.addMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: prompt,
      });
      await copilotkit.runAgent({ agent });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "요청에 실패했습니다.";
      setError(message);
    } finally {
      setSending(false);
    }
  }

  function playSample(id: SampleId) {
    setError(null);
    clearRendererActions();
    setMode({ kind: "sample", id });
  }

  return (
    <div className="shell">
      <header className="topbar">
        <p className="mark">A2UI</p>
        <div>
          <h1>플레이그라운드</h1>
          <p>에이전트가 선언한 표면과, 그 메시지를 나란히 봅니다.</p>
        </div>
        <p className="pin">
          protocol 1.0
          <span>{ready.model}</span>
        </p>
      </header>

      {!ready.llmConfigured ? (
        <p className="banner" role="status">
          OPENAI_API_KEY가 없습니다. 샘플 재생은 그대로 동작합니다. 채팅 시나리오는
          키를 넣은 뒤 <span className="mono">npm run dev</span>를 다시 시작하세요.
        </p>
      ) : null}
      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="workspace">
        <section className="chat-column" aria-label="대화">
          <div className="scenario-row">
            {SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                className="scenario"
                disabled={sending}
                onClick={() => void send(scenario.prompt)}
              >
                <strong>{scenario.label}</strong>
                <span>{scenario.detail}</span>
              </button>
            ))}
          </div>
          <div className="chat-pane">
            <CopilotChat input={{ disclaimer: () => null }} />
          </div>
        </section>

        <aside className="bench" aria-label="표면과 와이어">
          <div className="bench-head">
            <h2>표면</h2>
            <div className="sample-row">
              <button type="button" onClick={() => playSample("flights")}>
                샘플 항공편
              </button>
              <button type="button" onClick={() => playSample("form")}>
                샘플 폼
              </button>
              <button type="button" onClick={() => playSample("dashboard")}>
                샘플 대시보드
              </button>
            </div>
          </div>
          <SurfaceStage
            operations={stageOps}
            forwardActions={mode.kind === "live" && ready.llmConfigured}
          />
          <h2 className="inspector-heading">와이어</h2>
          <Inspector frames={[...agentFrames, ...actionFrames]} />
        </aside>
      </div>
    </div>
  );
}
