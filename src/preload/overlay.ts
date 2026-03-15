import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS } from '../shared/constants'
import type { OverlayUpdate } from '../shared/types'

const api = {
  onOverlayUpdate: (callback: (update: OverlayUpdate) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, update: OverlayUpdate) => callback(update)
    ipcRenderer.on(CHANNELS.OVERLAY_UPDATE, handler)
    return () => ipcRenderer.removeListener(CHANNELS.OVERLAY_UPDATE, handler)
  }
}

contextBridge.exposeInMainWorld('dictatelyOverlayAPI', api)

export type DictatelyOverlayAPI = typeof api
