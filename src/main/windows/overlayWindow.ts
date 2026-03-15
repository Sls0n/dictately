import { BrowserWindow, screen, app } from 'electron'
import { join } from 'path'

let overlayWindow: BrowserWindow | null = null

const OVERLAY_WIDTH = 260
const OVERLAY_HEIGHT = 60

export function createOverlayWindow(): BrowserWindow {
  overlayWindow = new BrowserWindow({
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/overlay.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  })

  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false })
  overlayWindow.setIgnoreMouseEvents(true, { forward: true })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay/`)
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/overlay/index.html'))
  }

  return overlayWindow
}

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow
}

export function showOverlay(): void {
  if (!overlayWindow) return

  const cursorPoint = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursorPoint)
  const { x, y, width, height } = display.workArea

  overlayWindow.setBounds({
    x: x + Math.round((width - OVERLAY_WIDTH) / 2),
    y: y + height - OVERLAY_HEIGHT - 20,
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT
  })

  overlayWindow.showInactive()
}

export function hideOverlay(): void {
  overlayWindow?.hide()
}
