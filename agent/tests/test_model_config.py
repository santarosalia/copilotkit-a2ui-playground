"""vLLM is the default endpoint. OpenAI is only the fallback."""

from __future__ import annotations

import pytest

from src.model import (
    DEFAULT_VLLM_API_KEY,
    DEFAULT_VLLM_BASE_URL,
    DEFAULT_VLLM_MODEL,
    create_chat_model,
    explain_tool_call_failure,
    parse_agent_model,
    qwen3_chat_disables_thinking,
    resolve_llm_config,
)


def test_vllm_env_is_the_primary_config() -> None:
    config = resolve_llm_config(
        {
            "VLLM_BASE_URL": "http://localhost:8000/v1/",
            "VLLM_MODEL": "Qwen/Qwen3-8B",
            "VLLM_API_KEY": "",
            "VLLM_MAX_TOKENS": "2048",
            "OPENAI_API_KEY": "sk-should-not-win",
            "COPILOTKIT_AGENT_MODEL": "openai:gpt-6-luna",
        }
    )
    assert config.provider == "vllm"
    assert config.base_url == "http://localhost:8000/v1"
    assert config.model == "Qwen/Qwen3-8B"
    assert config.api_key == DEFAULT_VLLM_API_KEY
    assert config.max_tokens == 2048
    assert "sk-should-not-win" not in repr(config)


def test_missing_vllm_fields_use_documented_defaults() -> None:
    config = resolve_llm_config({"VLLM_BASE_URL": "http://127.0.0.1:8000/v1"})
    assert config.model == DEFAULT_VLLM_MODEL
    assert config.api_key == DEFAULT_VLLM_API_KEY
    assert config.max_tokens == 4096


def test_empty_env_still_defaults_to_local_vllm() -> None:
    config = resolve_llm_config({})
    assert config.provider == "vllm"
    assert config.base_url == DEFAULT_VLLM_BASE_URL
    assert config.model == DEFAULT_VLLM_MODEL


def test_openai_is_the_fallback_only_without_vllm(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("VLLM_BASE_URL", raising=False)
    config = resolve_llm_config(
        {"OPENAI_API_KEY": "sk-test", "COPILOTKIT_AGENT_MODEL": "openai:gpt-6-luna"}
    )
    assert config.provider == "openai"
    assert config.model == "openai:gpt-6-luna"
    assert parse_agent_model(config.model) == ("openai", "gpt-6-luna")
    with pytest.raises(ValueError):
        parse_agent_model("not-a-spec")


def test_qwen3_chat_disables_thinking_and_coder_does_not() -> None:
    assert qwen3_chat_disables_thinking("Qwen/Qwen3-8B") is True
    assert qwen3_chat_disables_thinking("Qwen/Qwen3-Coder-30B-A3B-Instruct") is False
    assert qwen3_chat_disables_thinking("meta-llama/Llama-3.1-8B-Instruct") is False


def test_vllm_client_targets_the_base_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("VLLM_BASE_URL", "http://localhost:8000/v1")
    monkeypatch.setenv("VLLM_MODEL", "Qwen/Qwen3-8B")
    monkeypatch.delenv("VLLM_API_KEY", raising=False)
    model = create_chat_model()
    assert model.openai_api_base == "http://localhost:8000/v1"  # type: ignore[attr-defined]
    assert model.model_name == "Qwen/Qwen3-8B"  # type: ignore[attr-defined]
    assert model.disable_streaming == "tool_calling"
    assert model.extra_body == {"chat_template_kwargs": {"enable_thinking": False}}  # type: ignore[attr-defined]


def test_tool_call_failure_names_the_vllm_flags() -> None:
    message = explain_tool_call_failure("Unterminated string starting at position 80 " + "x" * 500)
    assert "--enable-auto-tool-choice" in message
    assert "hermes" in message
    assert "qwen3_xml" in message
    assert len(message) < 700
