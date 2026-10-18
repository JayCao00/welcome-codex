const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn, execFileSync } = require('node:child_process');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await delay(100);
  }
  throw new Error('Timed out waiting for application lifecycle event');
}

(async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'welcome-jay-lifecycle-'));
  const fixture = path.join(directory, 'Startup Fixture.app');
  const watcherApp = path.join(directory, 'Watcher Fixture.app');
  const pidFile = path.join(directory, 'fixture.pid');
  const stateFile = path.join(directory, 'state.json');
  const placementFile = path.join(directory, 'placement.json');
  const fullscreenFile = path.join(directory, 'fullscreen');
  let fixturePID, watcher, coldLauncher;
  let log = '';
  const starts = () => (log.match(/animation started/g) || []).length;
  const finishes = () => (log.match(/handoff complete/g) || []).length;
  const shown = () => (log.match(/status item shown/g) || []).length;
  const hidden = () => (log.match(/status item hidden/g) || []).length;
  try {
    await fs.mkdir(path.join(fixture, 'Contents/MacOS'), { recursive: true });
    await fs.cp(path.resolve('build/ChatGPT Welcome Jay.app'), watcherApp, { recursive: true });
    await fs.writeFile(path.join(fixture, 'Contents/Info.plist'), `<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>local.jay.welcome.test.fixture</string><key>CFBundleExecutable</key><string>Fixture</string><key>CFBundlePackageType</key><string>APPL</string></dict></plist>`);
    const fixtureSource = path.join(directory, 'fixture.swift');
    await fs.writeFile(stateFile, JSON.stringify({ 'electron-main-window-bounds': { x: 100, y: 100, width: 640, height: 600 } }));
    await fs.writeFile(fixtureSource, `import AppKit
let app = NSApplication.shared
app.setActivationPolicy(.regular)
let window = NSWindow(contentRect: NSRect(x: 100,y: 100,width: 640,height: 600),styleMask: [.titled,.closable,.resizable],backing: .buffered,defer: false)
window.collectionBehavior = [.fullScreenPrimary]
window.title = "Welcome Jay startup test"
window.makeKeyAndOrderFront(nil)
var requestedFullscreen = false
Timer.scheduledTimer(withTimeInterval: 0.1,repeats: true) { _ in
    if !requestedFullscreen && FileManager.default.fileExists(atPath: ${JSON.stringify(fullscreenFile)}) {
        requestedFullscreen = true; window.toggleFullScreen(nil)
    }
}
try! String(ProcessInfo.processInfo.processIdentifier).write(toFile: ${JSON.stringify(pidFile)},atomically: true,encoding: .utf8)
app.run()
`);
    const source = (await fs.readFile('macos/main.swift', 'utf8'))
      .replace('let targetPath = "/Applications/ChatGPT.app"', `let targetPath = ${JSON.stringify(fixture)}`)
      .replace('FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".codex/.codex-global-state.json")', `URL(fileURLWithPath: ${JSON.stringify(stateFile)})`)
      .replace('FileManager.default.urls(for: .applicationSupportDirectory,in: .userDomainMask)[0].appendingPathComponent("Welcome Jay/window-placement.json")', `URL(fileURLWithPath: ${JSON.stringify(placementFile)})`)
      .replace('"local.jay.welcome",isDirectory', '"local.jay.welcome.test",isDirectory');
    const watcherSource = path.join(directory, 'watcher.swift');
    await fs.writeFile(watcherSource, source);
    const target = `${os.arch() === 'arm64' ? 'arm64' : 'x86_64'}-apple-macosx13.0`;
    execFileSync('swiftc', ['-suppress-warnings', '-target', target, fixtureSource, '-o', path.join(fixture, 'Contents/MacOS/Fixture'), '-framework', 'AppKit']);
    execFileSync('swiftc', ['-suppress-warnings', '-target', target, watcherSource, '-o', path.join(watcherApp, 'Contents/MacOS/WelcomeJay'), '-framework', 'AppKit', '-framework', 'WebKit']);
    for (const bundle of [fixture, watcherApp]) execFileSync('codesign', ['--force', '--sign', '-', bundle]);
    watcher = spawn(path.join(watcherApp, 'Contents/MacOS/WelcomeJay'), ['--watch']);
    watcher.stderr.on('data', data => { log += data; });
    await until(() => log.includes('watching '));
    assert.equal(shown(), 0, 'Status item must be absent while the target is not running');
    async function launchFixture() {
      execFileSync('/usr/bin/open', ['-n', fixture]);
      await until(async () => {
        try { fixturePID = Number(await fs.readFile(pidFile, 'utf8')); return fixturePID > 0; }
        catch { return false; }
      });
    }
    const firstLaunchAt = Date.now();
    await launchFixture();
    await until(() => finishes() === 1);
    assert.ok(Date.now() - firstLaunchAt >= 12750, 'Native playback must last for the slower 0.8x timeline');
    assert.equal(shown(), 1, 'Status item must appear when the target launches');
    assert.equal(starts(), 1, 'Cold startup should play exactly once');
    assert.match(log, /animation started frame=100,\d+,640,600 fullscreen=no/, 'Normal startup must match saved Codex bounds');
    await until(async () => {
      try { const saved = JSON.parse(await fs.readFile(placementFile, 'utf8')); return saved.fullScreen === false; }
      catch { return false; }
    });
    execFileSync('/usr/bin/open', ['-a', '/Applications/ChatGPT.app']);
    await delay(250);
    execFileSync('/usr/bin/open', [fixture]);
    await delay(1000);
    assert.equal(starts(), 1, 'Switching back to a running app must not replay');
    const launcher = spawn(path.join(watcherApp, 'Contents/MacOS/WelcomeJay'));
    let launcherLog = '';
    launcher.stderr.on('data', data => { launcherLog += data; });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { launcher.kill(); reject(new Error('Running-app launcher did not exit promptly')); }, 3000);
      launcher.on('exit', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`Launcher exit ${code}`)); });
    });
    assert.ok(!launcherLog.includes('animation started'), 'Custom launcher must activate an existing process without replay');
    assert.equal(starts(), 1);
    process.kill(fixturePID, 'SIGTERM'); fixturePID = undefined;
    await until(() => hidden() === 1, 3000);
    await fs.rm(pidFile);
    await delay(500);
    await launchFixture();
    await until(() => finishes() === 2);
    assert.equal(starts(), 2, 'A new process after quitting should play again exactly once');
    assert.equal(shown(), 2, 'Status item must return on relaunch');
    await fs.writeFile(fullscreenFile, 'enter');
    await until(async () => {
      try { return JSON.parse(await fs.readFile(placementFile, 'utf8')).fullScreen === true; }
      catch { return false; }
    });
    process.kill(fixturePID, 'SIGTERM'); fixturePID = undefined;
    await until(() => hidden() === 2, 3000);
    await fs.rm(pidFile);
    await delay(500);
    await launchFixture();
    await until(() => finishes() === 3);
    assert.equal(starts(), 3);
    assert.match(log.split('handoff complete')[2], /animation started frame=.* fullscreen=yes/, 'Full screen must survive quit and relaunch');
    process.kill(fixturePID, 'SIGTERM'); fixturePID = undefined;
    await until(() => hidden() === 3, 3000);
    await fs.rm(pidFile);
    await fs.rm(fullscreenFile);
    await launchFixture();
    await until(() => starts() === 4);
    process.kill(fixturePID, 'SIGTERM'); fixturePID = undefined;
    await until(() => hidden() === 4 && finishes() === 4, 3000);
    await fs.rm(pidFile);
    coldLauncher = spawn(path.join(watcherApp, 'Contents/MacOS/WelcomeJay'));
    let coldLog = '';
    coldLauncher.stderr.on('data', data => { coldLog += data; });
    await until(async () => {
      try { fixturePID = Number(await fs.readFile(pidFile, 'utf8')); return fixturePID > 0 && coldLog.includes('animation started'); }
      catch { return false; }
    });
    process.kill(fixturePID, 'SIGTERM'); fixturePID = undefined;
    await until(() => coldLauncher.exitCode !== null && hidden() === 5, 3000);
    assert.equal(coldLauncher.exitCode, 0);
    assert.match(coldLog, /handoff complete/, 'Quitting the target must also close a custom-launcher splash');
    console.log('PASS: status item follows launch and quit; quitting closes watcher and custom-launcher splashes; 0.8x native playback; saved window bounds; fullscreen capture and relaunch; activation no replay.');
  } finally {
    if (fixturePID) { try { process.kill(fixturePID, 'SIGTERM'); } catch {} }
    if (coldLauncher && coldLauncher.exitCode === null) coldLauncher.kill();
    if (watcher) {
      const exited = new Promise(resolve => watcher.once('exit', resolve));
      watcher.kill(); await exited;
    }
    await fs.rm(directory, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
