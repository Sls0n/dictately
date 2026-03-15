import path from 'path'
import { APP_DATA_DIR, readJsonFile, writeJsonAtomic } from '../utils/paths'
import { logger } from '../utils/logger'
import {
  DICTIONARY_MAX_ALIASES,
  DICTIONARY_MAX_ENTRY_CHARS,
  DICTIONARY_MAX_ENTRY_WORDS
} from '../../shared/constants'
import type {
  DictionaryAddPayload,
  DictionaryAddResult,
  DictionaryEntry
} from '../../shared/types'

const DICTIONARY_PATH = path.join(APP_DATA_DIR, 'dictionary.json')

let cachedEntries: DictionaryEntry[] | null = null
let cachedPrepared: PreparedDictionaryEntry[] | null = null

function invalidateCache(): void {
  cachedEntries = null
  cachedPrepared = null
}

const MAX_PROMPT_TERMS = 10
const MAX_PROMPT_CHARS = 220
const MIN_PROMPT_AUDIO_DURATION_SECONDS = 0.4
const MIN_FUZZY_SPAN_CHARS = 5
const MAX_FUZZY_WINDOW_TOKENS = 4
const MIN_FUZZY_MARGIN = 0.05

interface PreparedFuzzyForm {
  collapsed: string
  tokenCount: number
}

export interface PreparedDictionaryEntry {
  entry: DictionaryEntry
  promptEligible: boolean
  promptScore: number
  spokenAliasTokens: string[]
  exactPatterns: string[]
  fuzzyForms: PreparedFuzzyForm[]
  fuzzyThreshold: number
  fuzzyEnabled: boolean
}

interface PersistedDictionaryEntry {
  id?: unknown
  word?: unknown
  aliases?: unknown
  addedAt?: unknown
}

interface TranscriptToken {
  value: string
  start: number
  end: number
}

interface ReplacementCandidate {
  start: number
  end: number
  startToken: number
  endToken: number
  replacement: string
  score: number
}

