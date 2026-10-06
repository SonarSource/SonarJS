#!/usr/bin/env bash
set -euo pipefail
node "${ACTION_PATH:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}/bot.mjs" update
