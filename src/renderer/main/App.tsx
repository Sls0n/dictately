import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import HomePage from './pages/HomePage'
import DictionaryPage from './pages/DictionaryPage'
import SnippetsPage from './pages/SnippetsPage'
import StylePage from './pages/StylePage'
import SettingsPage from './pages/SettingsPage'
import OnboardingWizard from '../onboarding/OnboardingWizard'
import type {
  DictionaryAddPayload,
  DictionaryAddResult,
  DictionaryEntry,
  Page,
  PermissionStatus,
  Settings,
  TranscriptEntry
} from '../../shared/types'

declare global {
  interface Window {
    dictatelyAPI: {
      getSettings: () => Promise<Settings>
      updateSettings: (partial: Partial<Settings>) => Promise<Settings>
      getHistory: () => Promise<TranscriptEntry[]>
      deleteTranscript: (id: string) => Promise<void>
      clearHistory: () => Promise<void>
      copyTranscript: (id: string) => Promise<boolean>
      getDictionary: () => Promise<DictionaryEntry[]>
      addWord: (payload: DictionaryAddPayload) => Promise<DictionaryAddResult>
      removeWord: (id: string) => Promise<void>
      clearDictionary: () => Promise<void>
      transcribe: (payload: { sessionId: number; wavBuffer: ArrayBuffer | null }) => Promise<string | null>
      checkPermissions: () => Promise<PermissionStatus>
      requestMicPermission: () => Promise<boolean>
      requestInputMonitoring: () => Promise<boolean>
      requestAccessibility: () => Promise<boolean>
      openSystemPrefs: (pane: string) => Promise<void>
      onMicStart: (callback: (sessionId: number) => void) => () => void
      onMicStop: (callback: (sessionId: number) => void) => () => void
      onMicCancel: (callback: (sessionId: number) => void) => () => void
      sendMicLevel: (level: number) => void
    }
  }
}

function trimSilence(buffer: Float32Array): Float32Array {
  const frameSize = 512
  const threshold = 0.01
  let firstActive = 0
  let lastActive = buffer.length
  let foundLeadingActivity = false
  let foundTrailingActivity = false

  for (let i = 0; i < buffer.length; i += frameSize) {
    const end = Math.min(i + frameSize, buffer.length)
    let rms = 0
    for (let j = i; j < end; j++) {
      rms += buffer[j] * buffer[j]
    }
    rms = Math.sqrt(rms / (end - i))
    if (rms > threshold) {
      firstActive = Math.max(0, i - frameSize)
      foundLeadingActivity = true
      break
    }
  }

  if (!foundLeadingActivity) {
    return new Float32Array(0)
  }

  for (let i = buffer.length - frameSize; i >= 0; i -= frameSize) {
    const end = Math.min(i + frameSize, buffer.length)
    let rms = 0
    for (let j = i; j < end; j++) {
      rms += buffer[j] * buffer[j]
    }
    rms = Math.sqrt(rms / (end - i))
    if (rms > threshold) {
      lastActive = Math.min(buffer.length, end + frameSize)
      foundTrailingActivity = true
      break
    }
  }

  if (!foundTrailingActivity) {
    return new Float32Array(0)
  }

  return buffer.slice(firstActive, lastActive)
}

