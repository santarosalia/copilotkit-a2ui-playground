#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../agent"
if ! command -v uv >/dev/null 2>&1; then
  export PATH="${HOME}/.local/bin:${PATH}"
fi
uv sync
