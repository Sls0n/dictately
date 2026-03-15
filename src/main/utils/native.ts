import { logger } from './logger'

export interface NativeAddon {
  startFnMonitor?: (cb: (event: string) => void) => void
  checkAccessibility?: () => boolean
  requestAccessibility?: () => boolean
  checkInputMonitoring?: () => boolean
  requestInputMonitoring?: () => boolean
  simulatePaste?: () => void
  simulateTyping?: (text: string) => void
}

let native: NativeAddon = {}

try {
  native = require('dictately-native')
} catch {
  logger.warn('Native addon not available')
}

export default native
