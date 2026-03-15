export interface TranscriptEntry {
  id: string
  timestamp: number
  text: string
}

export interface DictionaryEntry {
  id: string
  word: string
  aliases: string[]
  addedAt: number
}

export interface DictionaryAddPayload {
  word: string
  aliases?: string[]
}

export interface DictionaryAddResult {
  status: 'added' | 'duplicate' | 'invalid'
  entry?: DictionaryEntry
  message?: string
}

export interface Settings {
  shortcut: string
  micDeviceId: string
  insertionMode: 'paste' | 'typing'
  openAtLogin: boolean
  muteAudioWhileRecording: boolean
  onboardingComplete: boolean
  textStyle: TextStyle
}

export interface PermissionStatus {
  microphone: boolean
  inputMonitoring: boolean
  accessibility: boolean
}

export interface AudioCueUrls {
  start: string
  stop: string
}

export type OverlayState = 'hidden' | 'recording' | 'processing' | 'result'

export interface OverlayUpdate {
  state: OverlayState
  text?: string
  level?: number
}

export type TextStyle = 'formal' | 'casual' | 'very-casual'

export type Page = 'home' | 'dictionary' | 'snippets' | 'style' | 'settings'
