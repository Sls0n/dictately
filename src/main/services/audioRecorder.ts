import { BrowserWindow } from 'electron'
import { CHANNELS } from '../../shared/constants'
import { logger } from '../utils/logger'

let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win
}

function sendRecordingCommand(channel: string, sessionId: number, action: string): void {
  if (!mainWindow) {
    logger.error(`Cannot ${action} recording: main window not set`)
    return
  }

  mainWindow.webContents.send(channel, sessionId)
  logger.info(`Recording ${action} for session ${sessionId}`)
}

export function startRecording(sessionId: number): void {
  sendRecordingCommand(CHANNELS.MIC_START, sessionId, 'start')
}

export function stopRecording(sessionId: number): void {
  sendRecordingCommand(CHANNELS.MIC_STOP, sessionId, 'stop')
}

export function cancelRecording(sessionId: number): void {
  sendRecordingCommand(CHANNELS.MIC_CANCEL, sessionId, 'cancel')
}
