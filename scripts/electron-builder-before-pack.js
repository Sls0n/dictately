const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function hasBundledLibraries(projectDir) {
  const libsDir = path.join(projectDir, 'resources', 'whisper-server-libs')
  if (!fs.existsSync(libsDir)) {
    return false
  }

  return fs.readdirSync(libsDir).some(name => name.endsWith('.dylib'))
}

exports.default = async function beforePack(context) {
  const projectDir = context.packager.projectDir
  const scriptPath = path.join(projectDir, 'scripts', 'build-whisper-server.sh')
  const sidecarPath = path.join(projectDir, 'resources', 'whisper-server')

  execFileSync('bash', [scriptPath], {
    cwd: projectDir,
    stdio: 'inherit'
  })

  if (!fs.existsSync(sidecarPath) || !hasBundledLibraries(projectDir)) {
    throw new Error(
      'whisper-server sidecar bundle is incomplete after build-whisper-server.sh; expected resources/whisper-server and at least one .dylib in resources/whisper-server-libs'
    )
  }
}