function encodeWav(buffer: Float32Array): ArrayBuffer {
  const sampleRate = 16000
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = buffer.length * (bitsPerSample / 8)
  const wavBuffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(wavBuffer)

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  for (let i = 0; i < buffer.length; i++) {
    const sample = Math.max(-1, Math.min(1, buffer[i]))
    const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
    view.setInt16(44 + i * 2, value, true)
  }

  return wavBuffer
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!window.dictatelyAPI) {
      setLoading(false)
      return
    }

    window.dictatelyAPI.getSettings().then(settings => {
      setShowOnboarding(!settings.onboardingComplete)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    let audioContext: AudioContext | null = null
    let stream: MediaStream | null = null
    let source: MediaStreamAudioSourceNode | null = null
    let analyser: AnalyserNode | null = null
    let processor: ScriptProcessorNode | null = null
    let chunks: Float32Array[] = []
    let lifecycleToken = 0

    if (!window.dictatelyAPI) {
      return
    }

    const closeAudioContext = async (context: AudioContext | null) => {
      if (!context || context.state === 'closed') {
        return
      }

      try {
        await context.close()
      } catch {
        // Ignore shutdown races from stale recorder instances.
      }
    }

    const teardownRecording = async (): Promise<Float32Array[]> => {
      const capturedChunks = chunks
      chunks = []

      if (processor) {
        processor.onaudioprocess = null
        processor.disconnect()
        processor = null
      }

      if (source) {
        source.disconnect()
        source = null
      }

      if (analyser) {
        analyser.disconnect()
        analyser = null
      }

      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        stream = null
      }

      if (audioContext) {
        const contextToClose = audioContext
        audioContext = null
        await closeAudioContext(contextToClose)
      }

      return capturedChunks
    }

    const finalizeRecording = async (recordingSessionId: number, shouldTranscribe: boolean) => {
      lifecycleToken += 1
      const capturedChunks = await teardownRecording()

      if (!shouldTranscribe) {
        return
      }

      if (capturedChunks.length === 0) {
        void window.dictatelyAPI.transcribe({ sessionId: recordingSessionId, wavBuffer: null })
        return
      }

      const totalLength = capturedChunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const fullBuffer = new Float32Array(totalLength)
      let offset = 0

      for (const chunk of capturedChunks) {
        fullBuffer.set(chunk, offset)
        offset += chunk.length
      }

      const trimmed = trimSilence(fullBuffer)
      if (trimmed.length < 1600) {
        void window.dictatelyAPI.transcribe({ sessionId: recordingSessionId, wavBuffer: null })
        return
      }

      void window.dictatelyAPI.transcribe({
        sessionId: recordingSessionId,
        wavBuffer: encodeWav(trimmed)
      })
    }

    const cleanupMic = window.dictatelyAPI.onMicStart(async (_recordingSessionId) => {
      const currentLifecycleToken = ++lifecycleToken
      await teardownRecording()

      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
            sampleRate: 16000
          }
        })

        if (currentLifecycleToken !== lifecycleToken) {
          nextStream.getTracks().forEach(track => track.stop())
          return
        }

        const nextAudioContext = new AudioContext({ sampleRate: 16000 })
        const nextSource = nextAudioContext.createMediaStreamSource(nextStream)
        const nextAnalyser = nextAudioContext.createAnalyser()
        nextAnalyser.fftSize = 512
        nextSource.connect(nextAnalyser)

        const nextProcessor = nextAudioContext.createScriptProcessor(4096, 1, 1)
        nextSource.connect(nextProcessor)
        nextProcessor.connect(nextAudioContext.destination)
        chunks = []

        nextProcessor.onaudioprocess = event => {
          if (currentLifecycleToken !== lifecycleToken) {
            return
          }

          const input = event.inputBuffer.getChannelData(0)
          chunks.push(new Float32Array(input))

          const dataArray = new Uint8Array(nextAnalyser.frequencyBinCount)
          nextAnalyser.getByteTimeDomainData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            const value = (dataArray[i] - 128) / 128
            sum += value * value
          }

          const rms = Math.sqrt(sum / dataArray.length)
          window.dictatelyAPI.sendMicLevel(Math.min(1, rms * 3))
        }

        if (currentLifecycleToken !== lifecycleToken) {
          nextProcessor.onaudioprocess = null
          nextProcessor.disconnect()
          nextSource.disconnect()
          nextAnalyser.disconnect()
          nextStream.getTracks().forEach(track => track.stop())
          await closeAudioContext(nextAudioContext)
          return
        }

        stream = nextStream
        audioContext = nextAudioContext
        source = nextSource
        analyser = nextAnalyser
        processor = nextProcessor
      } catch (err) {
        if (currentLifecycleToken === lifecycleToken) {
          console.error('Mic error:', err)
        }
      }
    })

    const cleanupStop = window.dictatelyAPI.onMicStop(recordingSessionId => {
      void finalizeRecording(recordingSessionId, true)
    })
    const cleanupCancel = window.dictatelyAPI.onMicCancel(recordingSessionId => {
      void finalizeRecording(recordingSessionId, false)
    })

    return () => {
      lifecycleToken += 1
      cleanupMic()
      cleanupStop()
      cleanupCancel()
      void teardownRecording()
    }
  }, [])

  if (loading) return null

  if (showOnboarding) {
    return <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />
      case 'settings':
        return <SettingsPage />
      case 'dictionary':
        return <DictionaryPage />
      case 'snippets':
        return <SnippetsPage />
      case 'style':
        return <StylePage />
    }
  }

  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  )
}
