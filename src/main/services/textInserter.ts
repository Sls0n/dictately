import { clipboard } from 'electron'
import { logger } from '../utils/logger'
import native from '../utils/native'

export async function insertText(text: string, mode: 'paste' | 'typing'): Promise<void> {
  const textWithSpace = ' ' + text.trim()

  if (mode === 'paste') {
    clipboard.writeText(textWithSpace)
    await new Promise(r => setTimeout(r, 10))

    if (native.simulatePaste) {
      native.simulatePaste()
      logger.info('Text inserted via clipboard paste')
    } else {
      logger.warn('simulatePaste not available')
    }
  } else {
    if (native.simulateTyping) {
      native.simulateTyping(textWithSpace)
      logger.info('Text inserted via simulated typing')
    } else {
      logger.warn('simulateTyping not available')
    }
  }
}
