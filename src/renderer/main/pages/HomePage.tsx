import { useState, useEffect } from 'react'
import TranscriptEntryComponent from '../components/TranscriptEntry'
import type { TranscriptEntry } from '../../../shared/types'

function groupByDate(entries: TranscriptEntry[]): Map<string, TranscriptEntry[]> {
  const groups = new Map<string, TranscriptEntry[]>()
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  for (const entry of entries) {
    const date = new Date(entry.timestamp)
    let label: string

    if (date.toDateString() === today.toDateString()) {
      label = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday'
    } else {
      label = date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      })
    }

    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(entry)
  }

  return groups
}

export default function HomePage() {
  const [entries, setEntries] = useState<TranscriptEntry[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  const loadEntries = async () => {
    const data = await window.dictatelyAPI.getHistory()
    setEntries(data)
  }

  useEffect(() => {
    loadEntries()
    // Refresh periodically to pick up new transcripts
    const interval = setInterval(loadEntries, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleCopy = async (id: string) => {
    await window.dictatelyAPI.copyTranscript(id)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  const handleDelete = async (id: string) => {
    await window.dictatelyAPI.deleteTranscript(id)
    setEntries(entries.filter(e => e.id !== id))
  }

  const handleClearAll = async () => {
    await window.dictatelyAPI.clearHistory()
    setEntries([])
  }

  if (entries.length === 0) {
    return (
      <div className="home-empty">
        <div className="home-empty-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="#ddd" strokeWidth="2" />
            <rect x="28" y="18" width="8" height="20" rx="4" stroke="#ddd" strokeWidth="2" />
            <path d="M22 38c0 5.523 4.477 10 10 10s10-4.477 10-10" stroke="#ddd" strokeWidth="2" strokeLinecap="round" />
            <line x1="32" y1="48" x2="32" y2="54" stroke="#ddd" strokeWidth="2" strokeLinecap="round" />
            <line x1="26" y1="54" x2="38" y2="54" stroke="#ddd" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="home-empty-title">No transcripts yet</h2>
        <p className="home-empty-hint">Hold Fn and start speaking</p>
      </div>
    )
  }

  const grouped = groupByDate(entries)

  return (
    <div className="home-page">
      <div className="home-header">
        <h2>Transcripts</h2>
        <button className="btn-clear" onClick={handleClearAll}>Clear All</button>
      </div>
      {Array.from(grouped.entries()).map(([date, group]) => (
        <div key={date} className="transcript-group">
          <h3 className="transcript-date">{date}</h3>
          {group.map(entry => (
            <div key={entry.id} className="transcript-entry-wrapper">
              <TranscriptEntryComponent
                entry={entry}
                onCopy={handleCopy}
                onDelete={handleDelete}
              />
              {copied === entry.id && <span className="copied-toast">Copied!</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
