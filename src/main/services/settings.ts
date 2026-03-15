import { app } from 'electron'
import { CONFIG_PATH, readJsonFile, writeJsonAtomic } from '../utils/paths'
import { DEFAULT_SETTINGS } from '../../shared/constants'
import { logger } from '../utils/logger'
import type { Settings } from '../../shared/types'

let cachedSettings: Settings | null = null

export function getSettings(): Settings {
  if (cachedSettings) return cachedSettings

  cachedSettings = { ...DEFAULT_SETTINGS, ...readJsonFile<Partial<Settings>>(CONFIG_PATH, {}) }
  return cachedSettings
}

export function updateSettings(partial: Partial<Settings>): Settings {
  const current = getSettings()
  const updated = { ...current, ...partial }

  writeJsonAtomic(CONFIG_PATH, updated)
  cachedSettings = updated

  if ('openAtLogin' in partial) {
    app.setLoginItemSettings({ openAtLogin: updated.openAtLogin })
    logger.info(`Login item set to: ${updated.openAtLogin}`)
  }

  return updated
}
