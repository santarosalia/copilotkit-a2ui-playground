"""Build the agent's chat model.

The primary endpoint is a local vLLM server with an OpenAI-compatible API:

- ``VLLM_BASE_URL`` (default ``http://localhost:8000/v1``)
- ``VLLM_MODEL`` (default ``Qwen/Qwen3-8B``)
- ``VLLM_API_KEY`` (optional, default ``dummy``)

When ``VLLM_BASE_URL`` is unset and ``OPENAI_API_KEY`` or
``COPILOTKIT_AGENT_MODEL`` is set, the agent falls back to OpenAI.
``openai:gpt-6-luna`` still needs ``reasoning_effort=none`` for Chat
Completions tool calls.

vLLM tool-call turns do not stream. Models that emit tool-call JSON as
deltas often truncate it; ``disable_streaming="tool_calling"`` makes those
turns a single response, and ``max_tokens`` leaves room for a long A2UI tree.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Mapping

from langchain.chat_models import init_chat_model
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_openai import ChatOpenAI

DEFAULT_VLLM_BASE_URL = "http://localhost:8000/v1"
DEFAULT_VLLM_MODEL = "Qwen/Qwen3-8B"
DEFAULT_VLLM_API_KEY = "dummy"
DEFAULT_VLLM_MAX_TOKENS = 4096
DEFAULT_OPENAI_SPEC = "openai:gpt-6-luna"

_PROVIDER_ALIASES = {
    "openai": "openai",
    "anthropic": "anthropic",
    "google": "google",
    "gemini": "google",
    "google-gemini": "google",
}
_LANGCHAIN_PROVIDERS = {
    "openai": "openai",
    "anthropic": "anthropic",
    "google": "google_genai",
}
_SPEC = re.compile(r"^([A-Za-z0-9_.-]+)[:/](.+)$")


@dataclass(frozen=True)
class LlmConfig:
    provider: str
    model: str
    base_url: str = ""
    api_key: str = ""
    max_tokens: int = DEFAULT_VLLM_MAX_TOKENS


def _clean(env: Mapping[str, str], key: str) -> str:
    return (env.get(key) or "").strip()


def qwen3_chat_disables_thinking(model: str) -> bool:
    """Qwen3 chat models tool-call more reliably with thinking off.

    Coder checkpoints use a different parser and template, so this flag is
    not applied to them.
    """
    name = model.lower()
    return "qwen3" in name and "coder" not in name


def parse_agent_model(value: str) -> tuple[str, str]:
    """Split ``<provider>:<model>`` into ``(provider, model)``."""
    match = _SPEC.match(value.strip())
    provider = match and _PROVIDER_ALIASES.get(match.group(1).lower())
    if not match or not provider:
        raise ValueError(
            f'COPILOTKIT_AGENT_MODEL="{value}" is not <provider>:<model> '
            "with provider openai, anthropic or google"
        )
    return provider, match.group(2)


def _max_tokens(raw: str) -> int:
    if not raw:
        return DEFAULT_VLLM_MAX_TOKENS
    try:
        parsed = int(raw)
    except ValueError:
        return DEFAULT_VLLM_MAX_TOKENS
    return parsed if parsed > 0 else DEFAULT_VLLM_MAX_TOKENS


def resolve_llm_config(environ: Mapping[str, str] | None = None) -> LlmConfig:
    """vLLM wins when ``VLLM_BASE_URL`` is set. Otherwise OpenAI, if asked."""
    env = os.environ if environ is None else environ
    base_url = _clean(env, "VLLM_BASE_URL")
    openai_key = _clean(env, "OPENAI_API_KEY")
    openai_spec = _clean(env, "COPILOTKIT_AGENT_MODEL")
    if base_url:
        return LlmConfig(
            provider="vllm",
            model=_clean(env, "VLLM_MODEL") or DEFAULT_VLLM_MODEL,
            base_url=base_url.rstrip("/"),
            api_key=_clean(env, "VLLM_API_KEY") or DEFAULT_VLLM_API_KEY,
            max_tokens=_max_tokens(_clean(env, "VLLM_MAX_TOKENS")),
        )
    if openai_key or openai_spec:
        return LlmConfig(
            provider="openai",
            model=openai_spec or DEFAULT_OPENAI_SPEC,
            api_key=openai_key,
        )
    return LlmConfig(
        provider="vllm",
        model=DEFAULT_VLLM_MODEL,
        base_url=DEFAULT_VLLM_BASE_URL,
        api_key=DEFAULT_VLLM_API_KEY,
    )


def explain_tool_call_failure(detail: str) -> str:
    """Short message when a model emits a tool call the parser cannot finish."""
    clipped = " ".join(detail.split())[:400]
    return (
        "vLLM이 도구 호출 JSON을 끝까지 주지 못했습니다. "
        "서버를 --enable-auto-tool-choice --tool-call-parser hermes 로 띄웠는지 확인하세요. "
        "Qwen3 채팅 모델의 파서는 hermes이고, Qwen3-Coder는 qwen3_xml입니다. "
        "스트리밍 중 JSON이 잘리면 출력이 길어서일 수 있습니다. "
        f"상세: {clipped}"
    )


def create_chat_model(**openai_kwargs) -> BaseChatModel:
    """Build this site's chat model. Extra kwargs apply only to the OpenAI fallback."""
    config = resolve_llm_config()
    if config.provider == "vllm":
        extra_body = None
        if qwen3_chat_disables_thinking(config.model):
            extra_body = {"chat_template_kwargs": {"enable_thinking": False}}
        return ChatOpenAI(
            model=config.model,
            base_url=config.base_url,
            api_key=config.api_key,
            temperature=0,
            max_tokens=config.max_tokens,
            disable_streaming="tool_calling",
            extra_body=extra_body,
        )

    provider, model = parse_agent_model(config.model)
    kwargs = dict(openai_kwargs) if provider == "openai" else {}
    if (
        provider == "openai"
        and model == "gpt-6-luna"
        and not kwargs.get("use_responses_api")
    ):
        kwargs["reasoning_effort"] = "none"
    return init_chat_model(
        model, model_provider=_LANGCHAIN_PROVIDERS[provider], **kwargs
    )
