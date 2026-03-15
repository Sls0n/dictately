import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS } from '../shared/constants'
import type {
  DictionaryAddPayload,
  DictionaryAddResult,
  DictionaryEntry,
  PermissionStatus,
  Settings,
  TranscriptEntry
} from '../shared/types'

const api = {
  getSettings: (): Promise<Settings> => ipcRenderer.invoke(CHANNELS.SETTINGS_GET),
  updateSettings: (partial: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke(CHANNELS.SETTINGS_UPDATE, partial),

  getHistory: (): Promise<TranscriptEntry[]> => ipcRenderer.invoke(CHANNELS.HISTORY_GET_ALL),
  deleteTranscript: (id: string): Promise<void> => ipcRenderer.invoke(CHANNELS.HISTORY_DELETE, id),
  clearHistory: (): Promise<void> => ipcRenderer.invoke(CHANNELS.HISTORY_CLEAR_ALL),
  copyTranscript: (id: string): Promise<boolean> => ipcRenderer.invoke(CHANNELS.HISTORY_COPY, id),

  getDictionary: (): Promise<DictionaryEntry[]> =>
    ipcRenderer.invoke(CHANNELS.DICTIONARY_GET_ALL),
  addWord: (payload: DictionaryAddPayload): Promise<DictionaryAddResult> =>
    ipcRenderer.invoke(CHANNELS.DICTIONARY_ADD, payload),
  removeWord: (id: string): Promise<void> => ipcRenderer.invoke(CHANNELS.DICTIONARY_REMOVE, id),
  clearDictionary: (): Promise<void> => ipcRenderer.invoke(CHANNELS.DICTIONARY_CLEAR),

  transcribe: (payload: { sessionId: number; wavBuffer: ArrayBuffer | null }): Promise<string | null> =>
    ipcRenderer.invoke(CHANNELS.TRANSCRIBE, payload),

  checkPermissions: (): Promise<PermissionStatus> => ipcRenderer.invoke(CHANNELS.PERMISSIONS_CHECK),
  requestMicPermission: (): Promise<boolean> => ipcRenderer.invoke(CHANNELS.PERMISSIONS_REQUEST_MIC),
  requestInputMonitoring: (): Promise<boolean> =>
    ipcRenderer.invoke(CHANNELS.PERMISSIONS_REQUEST_INPUT_MONITORING),
  requestAccessibility: (): Promise<boolean> =>
    ipcRenderer.invoke(CHANNELS.PERMISSIONS_REQUEST_ACCESSIBILITY),
  openSystemPrefs: (pane: string): Promise<void> =>
    ipcRenderer.invoke(CHANNELS.APP_OPEN_SYSTEM_PREFS, pane),

  onMicStart: (callback: (sessionId: number) => void) => {
    const listener = (_event: unknown, sessionId: number) => callback(sessionId)
    ipcRenderer.on(CHANNELS.MIC_START, listener)
    return () => ipcRenderer.removeListener(CHANNELS.MIC_START, listener)
  },
  onMicStop: (callback: (sessionId: number) => void) => {
    const listener = (_event: unknown, sessionId: number) => callback(sessionId)
    ipcRenderer.on(CHANNELS.MIC_STOP, listener)
    return () => ipcRenderer.removeListener(CHANNELS.MIC_STOP, listener)
  },
  onMicCancel: (callback: (sessionId: number) => void) => {
    const listener = (_event: unknown, sessionId: number) => callback(sessionId)
    ipcRenderer.on(CHANNELS.MIC_CANCEL, listener)
    return () => ipcRenderer.removeListener(CHANNELS.MIC_CANCEL, listener)
  },
  sendMicLevel: (level: number) => {
    ipcRenderer.send(CHANNELS.MIC_LEVEL, level)
  }
}

contextBridge.exposeInMainWorld('dictatelyAPI', api)

export type DictatelyAPI = typeof api
