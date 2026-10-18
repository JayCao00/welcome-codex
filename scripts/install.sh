#!/bin/zsh
set -euo pipefail
project_dir="${0:A:h:h}"
installed_app="$HOME/Applications/ChatGPT Welcome Jay.app"
agent_file="$HOME/Library/LaunchAgents/local.jay.welcome.plist"
service="gui/$(id -u)/local.jay.welcome"
[[ -d "$project_dir/build/ChatGPT Welcome Jay.app" ]] || /bin/zsh "$project_dir/scripts/build.sh"
launchctl bootout "$service" 2>/dev/null || true
mkdir -p "$HOME/Applications" "$HOME/Library/LaunchAgents"
staging_dir=$(mktemp -d "$HOME/Applications/.welcome-jay-install.XXXXXX")
trap 'rmdir "$staging_dir" 2>/dev/null || true' EXIT
ditto "$project_dir/build/ChatGPT Welcome Jay.app" "$staging_dir/ChatGPT Welcome Jay.app"
codesign --verify --deep --strict "$staging_dir/ChatGPT Welcome Jay.app"
if [[ -e "$installed_app" ]]; then
  backup_dir="$HOME/Library/Application Support/Welcome Jay/Previous Installations"
  mkdir -p "$backup_dir"
  mv "$installed_app" "$backup_dir/ChatGPT Welcome Jay-$(date +%Y%m%d-%H%M%S)-$$.app"
fi
mv "$staging_dir/ChatGPT Welcome Jay.app" "$installed_app"
codesign --verify --deep --strict "$installed_app"
cp "$project_dir/macos/LaunchAgent.plist" "$agent_file"
/usr/libexec/PlistBuddy -c "Set :ProgramArguments:0 $installed_app/Contents/MacOS/WelcomeJay" "$agent_file"
plutil -lint "$agent_file"
launchctl bootstrap "gui/$(id -u)" "$agent_file"
launchctl print "$service"
ln -sfn "$installed_app" "$HOME/Desktop/ChatGPT Welcome Jay.app"
print "Installed: $installed_app"
