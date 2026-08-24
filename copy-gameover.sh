#!/bin/bash
# Copy the gameover background image to the correct location
SRC="src/assets/ChatGPT Image Aug 24, 2026, 01_04_05 PM.png"
DEST="src/assets/game/gameover-bg.png"

if [ -f "$DEST" ]; then
  echo "✅ gameover-bg.png already exists"
else
  cp "$SRC" "$DEST" && echo "✅ Copied gameover-bg.png to game/" || echo "❌ Copy failed – check the source file name"
fi
