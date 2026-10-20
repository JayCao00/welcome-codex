<div align="center">

# welcome-codex

**A colorful opening for every cold launch of Codex.**

<a href="media/welcome-jay.mp4"><img src="media/readme-preview.gif" alt="Rainbow welcome Jay handwriting flows into a ribbon and knot startup animation" width="800"></a>

<br>

![macOS](https://img.shields.io/badge/macOS-13%2B-000000?logo=apple&logoColor=white)
![Version](https://img.shields.io/badge/version-2.4.3-167DAD)
![Swift](https://img.shields.io/badge/Swift-AppKit-F05138?logo=swift&logoColor=white)
![Rendering](https://img.shields.io/badge/Canvas-Vector-25855A)

Rainbow `welcome Jay` handwriting flows into a knot, gently enlarges, and hands off to Codex.<br>
Native window matching · Cold launches only · Silent playback

[Preview](#the-animation) · [Install](#installation) · [Usage](#usage) · [FAQ](#faq)

[简体中文](README.md) · **English** · [日本語](README_JA.md)

</div>

---

## The Animation

After writing `welcome`, the animation pauses before writing `Jay`. The final stroke becomes a colorful ribbon that flows continuously into the knot, then gently enlarges before fading into the app.

| Detail | Behavior |
| --- | --- |
| Colorful handwriting | Rainbow strokes with soft transmission and a moving highlight |
| Continuous motion | Connected paths through handwriting, ribbon, and knot |
| Sharp zoom | Vector contours rendered at the display's native pixel density |
| Window matching | Remembers position, size, and fullscreen state; checks the restored window during startup |
| Quiet pacing | 0.8x speed, 12.75 seconds, no audio |
| Cold launches only | Repeated activation of a running app does not replay the animation |

[Watch the 4K / 60 fps video](media/welcome-jay.mp4). The GIF above is a reduced preview. The launcher renders a local Canvas scene in real time rather than playing a video.

## Installation

Requires **macOS 13+** and **Xcode Command Line Tools** with Swift. Run `xcode-select --install` if the tools are not installed.

> This version targets `/Applications/ChatGPT.app`, whose bundle identifier is `com.openai.codex`. If your Codex is installed elsewhere, update the paths in [macos/main.swift](macos/main.swift) and [scripts/build.sh](scripts/build.sh) first.

```sh
git clone https://github.com/JayCao00/welcome-codex.git
cd welcome-codex
zsh scripts/build.sh
zsh scripts/install.sh
```

The build is locally ad hoc signed and requires no extra runtime downloads. Installation creates:

| Item | Location |
| --- | --- |
| Launcher | `~/Applications/ChatGPT Welcome Jay.app` |
| Desktop shortcut | `~/Desktop/ChatGPT Welcome Jay.app` |
| Launch listener | `~/Library/LaunchAgents/local.jay.welcome.plist` |

## Usage

Open Codex normally, or use the installed launcher or its desktop shortcut.

- **Open after fully quitting:** play once, then hand off to the app.
- **App already running:** activate its window without replaying.
- **Skip:** press `Escape` or `Command + .`.
- **Replay manually:** while Codex is running, choose `Play welcome Jay` from the sparkle menu bar item.
- **Quit Codex:** close the animation and remove the menu bar item; the background listener waits for the next launch.

Normal windows use native macOS corners; maximized windows match the work area. Fullscreen playback covers the entire display, including the menu bar, Dock, and notch safe area. It temporarily auto-hides system bars and restores the original presentation options on completion or skip. Remembered fullscreen is retained while Codex restores its fullscreen Space, rather than following its temporary normal window.

## FAQ

<details>
<summary><strong>Does it modify Codex or require Screen Recording access?</strong></summary>

No. The original application, Dock entry, and chat data are not modified. Neither Accessibility nor Screen Recording permission is required. It reads system window metadata, not screen contents. Playback makes no network requests or API calls.

</details>

<details>
<summary><strong>Why is there no animation after closing and reopening a window?</strong></summary>

Closing a window does not quit the app. The animation plays only after Codex fully quits (`Command + Q`) and starts a new process. Starting the listener at login does not trigger playback on its own. `Quit Welcome Jay` in the menu stops monitoring for the current login session only.

</details>

<details>
<summary><strong>Where is window state stored?</strong></summary>

In `~/Library/Application Support/Welcome Jay/window-placement.json`. The watcher samples every 0.5 seconds while Codex is active and on application activation changes. The first installation can fall back to Codex's `electron-main-window-bounds`. During playback, actual bounds are checked every 0.1 seconds and applied after two stable samples. Disconnected displays fall back to an available display. Install the watcher before changing fullscreen state so it can remember it.

</details>

<details>
<summary><strong>Can I customize the text or animation?</strong></summary>

This version has fixed, personalized `welcome Jay` lettering; there is no name input setting yet. Edit [animation.js](animation.js) for animation and handwriting paths, or [knot-paths.js](knot-paths.js) for knot routes, then rebuild and reinstall. Open [preview.html](preview.html) directly for a looping browser preview without a server. Native playback runs once.

</details>

<details>
<summary><strong>Does the animation wait until Codex finishes loading?</strong></summary>

No. It uses a fixed timeline rather than monitoring loading progress. On a slower machine the app may still be loading after handoff. A 20-second watchdog closes a stalled scene. A system alert appears if the target app cannot launch.

</details>

## Uninstall

```sh
zsh scripts/uninstall.sh
```

This removes the LaunchAgent and desktop link and moves the installed launcher to Trash. Project source and videos remain.

## Development And Verification

<details>
<summary><strong>Repository layout, media exports, and verification tools</strong></summary>

```text
welcome-codex/
├── README.md / README_EN.md / README_JA.md
├── animation.js           # Handwriting, colors, and timeline
├── knot-paths.js          # Knot and continuous ribbon routes
├── preview.html           # Local animation preview
├── macos/                # Swift windows and lifecycle listener
├── scripts/              # Build, install, uninstall, and video export
├── tools/                # Export and regression checks
└── media/                # README GIF and 4K video
```

Optional 4K export requires Node.js, Playwright, and Google Chrome:

```sh
zsh scripts/render.sh
```

Set `NODE_BINARY` and `NODE_PATH` when needed. The script also detects this machine's bundled Codex Node runtime. The video is not used by the launcher.

Regenerate the README GIF using macOS system frameworks:

```sh
swift tools/export-readme.swift media/welcome-jay.mp4 media/readme-preview.gif
```

| Tool | Coverage |
| --- | --- |
| `scripts/build.sh` | Native compilation and signature checks |
| `tools/verify-placement.cjs` | Coordinates, maximization, fullscreen, corners, missing displays, and invalid state files |
| `tools/verify-startup.cjs` | Isolated fixture app: cold launch, no replay, quit cleanup, and actual window alignment |
| `tools/verify-vector.cjs` | Colors, continuity, desktop and mobile sizes, and Retina rendering |
| `tools/inspect-video.swift` | Video track metadata and per-second frame extraction |

Native tests require an active macOS desktop session. Lifecycle tests use an isolated fixture app without quitting your real Codex.

`tools/trace-knot.py` is an optional authoring helper requiring NumPy, Pillow, SciPy, and scikit-image. These are not build or runtime dependencies.

</details>

## References And Credits

- [dragon-codex-boot](https://github.com/yushua0808-cpu/dragon-codex-boot): architectural inspiration for native playback and application event monitoring.
- Jay's reference video and the Apple Event 2021 opening: visual references for motion, handwriting colors, and flow. Original recordings are not distributed.
- [Bootstrap Icons](https://icons.getbootstrap.com/): knot outline proportions, under its MIT license. See [third-party notices](THIRD_PARTY_NOTICES.md).

A personal customization, unaffiliated with OpenAI or Apple. See [CHANGELOG](CHANGELOG.md) for version history.

---

<div align="center">

**welcome Jay.**<br>
<sub>A colorful stroke to begin your next creation.</sub>

[简体中文](README.md) · [English](README_EN.md) · [日本語](README_JA.md)

</div>
