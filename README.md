# Dictately

Open-source, local-first voice dictation for macOS. Hold the Fn key, speak, release — your words appear in the active app.

Dictately runs [whisper.cpp](https://github.com/ggerganov/whisper.cpp) entirely on your machine. No cloud, no telemetry, no account required. Audio never leaves your Mac.

## Features

- **Hold-to-dictate** — Hold Fn, speak, release. Text is inserted into whatever app has focus.
- **Local-first** — Transcription runs on-device via whisper.cpp with Metal GPU acceleration. Nothing is sent to a server.
- **Personal dictionary** — Add names, acronyms, and technical terms so Whisper gets them right. Supports aliases for alternative spellings or pronunciations.
- **Transcript history** — Browse and copy past dictations, grouped by date.
- **Lightweight** — Lives in the menu bar, stays out of your way.
- **Onboarding wizard** — Walks you through the required macOS permissions on first launch.

## Install

A pre-built `.dmg` for macOS (Apple Silicon) will be available soon. In the meantime, you can build from source using the instructions below.

## Requirements

- **macOS** on Apple Silicon (arm64)
- **Xcode Command Line Tools** — `xcode-select --install`
- **CMake** — `brew install cmake`
- **Node.js** >= 18
- **~4 GB disk space** for the Whisper model and compiled server

## Setup

```bash
# Clone the repository
git clone https://github.com/Sls0n/dictately.git
cd dictately

# Install dependencies
npm install

# Build the whisper.cpp server (compiles with Metal support)
bash scripts/build-whisper-server.sh

# Download the Whisper Large-v3 model (~3 GB)
bash scripts/download-model.sh
```

## Running

```bash
# Development mode (hot-reload)
npm run dev

# Production build
npm run build

# Package as .dmg
npm run package
```

On first launch, Dictately will ask for three macOS permissions:

| Permission | Why |
|---|---|
| **Microphone** | To capture audio while you speak |
| **Input Monitoring** | To detect Fn key press/release via IOKit |
| **Accessibility** | To paste transcribed text into the active app |

## How It Works

```
Fn key held ──► Native IOKit monitor detects key event
             ──► Electron main process starts recording session
             ──► Renderer captures audio via Web Audio API (16 kHz)

Fn key released ──► Audio buffer encoded to WAV
                ──► Sent to local whisper-server (HTTP on 127.0.0.1:18080)
                ──► Transcription returned
                ──► Dictionary corrections applied
                ──► Text inserted into active app via clipboard paste
```

### Architecture

```
dictately/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # App entry, Fn key loop, session management
│   │   ├── tray.ts        # Menu bar tray
│   │   ├── ipc/           # IPC message handlers
│   │   ├── windows/       # Main window + floating overlay
│   │   ├── services/      # Core logic
│   │   │   ├── whisperSidecar.ts    # whisper-server lifecycle & HTTP
│   │   │   ├── audioRecorder.ts     # Recording session control
│   │   │   ├── textInserter.ts      # Clipboard paste / keyboard sim
│   │   │   ├── dictionary.ts        # Correction engine
│   │   │   ├── settings.ts          # Config persistence
│   │   │   ├── permissions.ts       # macOS permission checks
│   │   │   └── transcriptHistory.ts # History storage
│   │   └── utils/
│   ├── preload/            # Context bridge scripts
│   ├── renderer/           # React UI
│   │   ├── main/           # Settings, history, dictionary pages
│   │   ├── overlay/        # Floating recording indicator
│   │   └── onboarding/     # Permission setup wizard
│   └── shared/             # Types and constants
├── native/                 # macOS native module (N-API / Objective-C++)
│   └── src/
│       ├── fn_key_monitor.mm       # IOKit HID event monitoring
│       ├── keyboard_simulator.mm   # CGEventPost for paste/typing
│       └── permissions_checker.mm  # TCC permission queries
├── scripts/
│   ├── build-whisper-server.sh     # Compile whisper.cpp with Metal
│   └── download-model.sh          # Fetch the Whisper model
├── resources/
│   ├── whisper-server              # Compiled sidecar binary
│   ├── whisper-server-libs/        # Bundled dylibs
│   ├── models/                     # Whisper model file
│   └── sounds/                     # Start/stop audio cues
└── build/
    └── entitlements.mac.plist      # macOS entitlements
```

### Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | Electron |
| UI | React + TypeScript |
| Build tool | Vite (via electron-vite) |
| Speech-to-text | whisper.cpp (Metal GPU) |
| Native integration | Node N-API + Objective-C++ |
| Packaging | electron-builder |

### Data Storage

All data is stored locally in `~/.dictately/`:

```
~/.dictately/
├── config.json       # User settings
├── history.json      # Transcript history
├── dictionary.json   # Personal dictionary entries
└── logs/             # Daily log files (auto-cleaned after 7 days)
```

## Future

Some things that could be built:

- **Linux and Windows support** — The native module currently targets macOS only; platform-specific backends for key monitoring and text insertion would enable cross-platform use
- **Configurable activation key** — Support keys other than Fn
- **Smaller models** — Option to use lighter Whisper models for faster transcription on less powerful hardware
- **Server-hosted inference** — Optional remote transcription for users who prefer speed over local-only
- **Snippets and templates** — Voice-triggered text expansion
- **Style modes** — Post-processing to adjust tone, formatting, or punctuation style
- **Streaming transcription** — Show partial results while still speaking

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[GPL-3.0](LICENSE)
