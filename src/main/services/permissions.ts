import { systemPreferences, shell } from 'electron'
import { logger } from '../utils/logger'
import native from '../utils/native'
import type { PermissionStatus } from '../../shared/types'

export function checkPermissions(): PermissionStatus {
  const mic = systemPreferences.getMediaAccessStatus('microphone') === 'granted'
  const inputMonitoring = native.checkInputMonitoring?.() ?? false
  const accessibility = native.checkAccessibility?.() ?? false

  logger.info(`Permissions: mic=${mic}, input=${inputMonitoring}, a11y=${accessibility}`)
  return { microphone: mic, inputMonitoring, accessibility }
}

export async function requestMicPermission(): Promise<boolean> {
  const result = await systemPreferences.askForMediaAccess('microphone')
  logger.info(`Mic permission request result: ${result}`)
  return result
}

export function requestInputMonitoring(): boolean {
  const result = native.requestInputMonitoring?.() ?? false
  logger.info(`Input monitoring request result: ${result}`)
  return result
}

export function requestAccessibility(): boolean {
  const result = native.requestAccessibility?.() ?? false
  logger.info(`Accessibility request result: ${result}`)
  return result
}

export function openSystemPreferences(pane: string): void {
  shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${pane}`)
}