function standardizeWord(word: string): string {
  return word
    .normalize('NFKC')
    .replace(/[\u2018\u2019]/g, '\'')
    .replace(/[‐‑–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function countWords(word: string): number {
  return word ? word.split(/\s+/).filter(Boolean).length : 0
}

function collapseFuzzyText(value: string): string {
  return standardizeWord(value)
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

function buildConsonantSignature(value: string): string {
  return collapseFuzzyText(value).replace(/[aeiou]/g, '')
}

function getDedupeKey(word: string): string {
  return standardizeWord(word).toLocaleLowerCase()
}

function sanitizeWord(word: string): { value: string | null; message?: string } {
  const normalized = standardizeWord(word)

  if (!normalized) {
    return { value: null, message: 'Add a term before saving it.' }
  }

  if (!/[\p{L}\p{N}]/u.test(normalized)) {
    return { value: null, message: 'Dictionary entries need at least one letter or number.' }
  }

  if (normalized.length > DICTIONARY_MAX_ENTRY_CHARS) {
    return {
      value: null,
      message: `Keep entries under ${DICTIONARY_MAX_ENTRY_CHARS} characters.`
    }
  }

  if (countWords(normalized) > DICTIONARY_MAX_ENTRY_WORDS) {
    return {
      value: null,
      message: `Keep entries to ${DICTIONARY_MAX_ENTRY_WORDS} words or fewer.`
    }
  }

  return { value: normalized }
}

function sanitizeAliases(
  aliases: string[] | undefined,
  canonicalWord: string
): { value: string[] | null; message?: string } {
  const values = Array.isArray(aliases) ? aliases : []

  if (values.length > DICTIONARY_MAX_ALIASES) {
    return {
      value: null,
      message: `Keep aliases to ${DICTIONARY_MAX_ALIASES} or fewer.`
    }
  }

  const seen = new Set<string>()
  const sanitized: string[] = []
  const canonicalKey = getDedupeKey(canonicalWord)

  for (const alias of values) {
    const { value, message } = sanitizeWord(alias)
    if (!value) {
      return { value: null, message: message ?? 'Invalid alias.' }
    }

    const dedupeKey = getDedupeKey(value)
    if (dedupeKey === canonicalKey || seen.has(dedupeKey)) {
      continue
    }

    seen.add(dedupeKey)
    sanitized.push(value)
  }

  return { value: sanitized }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildBoundaryRegex(pattern: string): RegExp {
  return new RegExp(`(^|[^\\p{L}\\p{N}])(${pattern})(?=$|[^\\p{L}\\p{N}])`, 'giu')
}

function replaceWholeMatch(text: string, pattern: string, replacement: string): string {
  return text.replace(buildBoundaryRegex(pattern), (_match, prefix: string) => `${prefix}${replacement}`)
}

function buildPhrasePattern(tokens: string[]): string | null {
  if (tokens.length === 0) {
    return null
  }

  return tokens.map(token => escapeRegex(token)).join('[\\s-]+')
}

function buildAliasSegments(word: string, verbalizeSeparators: boolean): string[] {
  const alias = standardizeWord(word)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([A-Za-z])([0-9])/g, '$1 $2')
    .replace(/([0-9])([A-Za-z])/g, '$1 $2')
    .replace(/\+/g, ' plus ')
    .replace(/#/g, ' sharp ')
    .replace(/&/g, ' and ')
    .replace(/@/g, ' at ')
    .replace(/\./g, verbalizeSeparators ? ' dot ' : ' ')
    .replace(/\//g, verbalizeSeparators ? ' slash ' : ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/['’]/g, '')

  return alias.match(/[\p{L}\p{N}]+/gu) ?? []
}

function buildAliasTokens(word: string, verbalizeSeparators: boolean): string[] {
  return buildAliasSegments(word, verbalizeSeparators).map(token => token.toLocaleLowerCase())
}

function isExpandableInitialism(token: string): boolean {
  return /^[A-Z]{2,6}$/.test(token)
}

function buildExpandedAliasTokens(word: string, verbalizeSeparators: boolean): string[] {
  const segments = buildAliasSegments(word, verbalizeSeparators)
  const expanded: string[] = []

  for (const segment of segments) {
    if (isExpandableInitialism(segment)) {
      expanded.push(...segment.toLocaleLowerCase().split(''))
      continue
    }

    expanded.push(segment.toLocaleLowerCase())
  }

  return expanded
}

function buildReplacementPatternsForSurface(surface: string): string[] {
  const compactAliasTokens = buildAliasTokens(surface, false)
  const spokenAliasTokens = buildAliasTokens(surface, true)
  const expandedCompactAliasTokens = buildExpandedAliasTokens(surface, false)
  const expandedSpokenAliasTokens = buildExpandedAliasTokens(surface, true)
  const patterns = new Set<string>()

  patterns.add(escapeRegex(surface).replace(/\\ /g, '\\s+'))

  const compactPattern = buildPhrasePattern(compactAliasTokens)
  if (compactPattern) {
    patterns.add(compactPattern)
  }

  const spokenPattern = buildPhrasePattern(spokenAliasTokens)
  if (spokenPattern) {
    patterns.add(spokenPattern)
  }

  const expandedCompactPattern = buildPhrasePattern(expandedCompactAliasTokens)
  if (expandedCompactPattern) {
    patterns.add(expandedCompactPattern)
  }

  const expandedSpokenPattern = buildPhrasePattern(expandedSpokenAliasTokens)
  if (expandedSpokenPattern) {
    patterns.add(expandedSpokenPattern)
  }

  return Array.from(patterns)
}

function buildFuzzyFormsForSurface(surface: string): PreparedFuzzyForm[] {
  const forms: PreparedFuzzyForm[] = []
  const seen = new Set<string>()

  const addForm = (value: string, tokenCount: number) => {
    const collapsed = collapseFuzzyText(value)
    if (!collapsed || tokenCount === 0) {
      return
    }

    const key = `${collapsed}:${tokenCount}`
    if (seen.has(key)) {
      return
    }

    seen.add(key)
    forms.push({ collapsed, tokenCount })
  }

  addForm(surface, Math.max(1, countWords(surface)))

  const compactAliasTokens = buildAliasTokens(surface, false)
  if (compactAliasTokens.length > 0) {
    addForm(compactAliasTokens.join(' '), compactAliasTokens.length)
  }

  const spokenAliasTokens = buildAliasTokens(surface, true)
  if (spokenAliasTokens.length > 0) {
    addForm(spokenAliasTokens.join(' '), spokenAliasTokens.length)
  }

  const expandedCompactAliasTokens = buildExpandedAliasTokens(surface, false)
  if (expandedCompactAliasTokens.length > 0) {
    addForm(expandedCompactAliasTokens.join(' '), expandedCompactAliasTokens.length)
  }

  const expandedSpokenAliasTokens = buildExpandedAliasTokens(surface, true)
  if (expandedSpokenAliasTokens.length > 0) {
    addForm(expandedSpokenAliasTokens.join(' '), expandedSpokenAliasTokens.length)
  }

  return forms
}

function isPromptEligible(word: string): boolean {
  return countWords(word) <= DICTIONARY_MAX_ENTRY_WORDS
}

function scorePromptCandidate(word: string, spokenAliasTokens: string[]): number {
  let score = 0

  if (/\d/.test(word)) score += 4
  if (/[+#@./&]/.test(word)) score += 3
  if (/\b[A-Z0-9]{2,}\b/.test(word)) score += 4
  if (/[a-z][A-Z]/.test(word)) score += 3
  if (/^[A-Z].{6,}$/.test(word)) score += 2
  if (/^[a-z][a-z0-9-]{7,}$/u.test(word)) score += 1
  if (countWords(word) > 1) score += 1
  if (spokenAliasTokens.length > 1) score += 1
  score += Math.min(3, Math.floor(word.length / 8))

  return score
}

function isFuzzyEligible(entry: DictionaryEntry): boolean {
  return (
    entry.aliases.length > 0 ||
    countWords(entry.word) > 1 ||
    collapseFuzzyText(entry.word).length >= 8 ||
    /\d/.test(entry.word) ||
    /[A-Z]/.test(entry.word) ||
    /[+#@./&_ -]/.test(entry.word)
  )
}

function getFuzzyThreshold(entry: DictionaryEntry): number {
  if (entry.aliases.length > 0) {
    return 0.76
  }

  if (countWords(entry.word) > 1) {
    return 0.82
  }

  if (/\d/.test(entry.word) || /[A-Z]/.test(entry.word) || /[+#@./&_ -]/.test(entry.word)) {
    return 0.8
  }

  if (collapseFuzzyText(entry.word).length >= 8) {
    return 0.82
  }

  return 0.88
}

export function prepareEntries(entries: DictionaryEntry[]): PreparedDictionaryEntry[] {
  return entries.map(entry => {
    const spokenAliasTokens = buildAliasTokens(entry.word, true)
    const surfaces = [entry.word, ...entry.aliases]
    const exactPatterns = new Set<string>()
    const fuzzyForms = new Map<string, PreparedFuzzyForm>()

    for (const surface of surfaces) {
      for (const pattern of buildReplacementPatternsForSurface(surface)) {
        exactPatterns.add(pattern)
      }

      for (const form of buildFuzzyFormsForSurface(surface)) {
        const key = `${form.collapsed}:${form.tokenCount}`
        if (!fuzzyForms.has(key)) {
          fuzzyForms.set(key, form)
        }
      }
    }

    return {
      entry,
      promptEligible: isPromptEligible(entry.word),
      promptScore: scorePromptCandidate(entry.word, spokenAliasTokens),
      spokenAliasTokens,
      exactPatterns: Array.from(exactPatterns),
      fuzzyForms: Array.from(fuzzyForms.values()),
      fuzzyThreshold: getFuzzyThreshold(entry),
      fuzzyEnabled: isFuzzyEligible(entry)
    }
  })
}

function readDictionary(): DictionaryEntry[] {
  const parsed = readJsonFile<unknown[]>(DICTIONARY_PATH, [])
  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed.flatMap((raw): DictionaryEntry[] => {
    const entry = parseDictionaryEntry(raw)
    return entry ? [entry] : []
  })
}

function writeDictionary(entries: DictionaryEntry[]): void {
  writeJsonAtomic(DICTIONARY_PATH, entries)
}

export function getAllWords(): DictionaryEntry[] {
  if (cachedEntries) return cachedEntries
  cachedEntries = readDictionary().sort((a, b) => b.addedAt - a.addedAt)
  return cachedEntries
}

export function getPreparedEntries(): PreparedDictionaryEntry[] {
  if (cachedPrepared) return cachedPrepared
  cachedPrepared = prepareEntries(getAllWords())
  return cachedPrepared
}

function parseDictionaryEntry(raw: unknown): DictionaryEntry | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const candidate = raw as PersistedDictionaryEntry
  const word = typeof candidate.word === 'string' ? candidate.word : ''
  const sanitizedWord = sanitizeWord(word)
  if (!sanitizedWord.value) {
    return null
  }

  const rawAliases = Array.isArray(candidate.aliases)
    ? candidate.aliases.filter((value): value is string => typeof value === 'string')
    : []
  const sanitizedAliases = sanitizeAliases(rawAliases, sanitizedWord.value)
  if (!sanitizedAliases.value) {
    return null
  }

  return {
    id: typeof candidate.id === 'string' && candidate.id ? candidate.id : crypto.randomUUID(),
    word: sanitizedWord.value,
    aliases: sanitizedAliases.value,
    addedAt:
      typeof candidate.addedAt === 'number' && Number.isFinite(candidate.addedAt)
        ? candidate.addedAt
        : Date.now()
  }
}

function getSurfaceKeys(entry: DictionaryEntry): string[] {
  return [entry.word, ...entry.aliases].map(getDedupeKey)
}

function resolveAddPayload(input: DictionaryAddPayload | string): { word: string; aliases: string[] } | null {
  if (typeof input === 'string') {
    const word = sanitizeWord(input)
    if (!word.value) {
      return null
    }

    return { word: word.value, aliases: [] }
  }

  const { value: word, message } = sanitizeWord(input.word ?? '')
  if (!word) {
    throw new Error(message ?? 'Add a term before saving it.')
  }

  const aliases = sanitizeAliases(input.aliases, word)
  if (!aliases.value) {
    throw new Error(aliases.message ?? 'Invalid aliases.')
  }

  return { word, aliases: aliases.value }
}

export function addWord(input: DictionaryAddPayload | string): DictionaryAddResult {
  let payload: { word: string; aliases: string[] } | null = null

  try {
    payload = resolveAddPayload(input)
  } catch (error) {
    return {
      status: 'invalid',
      message: error instanceof Error ? error.message : 'Unable to add that term.'
    }
  }

  if (!payload) {
    return {
      status: 'invalid',
      message: 'Add a term before saving it.'
    }
  }

  const entries = readDictionary()
  const dedupeKey = getDedupeKey(payload.word)

  if (entries.some(entry => getDedupeKey(entry.word) === dedupeKey)) {
    return {
      status: 'duplicate',
      message: 'That term is already in your dictionary.'
    }
  }

  const proposedSurfaceKeys = new Set([dedupeKey, ...payload.aliases.map(getDedupeKey)])
  for (const entry of entries) {
    const conflictingSurface = getSurfaceKeys(entry).find(surfaceKey => proposedSurfaceKeys.has(surfaceKey))
    if (!conflictingSurface) {
      continue
    }

    if (getDedupeKey(entry.word) === conflictingSurface) {
      return {
        status: 'duplicate',
        message: `That term conflicts with "${entry.word}" already in your dictionary.`
      }
    }

    return {
      status: 'duplicate',
      message: `One of those aliases conflicts with "${entry.word}" already in your dictionary.`
    }
  }

  const entry: DictionaryEntry = {
    id: crypto.randomUUID(),
    word: payload.word,
    aliases: payload.aliases,
    addedAt: Date.now()
  }

  entries.push(entry)
  writeDictionary(entries)
  invalidateCache()
  logger.info(
    `Dictionary word added: ${payload.word}${payload.aliases.length > 0 ? ` (aliases: ${payload.aliases.join(', ')})` : ''}`
  )

  return {
    status: 'added',
    entry
  }
}

export function removeWord(id: string): void {
  const entries = readDictionary().filter(e => e.id !== id)
  writeDictionary(entries)
  invalidateCache()
}

export function clearDictionary(): void {
  writeDictionary([])
  invalidateCache()
  logger.info('Dictionary cleared')
}

export function buildPrompt(prepared: PreparedDictionaryEntry[], audioDurationSeconds: number): string {
  if (prepared.length === 0 || audioDurationSeconds < MIN_PROMPT_AUDIO_DURATION_SECONDS) {
    return ''
  }

  const candidates = prepared
    .filter(entry => entry.promptEligible)
    .sort((left, right) => {
      if (right.promptScore !== left.promptScore) {
        return right.promptScore - left.promptScore
      }

      return right.entry.addedAt - left.entry.addedAt
    })

  const selected: string[] = []
  let currentLength = 'Vocabulary: '.length

  for (const candidate of candidates) {
    if (selected.length >= MAX_PROMPT_TERMS) {
      break
    }

    const separatorLength = selected.length === 0 ? 0 : 2
    const nextLength = currentLength + separatorLength + candidate.entry.word.length
    if (nextLength > MAX_PROMPT_CHARS) {
      continue
    }

    selected.push(candidate.entry.word)
    currentLength = nextLength
  }

  if (selected.length === 0) {
    return ''
  }

  return `Vocabulary: ${selected.join(', ')}`
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) {
    return 0
  }

  if (left.length === 0) {
    return right.length
  }

  if (right.length === 0) {
    return left.length
  }

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  const current = new Array<number>(right.length + 1)

  for (let i = 1; i <= left.length; i++) {
    current[0] = i
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      )
    }

    for (let j = 0; j < current.length; j++) {
      previous[j] = current[j]
    }
  }

  return previous[right.length]
}

function computeSimilarity(left: string, right: string): number {
  const maxLength = Math.max(left.length, right.length)
  if (maxLength === 0) {
    return 1
  }

  return 1 - (levenshteinDistance(left, right) / maxLength)
}

function computeFuzzyScore(left: string, right: string): number {
  const baseScore = computeSimilarity(left, right)
  const leftConsonants = buildConsonantSignature(left)
  const rightConsonants = buildConsonantSignature(right)

  if (!leftConsonants || !rightConsonants) {
    return baseScore
  }

  const consonantScore = computeSimilarity(leftConsonants, rightConsonants)
  return Math.max(baseScore, (baseScore * 0.65) + (consonantScore * 0.35))
}

function tokenizeTranscript(text: string): TranscriptToken[] {
  const matches = text.matchAll(/[\p{L}\p{N}]+/gu)
  const tokens: TranscriptToken[] = []

  for (const match of matches) {
    if (typeof match.index !== 'number') {
      continue
    }

    tokens.push({
      value: match[0],
      start: match.index,
      end: match.index + match[0].length
    })
  }

  return tokens
}

function canCompareTokenCounts(spanTokenCount: number, variantTokenCount: number, variantLength: number): boolean {
  if (spanTokenCount === variantTokenCount) {
    return true
  }

  if (Math.abs(spanTokenCount - variantTokenCount) <= 1) {
    return true
  }

  return variantTokenCount === 1 && spanTokenCount <= 3 && variantLength >= 8
}

function applyFuzzyDictionaryCorrections(text: string, preparedEntries: PreparedDictionaryEntry[]): string {
  const fuzzyEntries = preparedEntries.filter(entry => entry.fuzzyEnabled && entry.fuzzyForms.length > 0)
  if (fuzzyEntries.length === 0) {
    return text
  }

  const tokens = tokenizeTranscript(text)
  if (tokens.length === 0) {
    return text
  }

  const candidates: ReplacementCandidate[] = []
  const maxWindowTokens = Math.min(
    MAX_FUZZY_WINDOW_TOKENS,
    Math.max(
      1,
      ...fuzzyEntries.map(entry =>
        Math.max(
          1,
          ...entry.fuzzyForms.map(form =>
            Math.min(MAX_FUZZY_WINDOW_TOKENS, form.tokenCount === 1 ? 3 : form.tokenCount + 1)
          )
        )
      )
    )
  )

  for (let startToken = 0; startToken < tokens.length; startToken++) {
    for (let windowSize = 1; windowSize <= maxWindowTokens; windowSize++) {
      const endToken = startToken + windowSize - 1
      if (endToken >= tokens.length) {
        break
      }

      const spanStart = tokens[startToken].start
      const spanEnd = tokens[endToken].end
      const spanText = text.slice(spanStart, spanEnd)
      const collapsedSpan = collapseFuzzyText(spanText)

      if (collapsedSpan.length < MIN_FUZZY_SPAN_CHARS) {
        continue
      }

      let bestEntry: PreparedDictionaryEntry | null = null
      let bestScore = 0
      let secondBestScore = 0

      for (const entry of fuzzyEntries) {
        let entryBestScore = 0

        for (const form of entry.fuzzyForms) {
          if (!canCompareTokenCounts(windowSize, form.tokenCount, form.collapsed.length)) {
            continue
          }

          const lengthDiff = Math.abs(collapsedSpan.length - form.collapsed.length)
          const maxComparableDiff = Math.max(2, Math.floor(Math.max(collapsedSpan.length, form.collapsed.length) * 0.35))
          if (lengthDiff > maxComparableDiff) {
            continue
          }

          const score = computeFuzzyScore(collapsedSpan, form.collapsed)
          if (score > entryBestScore) {
            entryBestScore = score
          }
        }

        if (entryBestScore > bestScore) {
          secondBestScore = bestScore
          bestScore = entryBestScore
          bestEntry = entry
        } else if (entryBestScore > secondBestScore) {
          secondBestScore = entryBestScore
        }
      }

      if (!bestEntry) {
        continue
      }

      if (getDedupeKey(spanText) === getDedupeKey(bestEntry.entry.word)) {
        continue
      }

      if (bestScore < bestEntry.fuzzyThreshold || bestScore - secondBestScore < MIN_FUZZY_MARGIN) {
        continue
      }

      candidates.push({
        start: spanStart,
        end: spanEnd,
        startToken,
        endToken,
        replacement: bestEntry.entry.word,
        score: bestScore
      })
    }
  }

  if (candidates.length === 0) {
    return text
  }

  candidates.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score
    }

    const leftSpan = left.endToken - left.startToken
    const rightSpan = right.endToken - right.startToken
    if (rightSpan !== leftSpan) {
      return rightSpan - leftSpan
    }

    return left.start - right.start
  })

  const occupiedTokens = new Set<number>()
  const selected: ReplacementCandidate[] = []

  for (const candidate of candidates) {
    let overlaps = false
    for (let index = candidate.startToken; index <= candidate.endToken; index++) {
      if (occupiedTokens.has(index)) {
        overlaps = true
        break
      }
    }

    if (overlaps) {
      continue
    }

    selected.push(candidate)
    for (let index = candidate.startToken; index <= candidate.endToken; index++) {
      occupiedTokens.add(index)
    }
  }

  if (selected.length === 0) {
    return text
  }

  selected.sort((left, right) => left.start - right.start)

  let corrected = ''
  let cursor = 0
  for (const candidate of selected) {
    corrected += text.slice(cursor, candidate.start)
    corrected += candidate.replacement
    cursor = candidate.end
  }
  corrected += text.slice(cursor)

  return corrected
}

export function applyDictionaryCorrections(text: string, prepared: PreparedDictionaryEntry[]): string {
  if (!text || prepared.length === 0) {
    return text
  }

  const preparedEntries = [...prepared].sort((left, right) => {
    if (right.spokenAliasTokens.length !== left.spokenAliasTokens.length) {
      return right.spokenAliasTokens.length - left.spokenAliasTokens.length
    }

    return right.entry.word.length - left.entry.word.length
  })

  let corrected = text

  for (const entry of preparedEntries) {
    for (const pattern of entry.exactPatterns) {
      corrected = replaceWholeMatch(corrected, pattern, entry.entry.word)
    }
  }

  return applyFuzzyDictionaryCorrections(corrected, preparedEntries)
}
