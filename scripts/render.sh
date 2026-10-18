#!/bin/zsh
set -euo pipefail
project_dir="${0:A:h:h}"
mkdir -p "$project_dir/build" "$project_dir/media"
node_binary="${NODE_BINARY:-$(command -v node || true)}"
if [[ -z "$node_binary" ]]; then
  node_binary="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [[ ! -x "$node_binary" ]]; then
  print -u2 'Set NODE_BINARY to a Node.js executable and NODE_PATH to a directory containing playwright.'
  exit 1
fi
cd "$project_dir"
NODE_PATH="${NODE_PATH:-${node_binary:h}/../node_modules}" "$node_binary" tools/export-vector.cjs
swiftc -O -suppress-warnings -target "$(uname -m)-apple-macosx13.0" tools/encode-vector.swift -o build/encode-vector
build/encode-vector build/vector-frames media/welcome-jay.new.mp4
if [[ -f media/welcome-jay.mp4 && ! -f media/welcome-jay-v1.mp4 ]]; then
  cp media/welcome-jay.mp4 media/welcome-jay-v1.mp4
fi
mv media/welcome-jay.new.mp4 media/welcome-jay.mp4
