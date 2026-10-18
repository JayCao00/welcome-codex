#!/bin/zsh
set -euo pipefail
launchctl bootout "gui/$(id -u)/local.jay.welcome" 2>/dev/null || true
agent_file="$HOME/Library/LaunchAgents/local.jay.welcome.plist"
[[ ! -f "$agent_file" ]] || rm "$agent_file"
desktop_link="$HOME/Desktop/ChatGPT Welcome Jay.app"
[[ ! -L "$desktop_link" ]] || rm "$desktop_link"
installed_app="$HOME/Applications/ChatGPT Welcome Jay.app"
if [[ -d "$installed_app" ]]; then
  bundle_id=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$installed_app/Contents/Info.plist")
  [[ "$bundle_id" != local.jay.welcome.launcher ]] || /bin/mv "$installed_app" "$HOME/.Trash/ChatGPT Welcome Jay-$(date +%s).app"
fi
print 'Welcome Jay integration removed.'
