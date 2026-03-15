# Contributing to Dictately

Thanks for your interest in contributing. Here's how to get started.

## Development Setup

1. Follow the [setup instructions](README.md#setup) to get the project running locally.
2. Run `npm run dev` to start in development mode with hot-reload.

## Making Changes

1. Fork the repo and create a branch from `main`.
2. Make your changes. Keep commits focused — one concern per commit.
3. Test your changes by running the app in dev mode (`npm run dev`).
4. Open a pull request with a clear description of what you changed and why.

## Code Style

- TypeScript throughout. No `any` unless absolutely necessary.
- Follow the existing patterns in the codebase.
- Keep things simple — don't add abstractions for single-use cases.

## Native Module

The `native/` directory contains Objective-C++ code that interfaces with macOS APIs via Node N-API. If you're modifying native code:

- Rebuild with `npm run rebuild-native`
- Test on a real macOS machine (native code can't run in CI easily)
- Make sure the app still requests permissions correctly

## Areas for Contribution

- Cross-platform support (Linux/Windows native modules)
- Smaller Whisper model support
- UI improvements
- Bug fixes and performance improvements
- Documentation

## Reporting Issues

Open an issue with:
- What you expected to happen
- What actually happened
- macOS version and hardware (Intel vs Apple Silicon)
- Relevant logs from `~/.dictately/logs/`

## License

By contributing, you agree that your contributions will be licensed under the [GPL-3.0 License](LICENSE).
