$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $root
try {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js was not found.' }
  & node .\build.mjs
  if ($LASTEXITCODE -ne 0) { throw "build.mjs failed with exit code $LASTEXITCODE" }
} finally { Pop-Location }
