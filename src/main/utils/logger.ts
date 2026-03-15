import fs from 'fs'
import path from 'path'
import { LOGS_DIR } from './paths'

type LogLevel = 'info' | 'warn' | 'error'

function getLogFile(): string {
  const date = new Date().toISOString().split('T')[0]
  return path.join(LOGS_DIR, `dictately-${date}.log`)
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString()
  return `[${timestamp}] [${level.toUpperCase()}] ${message}\n`
}

function write(level: LogLevel, message: string): void {
  const formatted = formatMessage(level, message)
  try {
    fs.appendFileSync(getLogFile(), formatted)
  } catch {
    // If logging fails, write to stderr
    process.stderr.write(formatted)
  }
  if (level === 'error') {
    console.error(formatted.trim())
  }
}

export const logger = {
  info: (message: string) => write('info', message),
  warn: (message: string) => write('warn', message),
  error: (message: string) => write('error', message)
}

export function cleanOldLogs(maxAgeDays = 7): void {
  try {
    const files = fs.readdirSync(LOGS_DIR)
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
    for (const file of files) {
      const filePath = path.join(LOGS_DIR, file)
      const stat = fs.statSync(filePath)
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(filePath)
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}
