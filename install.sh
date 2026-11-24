#!/usr/bin/env bash
# install.sh — kept for old instructions; the installer is now the my-ship CLI (bin/my-ship.mjs).
#
#   bash install.sh /path/to/your/project      ==  npx github:MeanHoang/my-ship install /path/to/your/project
set -euo pipefail
command -v node >/dev/null || { echo "✗ node (>= 18.17) is required"; exit 1; }
exec node "$(cd "$(dirname "$0")" && pwd)/bin/my-ship.mjs" install "${1:?usage: install.sh <project-dir>}"
