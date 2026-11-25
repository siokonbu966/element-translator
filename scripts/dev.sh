#!/usr/bin/env bash
set -euo pipefail

MODEL="hf.co/pfnet/plamo-3-translate-0.8b-GGUF:Q4_K_M"

# Ollamaが起動するまで待機
herdr pane run wQ:pE "
  ollama run ${MODEL}

  until curl -fsS http://localhost:11434/api/tags >/dev/null; do
    sleep 1
  done

  curl -fsS http://localhost:11434/api/generate \
    -d '{\'model\':\'${MODEL}\',\'prompt\':\'\',\'keep_alive\':-1}' \
    -o /dev/null

  echo 'Model ${MODEL} loaded'
"

# Firefox extension
herdr pane run wQ:pH \
  "pnpx web-ext run -s dist/firefox"
