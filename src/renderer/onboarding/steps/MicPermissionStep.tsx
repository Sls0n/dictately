import { useState } from 'react'

interface Props {
  onNext: () => void
}

export default function MicPermissionStep({ onNext }: Props) {
  const [granted, setGranted] = useState<boolean | null>(null)

  const handleRequest = async () => {
    const result = await window.dictatelyAPI.requestMicPermission()
    setGranted(result)
  }

  return (
    <>
      <div className="onboarding-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" fill="#FFF0EB" stroke="#E8784D" strokeWidth="2" />
          <rect x="27" y="16" width="10" height="22" rx="5" fill="#E8784D" />
          <path d="M21 38c0 6.075 4.925 11 11 11s11-4.925 11-11" stroke="#E8784D" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h1>Microphone Access</h1>
      <p>
        Dictately needs your microphone to hear you speak.
        Audio is processed locally and never leaves your device.
      </p>
      {granted === null && (
        <button className="btn-primary" onClick={handleRequest}>
          Grant Microphone Access
        </button>
      )}
      {granted === true && (
        <>
          <div className="permission-status permission-granted">Granted</div>
          <br />
          <button className="btn-primary" onClick={onNext}>
            Continue
          </button>
        </>
      )}
      {granted === false && (
        <>
          <div className="permission-status permission-denied">Denied</div>
          <p style={{ fontSize: 13, marginTop: 12 }}>
            Please enable Microphone access in System Settings &gt; Privacy &amp; Security &gt; Microphone.
          </p>
          <button
            className="btn-secondary"
            onClick={() => window.dictatelyAPI.openSystemPrefs('Privacy_Microphone')}
          >
            Open System Settings
          </button>
          <br />
          <button className="btn-primary" onClick={onNext} style={{ marginTop: 12 }}>
            Continue Anyway
          </button>
        </>
      )}
    </>
  )
}
