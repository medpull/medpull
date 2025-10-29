#!/usr/bin/env bash
set -euo pipefail

# Serve the medpullwebsite folder locally using Python's built-in HTTP server.
# Usage:
#   ./scripts/serve_medpullwebsite.sh         # serves on port 8000
#   PORT=8080 ./scripts/serve_medpullwebsite.sh

PORT=${PORT:-8000}
SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)/medpullwebsite"

cd "$SITE_DIR"
echo "Serving $SITE_DIR at http://localhost:$PORT"

# Open browser on macOS if available
if command -v open >/dev/null 2>&1; then
  (sleep 1; open "http://localhost:$PORT") &
fi

if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  exec python -m http.server "$PORT"
else
  echo "Python is required (python3 or python not found)" >&2
  exit 1
fi
