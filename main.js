const { app, BrowserWindow, shell, session, screen } = require("electron");
const path = require("path");

// Ubuntu AppArmor / GPU quirks: keep the packaged app usable without a system Chrome.
app.commandLine.appendSwitch("no-sandbox");
app.commandLine.appendSwitch("disable-setuid-sandbox");
app.commandLine.appendSwitch("enable-unsafe-swiftshader");
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("use-gl", "angle");
app.commandLine.appendSwitch("use-angle", "swiftshader");
app.commandLine.appendSwitch("disable-gpu-sandbox");

app.setName("Snapchat");

const SNAPCHAT_URL = "https://web.snapchat.com/";
const CHROME_VERSION = process.versions.chrome || "138.0.7204.251";
const CHROME_MAJOR = String(CHROME_VERSION).split(".")[0];
const CHROME_UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VERSION} Safari/537.36`;
const SEC_CH_UA = `"Google Chrome";v="${CHROME_MAJOR}", "Chromium";v="${CHROME_MAJOR}", "Not)A;Brand";v="8"`;

let mainWindow = null;

function iconPath() {
  return path.join(__dirname, "assets", "icon.png");
}

function applyChromeHeaders() {
  const ses = session.defaultSession;
  ses.setUserAgent(CHROME_UA);
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };
    headers["User-Agent"] = CHROME_UA;
    headers["Sec-CH-UA"] = SEC_CH_UA;
    headers["Sec-CH-UA-Mobile"] = "?0";
    headers["Sec-CH-UA-Platform"] = '"Windows"';
    headers["Sec-CH-UA-Full-Version"] = `"${CHROME_VERSION}"`;
    headers["Sec-CH-UA-Platform-Version"] = '"15.0.0"';
    headers["Sec-CH-UA-Arch"] = '"x86"';
    headers["Sec-CH-UA-Bitness"] = '"64"';
    headers["Sec-CH-UA-Model"] = '""';
    callback({ requestHeaders: headers });
  });
}

function injectChromeShims(webContents) {
  const script = `
    (() => {
      try {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        window.chrome = window.chrome || { runtime: {}, app: { isInstalled: false } };
        if (!window.chrome.runtime) window.chrome.runtime = {};
        Object.defineProperty(navigator, "platform", { get: () => "Win32" });
        Object.defineProperty(navigator, "maxTouchPoints", { get: () => 0 });
        const brands = [
          { brand: "Google Chrome", version: "${CHROME_MAJOR}" },
          { brand: "Chromium", version: "${CHROME_MAJOR}" },
          { brand: "Not)A;Brand", version: "8" },
        ];
        const uaData = {
          brands,
          mobile: false,
          platform: "Windows",
          getHighEntropyValues: async () => ({
            architecture: "x86",
            bitness: "64",
            brands,
            fullVersionList: [
              { brand: "Google Chrome", version: "${CHROME_VERSION}" },
              { brand: "Chromium", version: "${CHROME_VERSION}" },
              { brand: "Not)A;Brand", version: "10.0.0.0" },
            ],
            mobile: false,
            model: "",
            platform: "Windows",
            platformVersion: "15.0.0",
            uaFullVersion: "${CHROME_VERSION}",
          }),
        };
        Object.defineProperty(navigator, "userAgentData", { get: () => uaData });
      } catch (_) {}
    })();
  `;
  return webContents.executeJavaScript(script, true).catch(() => {});
}

function createWindow() {
  const display = screen.getPrimaryDisplay().workAreaSize;
  const width = Math.min(1280, display.width - 80);
  const height = Math.min(800, display.height - 80);

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 900,
    minHeight: 600,
    center: true,
    title: "Snapchat",
    icon: iconPath(),
    backgroundColor: "#000000",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setUserAgent(CHROME_UA);

  mainWindow.once("ready-to-show", () => {
    mainWindow.center();
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.on("dom-ready", () => {
    injectChromeShims(mainWindow.webContents);
  });

  mainWindow.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error("Load failed", code, desc);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const host = new URL(url).hostname;
      if (host.endsWith("snapchat.com") || host.endsWith("google.com")) {
        return { action: "allow" };
      }
    } catch (_) {}
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadURL(SNAPCHAT_URL);
}

app.userAgentFallback = CHROME_UA;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    applyChromeHeaders();
    createWindow();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
