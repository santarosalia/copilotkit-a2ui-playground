"use client";

import { useSyncExternalStore } from "react";
import { frameFromUserAction, type UserActionLike, type WireFrame } from "./wire";

let actions: WireFrame[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function recordRendererAction(action: UserActionLike): void {
  const frame = frameFromUserAction(action);
  if (actions.some((existing) => existing.id === frame.id)) return;
  actions = [...actions, frame];
  emit();
}

export function clearRendererActions(): void {
  actions = [];
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRendererActionFrames(): WireFrame[] {
  return useSyncExternalStore(
    subscribe,
    () => actions,
    () => actions,
  );
}
