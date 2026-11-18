#!/bin/sh

set -eu

if [ -n "${FIREFOX_BINARY:-}" ]; then
  firefox_binary=$FIREFOX_BINARY
elif command -v firefox >/dev/null 2>&1; then
  firefox_binary=$(command -v firefox)
else
  firefox_binary=
  for candidate in \
    "$HOME/Applications/Home Manager Apps/Firefox.app/Contents/MacOS/firefox" \
    "$HOME/.nix-profile/Applications/Firefox.app/Contents/MacOS/firefox" \
    "/run/current-system/sw/Applications/Firefox.app/Contents/MacOS/firefox" \
    "/Applications/Firefox.app/Contents/MacOS/firefox"; do
    if [ -x "$candidate" ]; then
      firefox_binary=$candidate
      break
    fi
  done
fi

if [ -z "$firefox_binary" ] || [ ! -x "$firefox_binary" ]; then
  echo "Firefox executable was not found." >&2
  echo "Set FIREFOX_BINARY to the Nix Firefox executable path." >&2
  echo "Example: FIREFOX_BINARY=\"$HOME/Applications/Home Manager Apps/Firefox.app/Contents/MacOS/firefox\" pnpm dev:firefox" >&2
  exit 1
fi

exec pnpm exec web-ext run \
  --source-dir dist/firefox \
  --firefox-binary "$firefox_binary"
