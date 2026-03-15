import { Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'path'
import { showMainWindow } from './windows/mainWindow'
import { logger } from './utils/logger'

let tray: Tray | null = null

export function createTray(): Tray {
  const iconPath = join(__dirname, '../../resources/icons/tray-iconTemplate.png')
  let icon: Electron.NativeImage

  try {
    icon = nativeImage.createFromPath(iconPath)
    icon.setTemplateImage(true)
  } catch {
    icon = nativeImage.createEmpty()
    logger.warn('Tray icon not found, using empty icon')
  }

  tray = new Tray(icon)
  tray.setToolTip('Dictately')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Dictately',
      click: () => showMainWindow()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    showMainWindow()
  })

  logger.info('Tray created')
  return tray
}

export function getTray(): Tray | null {
  return tray
}
