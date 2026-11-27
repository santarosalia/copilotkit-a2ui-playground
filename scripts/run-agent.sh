#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../agent"
if ! command -v uv >/dev/null 2>&1; then
  export PATH="${HOME}/.local/bin:${PATH}"
fi
# The JS CLI reads langgraph.json and serves the Python graph on :8123.
exec npx --no-install @langchain/langgraph-cli dev --port 8123 --no-browser
