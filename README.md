# welcome-codex

macOS Codex 启动动画：多彩手写 `welcome Jay`，连续汇成图标后进入应用。

当前版本：**2.4.1**。支持窗口尺寸和全屏记忆、原生窗口圆角、无声播放，
仅在完全退出应用后重新启动时播放。退出 Codex 后，动画和状态栏图标同步关闭。

[查看最新动画预览（4K / 60 fps / 12.75 秒）](media/welcome-jay.mp4)

```sh
git clone https://github.com/JayCao00/welcome-codex.git
cd welcome-codex
zsh scripts/build.sh
zsh scripts/install.sh
```

本版本保留 `welcome Jay` 的个性化文字。需要 macOS 13+ 和 Xcode Command Line Tools。
当前目标应用是 `/Applications/ChatGPT.app`，其 bundle identifier 为 `com.openai.codex`。
若你的 Codex 应用路径不同，需要先调整 `macos/main.swift` 和 `scripts/build.sh` 中的应用路径。

Native macOS launch animation for Codex, targeting `/Applications/ChatGPT.app`.

## Use

Open `~/Applications/ChatGPT Welcome Jay.app` or its desktop shortcut. It draws
the animation while ChatGPT opens, then fades into the real application.
Escape or Command+. skips the animation.

The animation uses the last Codex main-window size and position, with the scene
scaled proportionally inside it. A normal window gets macOS native rounded corners and a
shadow; a previously fullscreen window gets a fullscreen animation on its saved
display. Maximized windows use the display's work area. If a display disconnects,
the animation is fitted onto a connected display.

The watcher remembers actual visible window geometry and fullscreen state in
`~/Library/Application Support/Welcome Jay/window-placement.json`. It samples
window bounds every 0.5 seconds while Codex is active, and on application
activation changes. This record takes priority over Codex's normal-window bounds,
which can lag behind maximization. On first installation, Codex's local
`electron-main-window-bounds` record is used as a fallback. During playback, the
overlay checks the actual restored window every 0.1 seconds and matches its size,
position, and fullscreen state after two stable samples. It reads window metadata,
not screen contents. Install the
watcher before changing fullscreen state so it can remember that state.

The installed user LaunchAgent plays the animation only when the official
ChatGPT application starts a new process after being completely quit.
Switching windows, clicking its icon again, or reopening a closed window while
ChatGPT is still running does not play the animation. The custom launcher also
just activates ChatGPT when it is already running.

The small sparkle menu bar item appears only while Codex is running and can
replay the animation or quit the watcher. Quitting Codex removes this item and
closes any active animation immediately. The invisible launch listener remains
available for the next cold launch.
Quitting it stops monitoring for the current login session. Uninstall to stop
monitoring permanently. The watcher does not play an animation merely because
it starts at login.

## Visuals

Version 2 draws the entire sequence from vector paths at the display's native
pixel density. The lettering has distinct lowercase w/e/m shapes and a vivid
rainbow palette inspired by Jay's supplied Apple event clip, with soft tinted
transmission and a moving reflection instead of a hard white outline. Jay's
final pen stroke is the start of the ribbon. Each strand is one continuous
arc-length path through the wave, its lead-in and its final knot petal; the
head curls into the knot while the tail follows the same path. The growing
centerlines are clipped to the exact thin knot silhouette throughout formation.
Incoming strands and the knot share one color pass to avoid layered junctions.
The final knot does not fade in. All contours are rendered at native resolution
during zoom; no screen-recording pixels or cached textures are enlarged.

The sequence plays at 0.8 times the original speed and lasts 12.75 seconds.
After welcome finishes at 3.4s, it pauses for about 0.69s before Jay begins.
Writing ends at 6.25s and the title holds until 6.625s. The ribbon flows into
the knot by about 10.81s; the complete knot holds from 10.875s to about 11.19s,
then gently enlarges to 1.75 times its size before the app handoff.
The complete icon stays within the frame throughout the zoom.

`preview.html` opens the same live vector animation in a browser without a
server. It loops in a browser; the native launcher plays it once. Version 2 is
silent. Its visuals and timing are defined in `animation.js`, with knot routes
in `knot-paths.js`.

`media/welcome-jay.mp4` is an optional 4K 60 fps video export for review. It is
not used by the launcher. Original reference recordings and earlier exports
are not included in this repository.

## Build And Install

Requires macOS 13+, Command Line Tools with Swift, and ChatGPT at the path above.
There are no downloaded runtime dependencies, API calls, or network requests.
Rendering uses the macOS system WebKit engine and a local Canvas scene.

```sh
zsh scripts/build.sh
zsh scripts/install.sh
```

The packaged app includes `preview.html`, `animation.js`, `knot-paths.js`, and
the third-party outline license. The build is locally ad hoc signed. Rebuild and reinstall after
editing the scene. A video export is not needed to build or run the app.

Optional 4K video export (requires Node.js, Playwright, and Google Chrome):

```sh
zsh scripts/render.sh
```

Set `NODE_BINARY` and `NODE_PATH` when those tools are not on the normal path.
The export script also detects this machine's bundled Codex Node runtime.

`tools/trace-knot.py` is an optional asset-authoring helper for regenerating
`knot-paths.js` from a 1024px alpha rendering of the licensed SVG at
`build/knot-mask.png`. It requires Python, NumPy, Pillow, SciPy, and scikit-image;
these are not required to build or run the app.

Installation creates:

- `~/Applications/ChatGPT Welcome Jay.app`
- `~/Desktop/ChatGPT Welcome Jay.app` (symbolic link)
- `~/Library/LaunchAgents/local.jay.welcome.plist`

The original ChatGPT bundle, Dock entry, and chat data are not modified.
The launcher observes macOS application events and uses a local file lock to
prevent simultaneous splash windows. It requires neither Accessibility nor
Screen Recording access. It plays in the current Space at the saved window
position or on the saved fullscreen display. Geometry sampling pauses when
Codex is not active; startup playback still uses application launch events.

## Remove

```sh
zsh scripts/uninstall.sh
```

This removes the LaunchAgent and desktop link and moves this project's
installed launcher to Trash. Project source and video remain in this folder.

## Verification

Build and native signature checks are performed by `scripts/build.sh`.
`tools/verify-vector.cjs` checks live playback, multiple color ranges, stage
continuity, and screenshots on desktop, mobile, and a 5K Retina canvas.
`tools/inspect-video.swift` extracts frames for video export inspection.
`tools/verify-startup.cjs` uses a temporary native fixture app to check cold
launch, activation without replay, a custom launcher reopening a running app,
saved window bounds, fullscreen capture, and playback after quit/relaunch
without quitting the user's real ChatGPT. `tools/verify-placement.cjs` checks
coordinate conversion, maximized bounds, fullscreen sizing, disconnected
displays, and missing or partially written Codex state.
Native playback, skip, cold startup, and handoff need a live macOS
session. A 20-second watchdog closes the scene if WebKit stalls.

The monitor does not inspect application loading state. The animation draws
for its fixed duration and hands focus to the application, which may still
be loading on a slow machine. If ChatGPT cannot launch, a system alert appears.

## Reference

The architecture takes inspiration from
[dragon-codex-boot](https://github.com/yushua0808-cpu/dragon-codex-boot), especially
its macOS native playback and workspace event integration. No repository code
or bundled media was copied. Version 2 redraws the visual sequence using Jay's
`案例.MP4` and `开头Apple event 2021.MP4` as motion and color references. The
source recordings remain untouched. The knot centerline proportions are adapted
from Bootstrap Icons under MIT; see `THIRD_PARTY_NOTICES.md`. This is a local customization.
