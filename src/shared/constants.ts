import type { Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  shortcut: 'fn',
  micDeviceId: 'default',
  insertionMode: 'paste',
  openAtLogin: false,
  muteAudioWhileRecording: false,
  onboardingComplete: false,
  textStyle: 'formal'
}

export const WHISPER_SERVER_PORT = 18080
export const WHISPER_SERVER_HOST = '127.0.0.1'
export const WHISPER_SERVER_URL = `http://${WHISPER_SERVER_HOST}:${WHISPER_SERVER_PORT}`

export const SHORT_TAP_THRESHOLD_MS = 250
export const RESULT_DISPLAY_DURATION_MS = 2000
export const HEALTH_CHECK_INTERVAL_MS = 500
export const HEALTH_CHECK_TIMEOUT_MS = 30000
export const DICTIONARY_MAX_ENTRY_CHARS = 64
export const DICTIONARY_MAX_ENTRY_WORDS = 6
export const DICTIONARY_MAX_ALIASES = 8

export const CHANNELS = {
  OVERLAY_UPDATE: 'overlay:update',

  MIC_START: 'mic:start',
  MIC_STOP: 'mic:stop',
  MIC_CANCEL: 'mic:cancel',
  MIC_LEVEL: 'mic:level',

  TRANSCRIBE: 'transcribe',

  HISTORY_GET_ALL: 'history:getAll',
  HISTORY_DELETE: 'history:delete',
  HISTORY_CLEAR_ALL: 'history:clearAll',
  HISTORY_COPY: 'history:copy',

  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  DICTIONARY_GET_ALL: 'dictionary:getAll',
  DICTIONARY_ADD: 'dictionary:add',
  DICTIONARY_REMOVE: 'dictionary:remove',
  DICTIONARY_CLEAR: 'dictionary:clear',

  AUDIO_GET_MICS: 'audio:getMics',
  AUDIO_GET_CUE_URLS: 'audio:getCueUrls',

  PERMISSIONS_CHECK: 'permissions:check',
  PERMISSIONS_REQUEST_MIC: 'permissions:requestMic',
  PERMISSIONS_REQUEST_INPUT_MONITORING: 'permissions:requestInputMonitoring',
  PERMISSIONS_REQUEST_ACCESSIBILITY: 'permissions:requestAccessibility',

  APP_OPEN_SETTINGS: 'app:openSettings',
  APP_OPEN_SYSTEM_PREFS: 'app:openSystemPrefs'
} as const
