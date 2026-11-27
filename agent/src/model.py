"""Build the agent's chat model from ``COPILOTKIT_AGENT_MODEL``.

Adapted from CopilotKit ``examples/integrations/langgraph-python`` (MIT):
https://github.com/CopilotKit/CopilotKit

``COPILOTKIT_AGENT_MODEL=<provider>:<model>`` overrides every model site.
When it is unset, the default is ``openai:gpt-6-luna``. That id is a real
OpenAI model (verified against the OpenAI model docs on 2026-11-27). Chat
Completions function-calling on Luna needs ``reasoning_effort=none``.

Providers: ``openai``, ``anthropic``, ``google``. This playground image only
installs ``langchain-openai``. Anthropic and Google raise a clear error
unless those packages are installed separately. An OpenAI-compatible
endpoint is ``openai:<model id>`` plus ``OPENAI_BASE_URL``.
"""

from __future__ import annotations

import os
import re

from langchain.chat_models import init_chat_model
from langchain_core.language_models.chat_models import BaseChatModel

DEFAULT_MODEL_SPEC = "openai:gpt-6-luna"

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


def resolve_model_spec(default_spec: str = DEFAULT_MODEL_SPEC) -> str:
    configured = (os.getenv("COPILOTKIT_AGENT_MODEL") or "").strip()
    return configured or default_spec


def create_chat_model(default_spec: str = DEFAULT_MODEL_SPEC, **openai_kwargs) -> BaseChatModel:
    """Build this site's chat model."""
    provider, model = parse_agent_model(resolve_model_spec(default_spec))
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
