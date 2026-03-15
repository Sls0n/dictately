interface Props {
  text: string
}

export default function ResultPill({ text }: Props) {
  const displayText = text.length > 60 ? text.substring(0, 57) + '...' : text
  return (
    <div className="pill pill-result">
      <span className="result-check">&#10003;</span>
      <span className="result-text">{displayText}</span>
    </div>
  )
}
