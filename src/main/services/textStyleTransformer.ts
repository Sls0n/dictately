import type { TextStyle } from '../../shared/types'

function removeCasualPunctuation(text: string): string {
  // Remove commas
  let result = text.replace(/,/g, '')

  // Remove sentence-ending periods:
  // A period is "sentence-ending" if followed by (whitespace + capital letter) or end-of-string,
  // AND not preceded by a digit or another period (preserves decimals, abbreviations, ellipses)
  result = result.replace(/(?<![.\d])\.(?=\s+[A-Z]|$)/g, '')

  return result
}

export function applyTextStyle(text: string, style: TextStyle): string {
  if (style === 'formal') return text

  let result = removeCasualPunctuation(text)

  if (style === 'very-casual') {
    result = result.toLowerCase()
  }

  return result
}
