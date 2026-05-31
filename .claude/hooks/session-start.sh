#!/bin/bash
# SessionStart hook for Claude Code on the web.
#
# Prepares a fresh remote container so linters, type-checks, tests and
# browser-based visual verification all work out of the box:
#   1. Installs project dependencies (npm).
#   2. Ensures a headless Chromium is available for Puppeteer-driven
#      smoke tests / screenshots.
#
# Synchronous on purpose: the session waits until deps are ready, which
# avoids races where the agent runs `npm run lint` / `vitest` before the
# install finishes.
set -euo pipefail

# Only run in the remote (Claude Code on the web) environment. Local clones
# manage their own dependencies.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install dependencies. `npm install` (not `npm ci`) so the cached container
# layer is reused across sessions. Idempotent.
npm install

# Ensure a Chromium build for Puppeteer is present (visual verification).
# Idempotent — skips the download when already cached. Non-fatal: a flaky
# browser download must not block the session; only the screenshots would
# be unavailable.
npx puppeteer browsers install chrome \
  || echo "session-start: Chromium install failed; visual verification unavailable this session"
