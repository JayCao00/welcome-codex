const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

(async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'welcome-jay-placement-'));
  try {
    const state = path.join(directory, 'state.json');
    const source = (await fs.readFile('macos/main.swift', 'utf8'))
      .replace('FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".codex/.codex-global-state.json")', `URL(fileURLWithPath: ${JSON.stringify(state)})`)
      .split('let delegate = Launcher()')[0];
    const checks = `
func check(_ condition: @autoclosure () -> Bool,_ message: String) {
    if !condition() { fatalError(message) }
}
let screen = NSScreen.screens[0]
let visible = screen.visibleFrame
let expected = CGRect(x: visible.minX+40,y: visible.minY+40,width: 700,height: 600)
let normalWindow = SplashWindow(frame: expected,fullScreen: false)
check(normalWindow.frame == expected,"Native chrome must preserve the exact outer frame")
check(normalWindow.styleMask.contains(.titled) && normalWindow.styleMask.contains(.fullSizeContentView),"Windowed animation must use system rounded corners")
check(normalWindow.contentView!.bounds.size == expected.size,"Native titlebar must not shrink the animation content")
let fullWindow = SplashWindow(frame: screen.frame,fullScreen: true)
check(fullWindow.frame == screen.frame && fullWindow.styleMask == .borderless,"Fullscreen animation must have no rounded window chrome")
func writeState(_ maximized: Bool) {
    let bounds: [String:Any] = ["x": expected.minX,"y": screen.frame.maxY-expected.maxY,
        "width": expected.width,"height": expected.height,"isMaximized": maximized]
    try! JSONSerialization.data(withJSONObject: ["electron-main-window-bounds":bounds]).write(to: geometryStateURL)
}
writeState(false)
check(WindowPlacement.fromCodex()!.frame == expected,"Electron coordinate conversion must preserve position and size")
writeState(true)
check(WindowPlacement.fromCodex()!.frame == visible,"Maximized windows must use the visible work area")
let fullscreen = WindowPlacement(frame: expected,screenFrame: screen.frame,displayID: WindowPlacement.displayID(screen),fullScreen: true)
check(fullscreen.resolved().frame == screen.frame,"Full screen must cover the saved display")
let missingDisplay = WindowPlacement(frame: CGRect(x: 100000,y: 100000,width: 10000,height: 10000),screenFrame: screen.frame,displayID: UInt32.max,fullScreen: false)
let restored = missingDisplay.resolved()
check(NSScreen.screens.contains { $0.visibleFrame.contains(restored.frame) },"Disconnected displays must resolve to a visible window")
try! Data("{}".utf8).write(to: geometryStateURL)
check(WindowPlacement.fromCodex() == nil,"Missing window state must fall back safely")
try! Data("{broken".utf8).write(to: geometryStateURL)
check(WindowPlacement.fromCodex() == nil,"Partial JSON writes must fall back safely")
print("PASS: native window chrome and content size; normal placement; maximized; fullscreen; disconnected display; missing and partial state.")
`;
    const main = path.join(directory, 'main.swift');
    await fs.writeFile(main, source + checks);
    const binary = path.join(directory, 'verify');
    execFileSync('swiftc', ['-suppress-warnings', '-target', `${os.arch() === 'arm64' ? 'arm64' : 'x86_64'}-apple-macosx13.0`, main, '-o', binary, '-framework', 'AppKit', '-framework', 'WebKit']);
    const output = execFileSync(binary, { encoding: 'utf8' });
    assert.match(output, /PASS:/);
    console.log(output.trim());
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
