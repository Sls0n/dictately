import { ChildProcess, spawn } from 'child_process'
import fs from 'fs'
import { getWhisperServerPath, getModelPath } from '../utils/paths'
import { WHISPER_SERVER_URL, HEALTH_CHECK_INTERVAL_MS, HEALTH_CHECK_TIMEOUT_MS } from '../../shared/constants'
import { logger } from '../utils/logger'

let serverProcess: ChildProcess | null = null
let isShuttingDown = false

export async function startWhisperServer(): Promise<void> {
  if (serverProcess) return

  const binaryPath = getWhisperServerPath()
  const modelPath = getModelPath()

  if (!fs.existsSync(binaryPath)) {
    logger.error(`whisper-server binary not found at: ${binaryPath}`)
    return
  }

  if (!fs.existsSync(modelPath)) {
    logger.error(`Model file not found at: ${modelPath}`)
    return
  }

  // Ensure executable
  try {
    fs.chmodSync(binaryPath, 0o755)
  } catch {
    // May fail on read-only filesystems
  }

  logger.info(`Starting whisper-server: ${binaryPath}`)
  serverProcess = spawn(binaryPath, [
    '--model', modelPath,
    '--host', '127.0.0.1',
    '--port', '18080',
    '--threads', '4'
  ], {
    stdio: ['ignore', 'pipe', 'pipe']
  })

  serverProcess.stdout?.on('data', (data: Buffer) => {
    logger.info(`[whisper-server] ${data.toString().trim()}`)
  })

  serverProcess.stderr?.on('data', (data: Buffer) => {
    logger.warn(`[whisper-server:err] ${data.toString().trim()}`)
  })

  serverProcess.on('exit', (code) => {
    logger.warn(`whisper-server exited with code ${code}`)
    serverProcess = null
    if (!isShuttingDown) {
      logger.info('Auto-restarting whisper-server...')
      setTimeout(() => startWhisperServer(), 1000)
    }
  })

  await waitForHealth()
}

async function waitForHealth(): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < HEALTH_CHECK_TIMEOUT_MS) {
    try {
      const res = await fetch(`${WHISPER_SERVER_URL}/`)
      if (res.ok) {
        logger.info('whisper-server is ready')
        return
      }
    } catch {
      // Server not ready yet
    }
    await new Promise(r => setTimeout(r, HEALTH_CHECK_INTERVAL_MS))
  }
  logger.error('whisper-server failed to start within timeout')
}

export async function transcribe(wavBuffer: Buffer, prompt?: string): Promise<string | null> {
  try {
    const formData = new FormData()
    const blob = new Blob([wavBuffer], { type: 'audio/wav' })
    formData.append('file', blob, 'audio.wav')
    if (prompt) {
      formData.append('prompt', prompt)
    }
    formData.append('beam_size', '8')
    formData.append('temperature', '0.0')

    const res = await fetch(`${WHISPER_SERVER_URL}/inference`, {
      method: 'POST',
      body: formData
    })

    if (!res.ok) {
      logger.error(`Transcription failed: ${res.status} ${res.statusText}`)
      return null
    }

    const json = (await res.json()) as { text?: string }
    const text = (json.text || '').trim()

    // Filter hallucinations
    const hallucinations = [
      '[BLANK_AUDIO]', '(music)', '[Music]', '( music )',
      'Thank you.', 'Thanks for watching!', 'you',
      'Sous-titrage', 'MBC 뉴스', 'ご視聴ありがとうございました'
    ]
    if (!text || hallucinations.some(h => text.toLowerCase() === h.toLowerCase())) {
      logger.info('Transcription empty or hallucination, ignoring')
      return null
    }

    logger.info(`Transcribed: ${text.substring(0, 100)}`)
    return text
  } catch (err) {
    logger.error(`Transcription error: ${err}`)
    return null
  }
}

export function stopWhisperServer(): void {
  isShuttingDown = true
  if (serverProcess) {
    logger.info('Stopping whisper-server...')
    serverProcess.kill('SIGTERM')
    setTimeout(() => {
      if (serverProcess) {
        serverProcess.kill('SIGKILL')
        serverProcess = null
      }
    }, 3000)
  }
}

export function isServerRunning(): boolean {
  return serverProcess !== null
}
