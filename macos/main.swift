import AppKit
import WebKit
import Darwin

let targetPath = "/Applications/ChatGPT.app"
let geometryStateURL = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".codex/.codex-global-state.json")
let placementURL = FileManager.default.urls(for: .applicationSupportDirectory,in: .userDomainMask)[0].appendingPathComponent("Welcome Jay/window-placement.json")
let targetURL = URL(fileURLWithPath: targetPath)
let app = NSApplication.shared
let arguments = Set(CommandLine.arguments.dropFirst())
let watching = arguments.contains("--watch")
let preview = arguments.contains("--preview")
// Match the canvas before WebKit paints its first frame, including appearance changes.
let welcomeBackground = NSColor(name: NSColor.Name("WelcomeBackground")) { appearance in
    appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
        ? NSColor(srgbRed: 24.0/255, green: 24.0/255, blue: 24.0/255, alpha: 1)
        : .white
}

struct WindowPlacement: Codable, Equatable {
    let frame: CGRect
    let screenFrame: CGRect
    let displayID: UInt32
    let fullScreen: Bool

    static func displayID(_ screen: NSScreen) -> UInt32 {
        (screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value ?? 0
    }

    static func fromCodex() -> WindowPlacement? {
        guard let data = try? Data(contentsOf: geometryStateURL),
              let state = try? JSONSerialization.jsonObject(with: data) as? [String:Any],
              let bounds = state["electron-main-window-bounds"] as? [String:Any],
              let x = bounds["x"] as? Double,let y = bounds["y"] as? Double,
              let width = bounds["width"] as? Double,let height = bounds["height"] as? Double,
              [x,y,width,height].allSatisfy({ $0.isFinite }),width >= 200,height >= 200,
              let primary = NSScreen.screens.first else { return nil }
        // Electron and WindowServer use top-left coordinates; AppKit uses bottom-left.
        let frame = CGRect(x: x,y: primary.frame.maxY-y-height,width: width,height: height)
        let screen = NSScreen.screens.max { intersectionArea(frame,$0.frame) < intersectionArea(frame,$1.frame) } ?? primary
        let maximized = bounds["isMaximized"] as? Bool ?? false
        return WindowPlacement(frame: maximized ? screen.visibleFrame : frame,screenFrame: screen.frame,
                               displayID: displayID(screen),fullScreen: false)
    }

    static func intersectionArea(_ a: CGRect,_ b: CGRect) -> CGFloat {
        let intersection = a.intersection(b)
        return intersection.isNull ? 0 : intersection.width*intersection.height
    }

    func resolved() -> WindowPlacement {
        let screen = NSScreen.screens.first { Self.displayID($0) == displayID }
            ?? NSScreen.screens.max { Self.intersectionArea(frame,$0.frame) < Self.intersectionArea(frame,$1.frame) }!
        if fullScreen { return WindowPlacement(frame: screen.frame,screenFrame: screen.frame,displayID: Self.displayID(screen),fullScreen: true) }
        let visible = screen.visibleFrame
        let width = min(frame.width,visible.width),height = min(frame.height,visible.height)
        let origin = CGPoint(x: min(max(frame.minX,visible.minX),visible.maxX-width),
                             y: min(max(frame.minY,visible.minY),visible.maxY-height))
        return WindowPlacement(frame: CGRect(origin: origin,size: CGSize(width: width,height: height)),
                               screenFrame: screen.frame,displayID: Self.displayID(screen),fullScreen: false)
    }
}

final class WindowMemory {
    var saved = (try? Data(contentsOf: placementURL)).flatMap { try? JSONDecoder().decode(WindowPlacement.self,from: $0) }

