import { useState, useEffect } from 'react'
import type { TextStyle } from '../../../shared/types'

const STYLES: { id: TextStyle; title: string; tag: string; preview: string }[] = [
  {
    id: 'formal',
    title: 'Formal',
    tag: 'Caps + Punctuation',
    preview: "Sounds good, let me check my calendar. I think Thursday works, but I'll confirm by end of day."
  },
  {
    id: 'casual',
    title: 'Casual',
    tag: 'Caps + Less punctuation',
    preview: "Sounds good let me check my calendar I think Thursday works but I'll confirm by end of day"
  },
  {
    id: 'very-casual',
    title: 'Very Casual',
    tag: 'No caps + Less punctuation',
    preview: "sounds good let me check my calendar i think thursday works but i'll confirm by end of day"
  }
]

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function StylePage() {
  const [selected, setSelected] = useState<TextStyle>('formal')

  useEffect(() => {
    window.dictatelyAPI.getSettings().then((s) => {
      setSelected(s.textStyle)
    })
  }, [])

  function handleSelect(style: TextStyle) {
    setSelected(style)
    window.dictatelyAPI.updateSettings({ textStyle: style })
  }

  return (
    <div className="style-page">
      <h2>Style</h2>
      <p className="style-subtitle">
        Choose how your dictated text is formatted before it's inserted.
      </p>
      <div className="style-cards">
        {STYLES.map((s) => {
          const isSelected = selected === s.id
          return (
            <button
              key={s.id}
              className={`style-card${isSelected ? ' selected' : ''}`}
              onClick={() => handleSelect(s.id)}
            >
              <div className="style-card-header">
                <div className="style-card-info">
                  <span className="style-card-title">{s.title}</span>
                  <span className="style-card-tag">{s.tag}</span>
                </div>
                <div className={`style-card-radio${isSelected ? ' active' : ''}`}>
                  {isSelected && <CheckIcon />}
                </div>
              </div>
              <div className="style-card-preview">{s.preview}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
