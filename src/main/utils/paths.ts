import { app } from 'electron'
import path from 'path'
import fs from 'fs'

export const APP_DATA_DIR = path.join(app.getPath('home'), '.dictately')
export const CONFIG_PATH = path.join(APP_DATA_DIR, 'config.json')
export const HISTORY_PATH = path.join(APP_DATA_DIR, 'history.json')
export const LOGS_DIR = path.join(APP_DATA_DIR, 'logs')

export function ensureAppDirs(): void {
  fs.mkdirSync(APP_DATA_DIR, { recursive: true })
  fs.mkdirSync(LOGS_DIR, { recursive: true })
}

export function getResourcePath(relativePath: string): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, relativePath)
  }
  return path.join(__dirname, '../../resources', relativePath)
}

export function getWhisperServerPath(): string {
  return getResourcePath('whisper-server')
}

export function getModelPath(): string {
  return getResourcePath('models/ggml-large-v3.bin')
}

export function getSoundPath(name: string): string {
  return getResourcePath(`sounds/${name}`)
}

export function writeJsonAtomic(filePath: string, data: unknown): void {
  const tmp = filePath + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, filePath)
}

export function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return fallback
  }
}
