interface Props {
  onNext: () => void
}

export default function WelcomeStep({ onNext }: Props) {
  return (
    <>
      <div className="onboarding-icon">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="36" fill="#FFF0EB" stroke="#E8784D" strokeWidth="2" />
          <rect x="34" y="20" width="12" height="28" rx="6" fill="#E8784D" />
          <path d="M26 48c0 7.732 6.268 14 14 14s14-6.268 14-14" stroke="#E8784D" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="40" y1="62" x2="40" y2="68" stroke="#E8784D" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="32" y1="68" x2="48" y2="68" stroke="#E8784D" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <h1>Welcome to Dictately</h1>
      <p>
        Hold the Fn key, speak, and release. Your words appear instantly in any app.
        Fast, private, and entirely local.
      </p>
      <button className="btn-primary" onClick={onNext}>
        Get Started
      </button>
    </>
  )
}
