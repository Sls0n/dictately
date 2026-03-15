import type { TranscriptEntry as TranscriptEntryType } from '../../../shared/types'

interface Props {
  entry: TranscriptEntryType
  onCopy: (id: string) => void
  onDelete: (id: string) => void
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function TranscriptEntry({ entry, onCopy, onDelete }: Props) {
  return (
    <div className="transcript-entry" onClick={() => onCopy(entry.id)}>
      <div className="transcript-time">{formatTime(entry.timestamp)}</div>
      <div className="transcript-text">{entry.text}</div>
      <button
        className="transcript-delete"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(entry.id)
        }}
        title="Delete"
      >
        x
      </button>
    </div>
  )
}
