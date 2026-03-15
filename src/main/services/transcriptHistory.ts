import { clipboard } from 'electron'
import { HISTORY_PATH, readJsonFile, writeJsonAtomic } from '../utils/paths'
import { logger } from '../utils/logger'
import type { TranscriptEntry } from '../../shared/types'

function readHistory(): TranscriptEntry[] {
  return readJsonFile<TranscriptEntry[]>(HISTORY_PATH, [])
}

function writeHistory(entries: TranscriptEntry[]): void {
  writeJsonAtomic(HISTORY_PATH, entries)
}

export function getAllTranscripts(): TranscriptEntry[] {
  return readHistory().sort((a, b) => b.timestamp - a.timestamp)
}

export function addTranscript(text: string): TranscriptEntry {
  const entry: TranscriptEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    text
  }
  const entries = readHistory()
  entries.push(entry)
  writeHistory(entries)
  logger.info(`Transcript added: ${text.substring(0, 50)}...`)
  return entry
}

export function deleteTranscript(id: string): void {
  const entries = readHistory().filter(e => e.id !== id)
  writeHistory(entries)
}

export function clearAllTranscripts(): void {
  writeHistory([])
  logger.info('All transcripts cleared')
}

export function copyTranscript(id: string): boolean {
  const entries = readHistory()
  const entry = entries.find(e => e.id === id)
  if (entry) {
    clipboard.writeText(entry.text)
    return true
  }
  return false
}
