<div align="center">

# welcome-codex

**为每一次 Codex 冷启动，留一段多彩的开场。**

<a href="media/welcome-jay.mp4"><img src="media/readme-preview.gif" alt="welcome Jay 多彩手写、丝带汇成图标的完整启动动画" width="800"></a>

<br>

![macOS](https://img.shields.io/badge/macOS-13%2B-000000?logo=apple&logoColor=white)
![Version](https://img.shields.io/badge/version-2.4.3-167DAD)
![Swift](https://img.shields.io/badge/Swift-AppKit-F05138?logo=swift&logoColor=white)
![Rendering](https://img.shields.io/badge/Canvas-Vector-25855A)

多彩手写 `welcome Jay`，流动成结，轻柔放大，再进入 Codex。<br>
原生窗口适配 · 仅冷启动播放 · 全程无声

[观看效果](#动画效果) · [安装](#安装) · [使用](#使用) · [常见问题](#常见问题)

**简体中文** · [English](README_EN.md) · [日本語](README_JA.md)

</div>

---

## 动画效果

`welcome` 写完后稍作停顿，再写出 `Jay`。最后一笔延伸为彩色丝带，连续汇成图标，随后柔和放大并淡入应用。

| 细节 | 表现 |
| --- | --- |
| 多彩手写 | 彩虹色笔触，带柔和透光与移动高光 |
| 连续转场 | 手写、丝带、图标沿连续路径衔接 |
| 清晰放大 | 按屏幕原生像素密度绘制矢量轮廓 |
| 窗口适配 | 记住位置、尺寸和全屏状态，启动时校准实际窗口 |
| 克制播放 | 0.8 倍速，共 12.75 秒，无音乐 |
| 启动行为 | 完全退出后再打开才播放，重复点击不重播 |

[查看 4K / 60 fps 原片](media/welcome-jay.mp4)。上方 GIF 为缩小预览，实际动画由本地 Canvas 实时绘制，不播放视频。

## 安装

需要 **macOS 13+** 和包含 Swift 的 **Xcode Command Line Tools**。未安装编译工具时，先运行 `xcode-select --install`。

> 当前目标应用是 `/Applications/ChatGPT.app`，bundle identifier 为 `com.openai.codex`。如果你的 Codex 安装路径不同，先调整 [macos/main.swift](macos/main.swift) 和 [scripts/build.sh](scripts/build.sh) 中的路径。

```sh
git clone https://github.com/JayCao00/welcome-codex.git
cd welcome-codex
zsh scripts/build.sh
zsh scripts/install.sh
```

构建使用本机临时签名，无需下载额外运行时。安装后创建：

| 项目 | 位置 |
| --- | --- |
| 启动器 | `~/Applications/ChatGPT Welcome Jay.app` |
| 桌面快捷方式 | `~/Desktop/ChatGPT Welcome Jay.app` |
| 启动监听 | `~/Library/LaunchAgents/local.jay.welcome.plist` |

## 使用

正常打开 Codex 即可，也可以使用安装的启动器或桌面快捷方式。

- **完全退出后重开**：播放一次动画，再切入应用。
- **应用已经运行**：只激活窗口，不重播动画。
- **跳过动画**：按 `Escape` 或 `Command + .`。
- **手动重播**：Codex 运行时，在菜单栏闪光图标中选择 `Play welcome Jay`。
- **退出 Codex**：动画和菜单栏图标同步关闭，后台监听等待下次启动。

普通窗口使用 macOS 原生圆角；铺满窗口匹配桌面可用区域；系统全屏覆盖整块显示器，包括菜单栏、Dock 和刘海安全区域。全屏播放时临时自动隐藏菜单栏和 Dock，结束或跳过后恢复原来的显示选项。启动恢复全屏期间保留上次的全屏状态，避免被临时普通窗口降级为填充。

## 常见问题

<details>
<summary><strong>需要修改原版 Codex 或授予屏幕录制权限吗？</strong></summary>

不需要。启动器不修改原应用、Dock 图标或聊天数据，也不需要辅助功能或屏幕录制权限。它读取窗口位置等系统元数据，不读取屏幕内容。运行时不发送网络请求，不调用 API。

</details>

<details>
<summary><strong>为什么关掉窗口再打开，没有动画？</strong></summary>

关闭窗口不等于退出应用。只有完全退出 Codex（`Command + Q`），再打开新进程时才会播放。监听器在登录时启动，不会单独触发动画。菜单中的 `Quit Welcome Jay` 仅停止当前登录会话的监听。

</details>

<details>
<summary><strong>窗口和全屏记录保存在哪里？</strong></summary>

保存在 `~/Library/Application Support/Welcome Jay/window-placement.json`。Codex 活跃时每 0.5 秒采样，应用切换时也会记录。首次安装可回退读取 Codex 的 `electron-main-window-bounds`；播放时每 0.1 秒检查实际窗口，连续两次稳定后校准。显示器断开时会适配可用显示器。建议先安装监听器，再调整并使用全屏状态。

</details>

<details>
<summary><strong>可以改文字或动画吗？</strong></summary>

当前版本固定为个性化的 `welcome Jay`，尚无姓名输入设置。动画和手写路径定义在 [animation.js](animation.js)，图标路径在 [knot-paths.js](knot-paths.js)。修改后重新构建、安装即可。直接打开 [preview.html](preview.html) 可循环预览，无需服务器；原生启动器只播放一次。

</details>

<details>
<summary><strong>动画结束是否代表 Codex 已加载完成？</strong></summary>

动画按固定时长播放，不检测应用加载进度。较慢的机器上，交接后应用可能仍在加载。如果 WebKit 卡住，20 秒保护计时器会关闭动画；目标应用启动失败时会显示系统提示。

</details>

## 卸载

```sh
zsh scripts/uninstall.sh
```

移除启动监听和桌面链接，并将本项目安装的启动器移到废纸篓。项目源码和视频保留。

## 开发与验证

<details>
<summary><strong>展开查看仓库结构、媒体导出与验证工具</strong></summary>

```text
welcome-codex/
├── README.md / README_EN.md / README_JA.md
├── animation.js           # 手写、色彩与动画时间线
├── knot-paths.js          # 图标与连续丝带路径
├── preview.html           # 本地动画预览
├── macos/                # Swift 原生窗口与生命周期监听
├── scripts/              # 构建、安装、卸载与视频导出
├── tools/                # 导出与回归验证工具
└── media/                # README 动图和 4K 视频
```

可选的 4K 视频导出需要 Node.js、Playwright 和 Google Chrome：

```sh
zsh scripts/render.sh
```

必要时通过 `NODE_BINARY` 和 `NODE_PATH` 指定工具位置。脚本也会检测本机 Codex 随附的 Node 运行时。视频不参与原生启动流程。

使用 macOS 自带框架重新导出 README 动图：

```sh
swift tools/export-readme.swift media/welcome-jay.mp4 media/readme-preview.gif
```

| 工具 | 验证范围 |
| --- | --- |
| `scripts/build.sh` | 原生编译与签名检查 |
| `tools/verify-placement.cjs` | 坐标、铺满、全屏、圆角、失效显示器和异常状态文件 |
| `tools/verify-startup.cjs` | 独立测试应用的冷启动、不重播、退出清理和实际窗口对齐 |
| `tools/verify-vector.cjs` | 多色笔触、动画连续性、桌面及移动尺寸和 Retina 渲染 |
| `tools/inspect-video.swift` | 视频轨道信息和逐秒帧提取 |

原生测试需要活跃的 macOS 桌面会话。启动测试使用独立应用，无需退出真实 Codex。

`tools/trace-knot.py` 是可选的路径制作工具，依赖 NumPy、Pillow、SciPy 和 scikit-image；这些不是构建或运行依赖。

</details>

## 参考与致谢

- [dragon-codex-boot](https://github.com/yushua0808-cpu/dragon-codex-boot)：原生启动播放与应用事件监听的架构思路。
- Jay 提供的案例视频与 Apple Event 2021 开场：动画节奏、手写色彩和流动感的视觉参考；原始录屏未随仓库分发。
- [Bootstrap Icons](https://icons.getbootstrap.com/)：图标轮廓比例参考，遵循其 MIT 许可，详见 [第三方声明](THIRD_PARTY_NOTICES.md)。

这是个人定制项目，与 OpenAI 或 Apple 无隶属关系。版本记录见 [CHANGELOG](CHANGELOG.md)。

---

<div align="center">

**welcome Jay.**<br>
<sub>从一笔彩色手写，开始下一次创作。</sub>

[简体中文](README.md) · [English](README_EN.md) · [日本語](README_JA.md)

</div>
