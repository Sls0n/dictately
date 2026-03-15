import { app, ipcMain } from 'electron'
import { execFile } from 'child_process'
import { ensureAppDirs, getSoundPath } from './utils/paths'
import { logger, cleanOldLogs } from './utils/logger'
import { createTray } from './tray'
import { showMainWindow, hideMainWindow, createMainWindow } from './windows/mainWindow'
import { createOverlayWindow, showOverlay, hideOverlay } from './windows/overlayWindow'
import { registerIpcHandlers, setOverlayWindow, sendOverlayUpdate } from './ipc/handlers'
import { setMainWindow, startRecording, stopRecording, cancelRecording } from './services/audioRecorder'
import { startWhisperServer, stopWhisperServer, transcribe } from './services/whisperSidecar'
import { insertText } from './services/textInserter'
import { addTranscript } from './services/transcriptHistory'
import { getSettings } from './services/settings'
import { applyDictionaryCorrections, buildPrompt, getAllWords, getPreparedEntries } from './services/dictionary'
import { applyTextStyle } from './services/textStyleTransformer'
import native from './utils/native'
import { SHORT_TAP_THRESHOLD_MS, RESULT_DISPLAY_DURATION_MS, CHANNELS } from '../shared/constants'

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

app.on('second-instance', () => {
  showMainWindow()
})

let fnDownTime = 0
let isRecording = false
let currentRecordingSessionId = 0
let overlayHideTimeout: ReturnType<typeof setTimeout> | null = null
let wasMutedBeforeRecording = false

function checkSystemMuted(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('osascript', ['-e', 'output muted of (get volume settings)'], (err, stdout) => {
      if (err) {
        logger.warn(`Failed to check system mute state: ${err.message}`)
        resolve(false)
        return
      }
      resolve(stdout.trim() === 'true')
    })
  })
}

function setSystemMuted(muted: boolean): void {
  execFile('osascript', ['-e', `set volume output muted ${muted}`], (err) => {
    if (err) logger.warn(`Failed to set system mute: ${err.message}`)
  })
}

function restoreAudioMuteState(): void {
  const settings = getSettings()
  if (settings.muteAudioWhileRecording && !wasMutedBeforeRecording) {
    setSystemMuted(false)
  }
}

function playSoundCue(name: string): void {
  const soundPath = getSoundPath(`${name}.wav`)
  execFile('afplay', [soundPath], (err) => {
    if (err) logger.warn(`Failed to play ${name} sound: ${err.message}`)
  })
}

function clearOverlayHideTimeout(): void {
  if (overlayHideTimeout) {
    clearTimeout(overlayHideTimeout)
    overlayHideTimeout = null
  }
}

function getAudioDurationSeconds(buffer: Buffer): number {
  if (buffer.byteLength <= 44) {
    return 0
  }

  return (buffer.byteLength - 44) / 32000
}

function setupFnKeyMonitor(): void {
  if (!native.startFnMonitor) {
    logger.warn('startFnMonitor not available — Fn key monitoring disabled')
    return
  }

  try {
    native.startFnMonitor((event: string) => {
      if (event === 'fnDown' && !isRecording) {
        currentRecordingSessionId += 1
        fnDownTime = Date.now()
        isRecording = true

        clearOverlayHideTimeout()
        hideMainWindow()
        startRecording(currentRecordingSessionId)
        showOverlay()
        sendOverlayUpdate({ state: 'recording' })
        playSoundCue('start')

        const settings = getSettings()
        if (settings.muteAudioWhileRecording) {
          checkSystemMuted().then((wasMuted) => {
            wasMutedBeforeRecording = wasMuted
            if (!wasMuted) setSystemMuted(true)
          })
        }
      } else if (event === 'fnUp' && isRecording) {
        isRecording = false
        const duration = Date.now() - fnDownTime

        if (duration < SHORT_TAP_THRESHOLD_MS) {
          cancelRecording(currentRecordingSessionId)
          sendOverlayUpdate({ state: 'hidden' })
          hideOverlay()
          restoreAudioMuteState()
          logger.info('Short tap detected, cancelled')
          return
        }

        stopRecording(currentRecordingSessionId)
        sendOverlayUpdate({ state: 'processing' })
        playSoundCue('stop')
        restoreAudioMuteState()
      }
    })
    logger.info('Fn key monitor started')
  } catch (err) {
    logger.warn(`Fn key monitor failed to start (Input Monitoring permission needed): ${err}`)
  }
}

