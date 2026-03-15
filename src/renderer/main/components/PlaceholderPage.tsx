interface Props {
  title: string
  description: string
}

export default function PlaceholderPage({ title, description }: Props) {
  return (
    <div className="placeholder-page">
      <div className="placeholder-content">
        <div className="placeholder-icon">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <rect x="10" y="10" width="60" height="60" rx="12" stroke="#ccc" strokeWidth="2" strokeDasharray="6 4" />
            <circle cx="40" cy="36" r="8" stroke="#ccc" strokeWidth="2" />
            <path d="M28 56c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="placeholder-title">{title}</h2>
        <p className="placeholder-description">{description}</p>
      </div>
    </div>
  )
}
