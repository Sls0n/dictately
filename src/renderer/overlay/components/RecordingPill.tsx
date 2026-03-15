interface Props {
  level: number
  elapsed: number
}

const BAR_WEIGHTS = [0.7, 0.85, 1.0, 0.85, 0.7]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function RecordingPill({ level, elapsed }: Props) {
  return (
    <div className="pill pill-recording">
      <div className="recording-dot" />
      <div className="level-bars">
        {BAR_WEIGHTS.map((weight, i) => (
          <div
            key={i}
            className="level-bar"
            style={{
              height: `${Math.min(100, Math.max(20, level * 100 * weight))}%`
            }}
          />
        ))}
      </div>
      <span className="recording-time">{formatTime(elapsed)}</span>
    </div>
  )
}
