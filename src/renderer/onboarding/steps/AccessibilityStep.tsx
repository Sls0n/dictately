import { useEffect, useState } from 'react'

interface Props {
  onComplete: () => void
}

export default function AccessibilityStep({ onComplete }: Props) {
  const [requested, setRequested] = useState(false)
  const [granted, setGranted] = useState(false)

  const refreshPermission = async () => {
    try {
      const permissions = await window.dictatelyAPI.checkPermissions()
      setGranted(permissions.accessibility)
      if (permissions.accessibility) {
        setRequested(true)
      }
    } catch {
      // Ignore permission refresh failures during onboarding.
    }
  }

  useEffect(() => {
    const handleWindowFocus = () => {
      void refreshPermission()
    }

    void refreshPermission()
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [])

  const handleRequest = async () => {
    // This triggers the macOS prompt dialog
    setRequested(true)
    const result = await window.dictatelyAPI.requestAccessibility()
    setGranted(result)

    if (!result) {
      await window.dictatelyAPI.openSystemPrefs('Privacy_Accessibility')
    }
  }

  const handleOpenSettings = async () => {
    setRequested(true)
    await window.dictatelyAPI.openSystemPrefs('Privacy_Accessibility')
  }

  return (
    <>
      <div className="onboarding-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" fill="#FFF0EB" stroke="#E8784D" strokeWidth="2" />
          <circle cx="32" cy="22" r="5" fill="#E8784D" />
          <path d="M22 30h20M32 30v14M26 44l6-8 6 8" stroke="#E8784D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1>Accessibility</h1>
      <p>
        Dictately needs Accessibility permission to type text into your apps.
        It only uses this to paste your dictated text.
      </p>

      {granted ? (
        <>
          <div className="permission-status permission-granted">Granted</div>
          <br />
          <button className="btn-primary" onClick={onComplete}>
            Start Using Dictately
          </button>
        </>
      ) : !requested ? (
        <>
          <p style={{ fontSize: 13, color: '#6b6b6b', lineHeight: 1.6 }}>
            A system dialog will appear. If it doesn't, open System Settings manually
            and add <strong>Electron.app</strong> from <code style={{ fontSize: 12 }}>node_modules/electron/dist/</code> to Accessibility.
          </p>
          <button className="btn-primary" onClick={handleRequest}>
            Grant Accessibility Access
          </button>
        </>
      ) : (
        <>
          <div className="permission-status permission-granted" style={{ background: '#FFF8E1', color: '#F57F17' }}>
            If you already granted access, click Re-check Permission after returning to the app.
          </div>
          <br />
          <button className="btn-secondary" onClick={() => void refreshPermission()}>
            Re-check Permission
          </button>
          <br />
          <button className="btn-primary" onClick={onComplete}>
            Start Using Dictately
          </button>
          <br />
          <button
            className="btn-secondary"
            onClick={() => void handleOpenSettings()}
            style={{ marginTop: 8 }}
          >
            Open System Settings Manually
          </button>
        </>
      )}
    </>
  )
}
