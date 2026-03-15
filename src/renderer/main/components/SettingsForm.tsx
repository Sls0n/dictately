import { useState, useEffect } from 'react'
import type { Settings } from '../../../shared/types'

export default function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    window.dictatelyAPI.getSettings().then(setSettings)
  }, [])

  const update = async (partial: Partial<Settings>) => {
    const updated = await window.dictatelyAPI.updateSettings(partial)
    setSettings(updated)
  }

  if (!settings) return null

  return (
    <div className="settings-form">
      <div className="settings-section">
        <div className="settings-section-title">Input</div>
        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-row-text">
              <span className="settings-label">Shortcut</span>
              <span className="settings-desc">Hold to record, release to transcribe</span>
            </div>
            <kbd className="kbd">Fn</kbd>
          </div>

          <div className="settings-divider" />

          <div className="settings-row">
            <div className="settings-row-text">
              <span className="settings-label">Insertion Mode</span>
              <span className="settings-desc">How transcribed text is entered into the active app</span>
            </div>
            <div className="settings-toggle-group">
              <button
                className={`settings-toggle ${settings.insertionMode === 'paste' ? 'active' : ''}`}
                onClick={() => update({ insertionMode: 'paste' })}
              >
                Paste
              </button>
              <button
                className={`settings-toggle ${settings.insertionMode === 'typing' ? 'active' : ''}`}
                onClick={() => update({ insertionMode: 'typing' })}
              >
                Typing
              </button>
            </div>
          </div>
        </div>
      </div>

<div className="settings-section">
        <div className="settings-section-title">General</div>
        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-row-text">
              <span className="settings-label">Start at Login</span>
              <span className="settings-desc">Launch Dictately automatically when you log in</span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.openAtLogin}
                onChange={(e) => update({ openAtLogin: e.target.checked })}
              />
              <span className="switch-slider" />
            </label>
          </div>

          <div className="settings-divider" />

          <div className="settings-row">
            <div className="settings-row-text">
              <span className="settings-label">Mute While Recording</span>
              <span className="settings-desc">Silence system audio while the microphone is active</span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.muteAudioWhileRecording}
                onChange={(e) => update({ muteAudioWhileRecording: e.target.checked })}
              />
              <span className="switch-slider" />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
