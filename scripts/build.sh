#!/bin/zsh
set -euo pipefail
project_dir="${0:A:h:h}"
app_dir="$project_dir/build/ChatGPT Welcome Jay.app"
mkdir -p "$app_dir/Contents/MacOS" "$app_dir/Contents/Resources"
if [[ ! -f "$project_dir/animation.js" ]]; then
  print -u2 'Missing animation.js.'
  exit 1
fi
swiftc -O -suppress-warnings -target "$(uname -m)-apple-macosx13.0" "$project_dir/macos/main.swift" -o "$app_dir/Contents/MacOS/WelcomeJay" -framework AppKit -framework WebKit
cp "$project_dir/macos/Info.plist" "$app_dir/Contents/Info.plist"
cp "$project_dir/preview.html" "$project_dir/animation.js" "$project_dir/knot-paths.js" "$project_dir/THIRD_PARTY_NOTICES.md" "$app_dir/Contents/Resources/"
if [[ -f "$app_dir/Contents/Resources/welcome-jay.mp4" ]]; then
  rm "$app_dir/Contents/Resources/welcome-jay.mp4"
fi
icon_name=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIconFile' /Applications/ChatGPT.app/Contents/Info.plist)
[[ "$icon_name" == *.icns ]] || icon_name="$icon_name.icns"
if [[ -f "/Applications/ChatGPT.app/Contents/Resources/$icon_name" ]]; then
  cp "/Applications/ChatGPT.app/Contents/Resources/$icon_name" "$app_dir/Contents/Resources/AppIcon.icns"
fi
codesign --force --sign - "$app_dir"
codesign --verify --deep --strict "$app_dir"
print "$app_dir"
