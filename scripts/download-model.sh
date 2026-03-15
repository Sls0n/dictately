#!/bin/bash
set -e

MODEL_DIR="$(dirname "$0")/../resources/models"
MODEL_FILE="$MODEL_DIR/ggml-large-v3.bin"
MODEL_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin"

mkdir -p "$MODEL_DIR"

if [ -f "$MODEL_FILE" ]; then
    echo "Model already exists at $MODEL_FILE"
    exit 0
fi

echo "Downloading Whisper Large-v3 model (~3GB)..."
curl -L --progress-bar -o "$MODEL_FILE" "$MODEL_URL"

echo "Model downloaded to $MODEL_FILE"
ls -lh "$MODEL_FILE"