ipcMain.handle(
  CHANNELS.TRANSCRIBE,
  async (_event, payload: { sessionId: number; wavBuffer: ArrayBuffer | null }) => {
    const { sessionId, wavBuffer } = payload

    if (!wavBuffer || wavBuffer.byteLength === 0) {
      if (sessionId === currentRecordingSessionId) {
        clearOverlayHideTimeout()
        sendOverlayUpdate({ state: 'hidden' })
        hideOverlay()
      }
      return null
    }

    const buffer = Buffer.from(wavBuffer)
    const prepared = getPreparedEntries()
    const dictionaryEntries = getAllWords()
    const prompt = buildPrompt(prepared, getAudioDurationSeconds(buffer))

    if (dictionaryEntries.length > 0) {
      if (prompt) {
        logger.info(`Dictionary active with ${dictionaryEntries.length} entries, prompt: ${prompt}`)
      } else {
        logger.info(`Dictionary loaded ${dictionaryEntries.length} entries, but no prompt was sent for this clip`)
      }
    }

    const rawText = await transcribe(buffer, prompt)
    const text = rawText ? applyDictionaryCorrections(rawText, prepared) : null

    if (rawText && text && rawText !== text) {
      logger.info(`Dictionary corrected transcript: "${rawText}" -> "${text}"`)
    }

    if (text) {
      const settings = getSettings()
      const styledText = applyTextStyle(text, settings.textStyle)
      await insertText(styledText, settings.insertionMode)
      addTranscript(styledText)

      if (sessionId !== currentRecordingSessionId) {
        return styledText
      }

      clearOverlayHideTimeout()
      sendOverlayUpdate({ state: 'result', text: styledText })

      overlayHideTimeout = setTimeout(() => {
        if (sessionId !== currentRecordingSessionId) {
          overlayHideTimeout = null
          return
        }

        sendOverlayUpdate({ state: 'hidden' })
        hideOverlay()
        overlayHideTimeout = null
      }, RESULT_DISPLAY_DURATION_MS)
    } else if (sessionId === currentRecordingSessionId) {
      clearOverlayHideTimeout()
      sendOverlayUpdate({ state: 'hidden' })
      hideOverlay()
    }

    return styledText
  }
)

app.whenReady().then(async () => {
  ensureAppDirs()
  cleanOldLogs()
  logger.info('Dictately starting...')

  app.dock?.hide()

  registerIpcHandlers()

  const mainWin = createMainWindow()
  const overlayWin = createOverlayWindow()

  setMainWindow(mainWin)
  setOverlayWindow(overlayWin)

  const settings = getSettings()
  if (!settings.onboardingComplete) {
    mainWin.once('ready-to-show', () => mainWin.show())
  }

  createTray()

  startWhisperServer().catch(err => {
    logger.error(`Failed to start whisper-server: ${err}`)
  })

  setupFnKeyMonitor()

  ipcMain.on(CHANNELS.MIC_LEVEL, (_event, level: number) => {
    sendOverlayUpdate({ state: 'recording', level })
  })

  logger.info('Dictately ready')
})

app.on('will-quit', () => {
  clearOverlayHideTimeout()
  if (isRecording) restoreAudioMuteState()
  logger.info('Dictately shutting down')
  stopWhisperServer()
})

app.on('window-all-closed', () => {
  // Don't quit — we're a menu bar app
})
