import { useState, useEffect } from 'react'

interface Props {
  onNext: () => void
}

export default function InputMonitoringStep({ onNext }: Props) {
  const [opened, setOpened] = useState(false)
  const [granted, setGranted] = useState(false)

  const refreshPermission = async () => {
    try {
      const permissions = await window.dictatelyAPI.checkPermissions()
      setGranted(permissions.inputMonitoring)
      if (permissions.inputMonitoring) {
        setOpened(true)
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

  const handleOpenSettings = async () => {
    setOpened(true)

    const result = await window.dictatelyAPI.requestInputMonitoring()
    setGranted(result)

    if (!result) {
      await window.dictatelyAPI.openSystemPrefs('Privacy_ListenEvent')
    }
  }

  return (
    <>
      <div className="onboarding-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" fill="#FFF0EB" stroke="#E8784D" strokeWidth="2" />
          <rect x="18" y="26" width="28" height="18" rx="3" stroke="#E8784D" strokeWidth="2" />
          <rect x="22" y="30" width="6" height="4" rx="1" fill="#E8784D" />
          <rect x="30" y="30" width="6" height="4" rx="1" fill="#E8784D" />
          <rect x="38" y="30" width="6" height="4" rx="1" fill="#E8784D" />
          <rect x="24" y="36" width="16" height="4" rx="1" fill="#E8784D" />
        </svg>
      </div>
      <h1>Input Monitoring</h1>
      <p>
        Dictately needs Input Monitoring to detect when you press and release the Fn key.
      </p>

      {granted ? (
        <>
          <div className="permission-status permission-granted">Granted</div>
          <br />
          <button className="btn-primary" onClick={onNext}>
            Continue
          </button>
        </>
      ) : !opened ? (
        <>
          <p style={{ fontSize: 13, color: '#6b6b6b', lineHeight: 1.6 }}>
            Click below to open System Settings. Then click <strong>+</strong>, navigate to:<br />
            <code style={{ fontSize: 12 }}>node_modules/electron/dist/Electron.app</code><br />
            and add it to the list. A full app restart is required after granting.
          </p>
          <button className="btn-primary" onClick={handleOpenSettings}>
            Open System Settings
          </button>
        </>
      ) : (
        <>
          <div className="permission-status permission-granted" style={{ background: '#FFF8E1', color: '#F57F17' }}>
            If you already granted access, fully quit and relaunch Dictately. Closing the
            window is not enough because the menu bar app keeps running.
          </div>
          <p style={{ fontSize: 13, color: '#6b6b6b', lineHeight: 1.6, marginTop: 12 }}>
            In development, the item that must be enabled is
            <code style={{ fontSize: 12, marginLeft: 4 }}>node_modules/electron/dist/Electron.app</code>.
          </p>
          <button className="btn-secondary" onClick={() => void refreshPermission()}>
            Re-check Permission
          </button>
          <br />
          <button className="btn-secondary" onClick={handleOpenSettings} style={{ marginTop: 12 }}>
            Open System Settings Again
          </button>
          <br />
          <button className="btn-primary" onClick={onNext} style={{ marginTop: 12 }}>
            Continue
          </button>
        </>
      )}
    </>
  )
}
