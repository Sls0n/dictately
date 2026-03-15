import { ipcMain, BrowserWindow } from 'electron'
import { CHANNELS } from '../../shared/constants'
import { getSettings, updateSettings } from '../services/settings'
import { getAllTranscripts, deleteTranscript, clearAllTranscripts, copyTranscript } from '../services/transcriptHistory'
import { checkPermissions, requestMicPermission, requestInputMonitoring, requestAccessibility, openSystemPreferences } from '../services/permissions'
import { getAllWords, addWord, removeWord, clearDictionary } from '../services/dictionary'
import { logger } from '../utils/logger'
import type { DictionaryAddPayload, OverlayUpdate, Settings } from '../../shared/types'

let overlayWindow: BrowserWindow | null = null

export function setOverlayWindow(win: BrowserWindow): void {
  overlayWindow = win
}

export function sendOverlayUpdate(update: OverlayUpdate): void {
  overlayWindow?.webContents.send(CHANNELS.OVERLAY_UPDATE, update)
}

export function registerIpcHandlers(): void {
  // Settings
  ipcMain.handle(CHANNELS.SETTINGS_GET, () => getSettings())
  ipcMain.handle(CHANNELS.SETTINGS_UPDATE, (_e, partial: Partial<Settings>) => updateSettings(partial))

  // History
  ipcMain.handle(CHANNELS.HISTORY_GET_ALL, () => getAllTranscripts())
  ipcMain.handle(CHANNELS.HISTORY_DELETE, (_e, id: string) => deleteTranscript(id))
  ipcMain.handle(CHANNELS.HISTORY_CLEAR_ALL, () => clearAllTranscripts())
  ipcMain.handle(CHANNELS.HISTORY_COPY, (_e, id: string) => copyTranscript(id))

  // Note: TRANSCRIBE handler is registered in main/index.ts (needs overlay control)

  // Dictionary
  ipcMain.handle(CHANNELS.DICTIONARY_GET_ALL, () => getAllWords())
  ipcMain.handle(CHANNELS.DICTIONARY_ADD, (_e, payload: DictionaryAddPayload) => addWord(payload))
  ipcMain.handle(CHANNELS.DICTIONARY_REMOVE, (_e, id: string) => removeWord(id))
  ipcMain.handle(CHANNELS.DICTIONARY_CLEAR, () => clearDictionary())

  // Permissions
  ipcMain.handle(CHANNELS.PERMISSIONS_CHECK, () => checkPermissions())
  ipcMain.handle(CHANNELS.PERMISSIONS_REQUEST_MIC, () => requestMicPermission())
  ipcMain.handle(CHANNELS.PERMISSIONS_REQUEST_INPUT_MONITORING, () => requestInputMonitoring())
  ipcMain.handle(CHANNELS.PERMISSIONS_REQUEST_ACCESSIBILITY, () => requestAccessibility())
  ipcMain.handle(CHANNELS.APP_OPEN_SYSTEM_PREFS, (_e, pane: string) => openSystemPreferences(pane))

  logger.info('IPC handlers registered')
}
