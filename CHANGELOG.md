# Changelog

## 2.4.1

- Prefer the last observed window frame over stale Electron normal-window bounds.
- Match the actual restored Codex window during startup, including delayed maximization and fullscreen changes.
- Reapply the target frame after AppKit presents the animation window to prevent automatic position offsets.
- Resize the animation content and native window outline together.

## 2.4.0

- Rainbow handwriting flows continuously into the vector knot.
- Pause after welcome before writing Jay.
- Play at 0.8 times the original speed, for a total of 12.75 seconds.
- Preserve the complete icon during a gentle 1.75 times zoom.
- Match the saved Codex window size, position, display, and fullscreen state.
- Use native macOS window corners in windowed mode.
- Show the menu bar item only while Codex is running.
- Close an active animation immediately when Codex quits.
- Play only on cold launch, with no replay when activating a running app.
- Include a silent 4K 60 fps review video.
