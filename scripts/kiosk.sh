#!/bin/bash

# Chrome 키오스크 모드 실행 스크립트
# 사용법: ./scripts/kiosk.sh [URL]

URL="${1:-https://localhost:3000}"

echo "🖥️  Chrome 키오스크 모드 시작..."
echo "📍 URL: $URL"
echo "종료: Alt+F4 또는 Cmd+Q"

# macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --kiosk \
    --disable-pinch \
    --overscroll-history-navigation=0 \
    --disable-translate \
    --disable-infobars \
    --disable-suggestions-service \
    --disable-save-password-bubble \
    --disable-session-crashed-bubble \
    --disable-features=TranslateUI \
    --noerrdialogs \
    --no-first-run \
    --fast \
    --fast-start \
    --disable-background-networking \
    --ignore-certificate-errors \
    "$URL"

# Linux
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  google-chrome \
    --kiosk \
    --disable-pinch \
    --overscroll-history-navigation=0 \
    --disable-translate \
    --disable-infobars \
    --disable-suggestions-service \
    --disable-save-password-bubble \
    --disable-session-crashed-bubble \
    --disable-features=TranslateUI \
    --noerrdialogs \
    --no-first-run \
    --fast \
    --fast-start \
    --disable-background-networking \
    --ignore-certificate-errors \
    "$URL"

# Windows (Git Bash)
else
  "/c/Program Files/Google/Chrome/Application/chrome.exe" \
    --kiosk \
    --disable-pinch \
    --overscroll-history-navigation=0 \
    --disable-translate \
    --disable-infobars \
    --disable-suggestions-service \
    --disable-save-password-bubble \
    --disable-session-crashed-bubble \
    --disable-features=TranslateUI \
    --noerrdialogs \
    --no-first-run \
    --fast \
    --fast-start \
    --disable-background-networking \
    --ignore-certificate-errors \
    "$URL"
fi