    func livePlacement(_ running: NSRunningApplication) -> WindowPlacement? {
        guard !running.isTerminated,let primary = NSScreen.screens.first else { return nil }
        // WindowServer lists front to back. The restored visible window is more
        // reliable than Electron's normal bounds while zoom/fullscreen restores.
        let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly,.excludeDesktopElements],kCGNullWindowID) as? [[String:Any]] ?? []
        let candidates: [(CGRect,NSScreen,Bool)] = windows.compactMap { info in
            guard (info[kCGWindowOwnerPID as String] as? Int32) == running.processIdentifier,
                  (info[kCGWindowLayer as String] as? Int) == 0,
                  (info[kCGWindowIsOnscreen as String] as? Bool) == true,
                  let bounds = info[kCGWindowBounds as String] as? [String:Any],
                  let rect = CGRect(dictionaryRepresentation: bounds as CFDictionary),rect.width >= 480,rect.height >= 500 else { return nil }
            let frame = CGRect(x: rect.minX,y: primary.frame.maxY-rect.maxY,width: rect.width,height: rect.height)
            guard let screen = NSScreen.screens.max(by: { WindowPlacement.intersectionArea(frame,$0.frame) < WindowPlacement.intersectionArea(frame,$1.frame) }) else { return nil }
            let full = abs(frame.minX-screen.frame.minX) < 3 && abs(frame.width-screen.frame.width) < 3
                && abs(frame.minY-screen.frame.minY) < 3 && abs(frame.maxY-screen.frame.maxY) <= max(3,screen.safeAreaInsets.top+3)
            return (frame,screen,full)
        }
        guard let (frame,screen,fullScreen) = candidates.first else { return nil }
        return WindowPlacement(frame: fullScreen ? screen.frame : frame,screenFrame: screen.frame,displayID: WindowPlacement.displayID(screen),fullScreen: fullScreen)
    }

    func remember(_ placement: WindowPlacement) {
        guard placement != saved,let data = try? JSONEncoder().encode(placement) else { return }
        saved = placement
        try? FileManager.default.createDirectory(at: placementURL.deletingLastPathComponent(),withIntermediateDirectories: true)
        try? data.write(to: placementURL,options: .atomic)
    }

    func capture(_ running: NSRunningApplication) {
        if let placement = livePlacement(running) { remember(placement) }
    }

    func placement() -> WindowPlacement? {
        return (saved ?? WindowPlacement.fromCodex())?.resolved()
    }
}

final class SplashWindow: NSWindow {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }

    convenience init(frame: CGRect,fullScreen: Bool) {
        self.init(contentRect: frame,styleMask: fullScreen ? [.borderless] : [.titled,.fullSizeContentView],backing: .buffered,defer: false)
        // Use the same system window outline as Electron instead of clipping WebKit.
        titleVisibility = .hidden
        titlebarAppearsTransparent = true
        for button in [NSWindow.ButtonType.closeButton,.miniaturizeButton,.zoomButton] {
            standardWindowButton(button)?.isHidden = true
        }
        isMovable = false
        isRestorable = false
        backgroundColor = welcomeBackground; isOpaque = true
        hasShadow = !fullScreen
        level = fullScreen ? NSWindow.Level(rawValue: NSWindow.Level.mainMenu.rawValue+1) : .floating
        setFrame(frame,display: false)
    }

    func match(_ placement: WindowPlacement) {
        let mask: NSWindow.StyleMask = placement.fullScreen ? [.borderless] : [.titled,.fullSizeContentView]
        if styleMask != mask { styleMask = mask }
        for button in [NSWindow.ButtonType.closeButton,.miniaturizeButton,.zoomButton] {
            standardWindowButton(button)?.isHidden = true
        }
        hasShadow = !placement.fullScreen
        level = placement.fullScreen ? NSWindow.Level(rawValue: NSWindow.Level.mainMenu.rawValue+1) : .floating
        setFrame(placement.frame,display: true)
    }
}

final class Launcher: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate {
    var window: SplashWindow?
    var webView: WKWebView?
    var safetyTimer: Timer?
    var active = false
    var finishing = false
    var eventMonitor: Any?
    var target: NSRunningApplication?
    var statusItem: NSStatusItem?
    var lockFile: Int32 = -1
    let windowMemory = WindowMemory()
    var geometryTimer: Timer?
    var splashGeometryTimer: Timer?
    var splashPlacement: WindowPlacement?
    var pendingPlacement: WindowPlacement?
    var awaitingFullscreenRestore = false
    var previousPresentationOptions: NSApplication.PresentationOptions?

