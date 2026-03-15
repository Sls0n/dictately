import { useEffect, useRef, useState } from 'react'
import RecordingPill from './components/RecordingPill'
import ProcessingPill from './components/ProcessingPill'
import ResultPill from './components/ResultPill'
import type { OverlayState, OverlayUpdate } from '../../shared/types'

declare global {
  interface Window {
    dictatelyOverlayAPI: {
      onOverlayUpdate: (callback: (update: OverlayUpdate) => void) => () => void
    }
  }
}

export default function OverlayApp() {
  const [state, setState] = useState<OverlayState>('hidden')
  const [level, setLevel] = useState(0)
  const [text, setText] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const stateRef = useRef<OverlayState>('hidden')

  useEffect(() => {
    const cleanup = window.dictatelyOverlayAPI.onOverlayUpdate((update) => {
      if (update.state !== stateRef.current) {
        stateRef.current = update.state
      }

      setState(update.state)
      if (update.level !== undefined) setLevel(update.level)
      if (update.text) setText(update.text)
    })
    return cleanup
  }, [])

  // Timer for recording duration
  useEffect(() => {
    if (state !== 'recording') {
      setElapsed(0)
      return
    }

    const start = Date.now()
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 100)

    return () => clearInterval(interval)
  }, [state])

  if (state === 'hidden') return null

  return (
    <div className="overlay-container">
      {state === 'recording' && <RecordingPill level={level} elapsed={elapsed} />}
      {state === 'processing' && <ProcessingPill />}
      {state === 'result' && <ResultPill text={text} />}
    </div>
  )
}
