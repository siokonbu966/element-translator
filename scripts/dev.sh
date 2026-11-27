#!/usr/bin/env bash
set -euo pipefail

MODEL="hf.co/pfnet/plamo-3-translate-0.8b-GGUF:Q4_K_M"

# 新しいタブを作成し、root pane を分割して両方の pane id を取得
tab_json=$(herdr tab create --no-focus --label dev --cwd "$PWD")
ollama_pane=$(echo "$tab_json" | jq -r '.result.root_pane.pane_id')

split_json=$(herdr pane split "$ollama_pane" --direction right --no-focus)
webext_pane=$(echo "$split_json" | jq -r '.result.pane.pane_id')

herdr pane rename "$ollama_pane" model
herdr pane rename "$webext_pane" web-ext

# Ollamaが起動するまで待機
herdr pane run "$ollama_pane" "
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
herdr pane run "$webext_pane" \
  "pnpx web-ext run -s dist/firefox"