    func presentFullscreen(_ fullScreen: Bool) {
        if fullScreen {
            if previousPresentationOptions == nil { previousPresentationOptions = app.presentationOptions }
            app.presentationOptions = [.autoHideMenuBar,.autoHideDock]
        } else if let previous = previousPresentationOptions {
            app.presentationOptions = previous
            previousPresentationOptions = nil
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        presentFullscreen(false)
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Preview overrides affect this process only; normal launches follow macOS.
        if preview && arguments.contains("--appearance=dark") { app.appearance = NSAppearance(named: .darkAqua) }
        if preview && arguments.contains("--appearance=light") { app.appearance = NSAppearance(named: .aqua) }
        app.setActivationPolicy(.accessory)
        let center = NSWorkspace.shared.notificationCenter
        center.addObserver(self,selector: #selector(applicationChanged(_:)),name: NSWorkspace.didTerminateApplicationNotification,object: nil)
        if watching {
            center.addObserver(self,selector: #selector(targetStarted(_:)),name: NSWorkspace.didLaunchApplicationNotification,object: nil)
            for name in [NSWorkspace.didActivateApplicationNotification,NSWorkspace.didDeactivateApplicationNotification] {
                center.addObserver(self,selector: #selector(applicationChanged(_:)),name: name,object: nil)
            }
            if let running = NSWorkspace.shared.runningApplications.first(where: { $0.bundleURL?.standardizedFileURL == targetURL.standardizedFileURL }) {
                trackWindow(running)
                setStatusItemVisible(true)
            }
            NSLog("Welcome Jay: watching %@",targetPath)
        } else {
            openOrAnimate()
        }
    }

    func applicationShouldHandleReopen(_ sender: NSApplication,hasVisibleWindows flag: Bool) -> Bool {
        if !active { openOrAnimate() }
        return true
    }

    func openOrAnimate() {
        if !preview, let running = NSWorkspace.shared.runningApplications.first(where: {
            $0.bundleURL?.standardizedFileURL == targetURL.standardizedFileURL
        }) {
            running.activate(options: [.activateAllWindows,.activateIgnoringOtherApps])
            if !watching { app.terminate(nil) }
            return
        }
        showSplash(launchTarget: !preview)
    }

    @objc func playFromMenu() { showSplash(launchTarget: true) }
    @objc func quitWatcher() { app.terminate(nil) }

    func setStatusItemVisible(_ visible: Bool) {
        if !visible {
            if let item = statusItem {
                NSStatusBar.system.removeStatusItem(item); statusItem = nil
                NSLog("Welcome Jay: status item hidden")
            }
            return
        }
        guard statusItem == nil else { return }
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        item.button?.image = NSImage(systemSymbolName: "sparkle",accessibilityDescription: "Welcome Jay")
        let menu = NSMenu()
        menu.addItem(withTitle: "Play welcome Jay",action: #selector(playFromMenu),keyEquivalent: "")
        menu.addItem(.separator())
        menu.addItem(withTitle: "Quit Welcome Jay",action: #selector(quitWatcher),keyEquivalent: "")
        for entry in menu.items { entry.target = self }
        item.menu = menu; statusItem = item
        NSLog("Welcome Jay: status item shown")
    }

    @objc func targetStarted(_ notification: Notification) {
        guard let running = notification.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication,
              running.bundleURL?.standardizedFileURL == targetURL.standardizedFileURL else { return }
        setStatusItemVisible(true)
        guard !active else { return }
        target = running
        trackWindow(running,captureNow: false)
        showSplash(launchTarget: false)
    }

    @objc func applicationChanged(_ notification: Notification) {
        guard let running = notification.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication,
              running.bundleURL?.standardizedFileURL == targetURL.standardizedFileURL else { return }
        if notification.name == NSWorkspace.didTerminateApplicationNotification {
            geometryTimer?.invalidate(); geometryTimer = nil
            let remaining = NSWorkspace.shared.runningApplications.first {
                !$0.isTerminated && $0.processIdentifier != running.processIdentifier
                    && $0.bundleURL?.standardizedFileURL == targetURL.standardizedFileURL
            }
            if let remaining = remaining { target = remaining; trackWindow(remaining) }
            else {
                target = nil; setStatusItemVisible(false)
                finish(activateTarget: false,animated: false)
            }
            return
        }
        if !active { windowMemory.capture(running) }
        if notification.name == NSWorkspace.didActivateApplicationNotification {
            trackWindow(running)
        } else {
            geometryTimer?.invalidate(); geometryTimer = nil
        }
    }

    func trackWindow(_ running: NSRunningApplication,captureNow: Bool = true) {
        geometryTimer?.invalidate()
        if captureNow && !active { windowMemory.capture(running) }
        geometryTimer = Timer.scheduledTimer(withTimeInterval: 0.5,repeats: true) { [weak self] timer in
            guard let self = self,!running.isTerminated else { timer.invalidate(); return }
            if !self.active && running.isActive { self.windowMemory.capture(running) }
        }
        geometryTimer?.tolerance = 0.2
    }

    func showSplash(launchTarget: Bool) {
        guard !active else { return }
        guard let scene = Bundle.main.url(forResource: "preview",withExtension: "html") else {
            showError("The welcome scene is missing. Rebuild or reinstall Welcome Jay.")
            return
        }
        guard let screen = NSScreen.main ?? NSScreen.screens.first else { return }
        let running = target ?? NSWorkspace.shared.runningApplications.first {
            !$0.isTerminated && $0.bundleURL?.standardizedFileURL == targetURL.standardizedFileURL
        }
        let remembered = windowMemory.placement()
        let live = running.flatMap { windowMemory.livePlacement($0) }
        // A cold launch briefly exposes normal bounds before restoring its Space.
        let placement = remembered?.fullScreen == true ? remembered : (live ?? remembered)
        if !preview { target = running }
        let frame = placement?.frame ?? screen.visibleFrame.insetBy(dx: screen.visibleFrame.width*0.1,dy: screen.visibleFrame.height*0.1)
        let fullScreen = placement?.fullScreen ?? false
        let cache = FileManager.default.urls(for: .cachesDirectory,in: .userDomainMask)[0].appendingPathComponent("local.jay.welcome",isDirectory: true)
        do { try FileManager.default.createDirectory(at: cache,withIntermediateDirectories: true) }
        catch { showError(error.localizedDescription); return }
        lockFile = open(cache.appendingPathComponent("splash.lock").path,O_CREAT | O_RDWR,0o600)
        guard lockFile >= 0,flock(lockFile,LOCK_EX | LOCK_NB) == 0 else {
            if lockFile >= 0 { close(lockFile); lockFile = -1 }
            if !watching { app.terminate(nil) }
            return
        }
        active = true; finishing = false
        let win = SplashWindow(frame: frame,fullScreen: fullScreen)
        win.collectionBehavior = [.canJoinAllSpaces,.fullScreenAuxiliary]
        win.isReleasedWhenClosed = false
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        configuration.userContentController.add(self,name: "boot")
        let view = WKWebView(frame: CGRect(origin: .zero,size: frame.size),configuration: configuration)
        view.underPageBackgroundColor = welcomeBackground
        view.autoresizingMask = [.width,.height]
        view.setValue(false,forKey: "drawsBackground")
        view.navigationDelegate = self
        win.contentView = view
        window = win; webView = view
        splashPlacement = placement; pendingPlacement = nil
        awaitingFullscreenRestore = fullScreen
        splashGeometryTimer = Timer.scheduledTimer(withTimeInterval: 0.1,repeats: true) { [weak self] _ in
            self?.matchTargetWindow()
        }
        view.loadFileURL(scene,allowingReadAccessTo: scene.deletingLastPathComponent())
        win.makeKeyAndOrderFront(nil)
        app.activate(ignoringOtherApps: true)
        presentFullscreen(fullScreen)
        // AppKit can reposition a newly presented titled window. Reapply the
        // target's outer frame after presentation so no sidebar is exposed.
        win.setFrame(frame,display: true)
        eventMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            if event.keyCode == 53 || (event.modifierFlags.contains(.command) && event.characters == ".") {
                self?.finish(); return nil
            }
            return event
        }
        safetyTimer = Timer.scheduledTimer(withTimeInterval: 20,repeats: false) { [weak self] _ in self?.finish() }
        if launchTarget {
            let config = NSWorkspace.OpenConfiguration()
            config.activates = false
            NSWorkspace.shared.openApplication(at: targetURL,configuration: config) { [weak self] running,error in
                DispatchQueue.main.async {
                    self?.target = running
                    if let error = error { self?.finish(); self?.showError(error.localizedDescription) }
                }
            }
        }
        NSLog("Welcome Jay: animation started frame=%.0f,%.0f,%.0f,%.0f fullscreen=%@",frame.minX,frame.minY,frame.width,frame.height,fullScreen ? "yes" : "no")
    }

    func matchTargetWindow() {
        guard active,!finishing,!preview,
              let running = target,!running.isTerminated,
              let placement = windowMemory.livePlacement(running) else { return }
        // Require two identical samples so intermediate macOS restore frames
        // do not make the animation follow every step of a window transition.
        defer { pendingPlacement = placement }
        guard placement == pendingPlacement else { return }
        if awaitingFullscreenRestore {
            guard placement.fullScreen else { return }
            awaitingFullscreenRestore = false
        }
        windowMemory.remember(placement)
        if placement.fullScreen && running.isActive { app.activate(ignoringOtherApps: true) }
        presentFullscreen(placement.fullScreen)
        guard placement != splashPlacement || window?.frame != placement.frame else { return }
        window?.match(placement)
        splashPlacement = placement
        NSLog("Welcome Jay: animation matched frame=%.0f,%.0f,%.0f,%.0f fullscreen=%@",placement.frame.minX,placement.frame.minY,placement.frame.width,placement.frame.height,placement.fullScreen ? "yes" : "no")
    }

    func finish(activateTarget: Bool = true,animated: Bool = true) {
        guard active,!finishing else { return }
        finishing = true
        safetyTimer?.invalidate(); safetyTimer = nil
        splashGeometryTimer?.invalidate(); splashGeometryTimer = nil
        if let monitor = eventMonitor { NSEvent.removeMonitor(monitor) }; eventMonitor = nil
        webView?.evaluateJavaScript("window.WelcomeJay?.pause()",completionHandler: nil)
        if !preview && activateTarget {
            let running = target ?? NSWorkspace.shared.runningApplications.first { $0.bundleURL?.standardizedFileURL == targetURL.standardizedFileURL }
            running?.activate(options: [.activateAllWindows,.activateIgnoringOtherApps])
        }
        NSAnimationContext.runAnimationGroup({ context in
            context.duration = animated ? 0.4 : 0
            self.window?.animator().alphaValue = 0
        },completionHandler: {
            self.webView?.configuration.userContentController.removeScriptMessageHandler(forName: "boot")
            self.window?.orderOut(nil); self.window = nil; self.webView = nil
            self.presentFullscreen(false)
            self.active = false
            if self.lockFile >= 0 { flock(self.lockFile,LOCK_UN); close(self.lockFile); self.lockFile = -1 }
            NSLog("Welcome Jay: handoff complete")
            if !watching { app.terminate(nil) }
        })
    }

    func userContentController(_ userContentController: WKUserContentController,didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame,message.webView === webView,let state = message.body as? String else { return }
        if state == "ready" {
            webView?.evaluateJavaScript("window.WelcomeJay.appearance") { result, _ in
                NSLog("Welcome Jay: vector scene ready appearance=%@", result as? String ?? "unknown")
            }
        }
        if state == "complete" { finish() }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { finish() }
    func webView(_ webView: WKWebView,didFail navigation: WKNavigation!,withError error: Error) { finish() }
    func webView(_ webView: WKWebView,didFailProvisionalNavigation navigation: WKNavigation!,withError error: Error) { finish() }

    func showError(_ message: String) {
        let alert = NSAlert(); alert.messageText = "Welcome Jay"; alert.informativeText = message
        alert.runModal()
        if !watching { app.terminate(nil) }
    }
}

let delegate = Launcher()
app.delegate = delegate
app.run()
