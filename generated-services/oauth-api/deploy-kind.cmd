@echo off
setlocal

set "KIND_CMD="
for /f "delims=" %%I in ('where kind 2^>nul') do (
  set "KIND_CMD=%%I"
  goto :kind_found
)
if exist "%LOCALAPPDATA%\Microsoft\WindowsApps\kind.exe" set "KIND_CMD=%LOCALAPPDATA%\Microsoft\WindowsApps\kind.exe"
if not defined KIND_CMD if exist "%LOCALAPPDATA%\Microsoft\WinGet\Packages" (
  for /f "delims=" %%I in ('where /r "%LOCALAPPDATA%\Microsoft\WinGet\Packages" kind.exe 2^>nul') do (
    set "KIND_CMD=%%I"
    goto :kind_found
  )
)
if not defined KIND_CMD if exist "%ProgramFiles%\WindowsApps" (
  for /f "delims=" %%I in ('where /r "%ProgramFiles%\WindowsApps" kind.exe 2^>nul') do (
    set "KIND_CMD=%%I"
    goto :kind_found
  )
)
:kind_found
if not defined KIND_CMD (
  echo kind.exe was not found in PATH or in %LOCALAPPDATA%\Microsoft\WindowsApps.
  echo Install with: winget install Kubernetes.kind
  echo Or add the WindowsApps folder to PATH.
  exit /b 1
)

set "KUBECTL_CMD="
for /f "delims=" %%I in ('where kubectl 2^>nul') do (
  set "KUBECTL_CMD=%%I"
  goto :kubectl_found
)
if exist "%LOCALAPPDATA%\Microsoft\WindowsApps\kubectl.exe" set "KUBECTL_CMD=%LOCALAPPDATA%\Microsoft\WindowsApps\kubectl.exe"
if not defined KUBECTL_CMD if exist "%LOCALAPPDATA%\Microsoft\WinGet\Packages" (
  for /f "delims=" %%I in ('where /r "%LOCALAPPDATA%\Microsoft\WinGet\Packages" kubectl.exe 2^>nul') do (
    set "KUBECTL_CMD=%%I"
    goto :kubectl_found
  )
)
if not defined KUBECTL_CMD if exist "%ProgramFiles%\Docker\Docker\resources\bin\kubectl.exe" set "KUBECTL_CMD=%ProgramFiles%\Docker\Docker\resources\bin\kubectl.exe"
if not defined KUBECTL_CMD if exist "%ProgramFiles(x86)%\Docker\Docker\resources\bin\kubectl.exe" set "KUBECTL_CMD=%ProgramFiles(x86)%\Docker\Docker\resources\bin\kubectl.exe"
:kubectl_found
if not defined KUBECTL_CMD (
  echo kubectl.exe was not found in PATH or in %LOCALAPPDATA%\Microsoft\WindowsApps.
  echo Docker Desktop usually provides kubectl, or install with: winget install Kubernetes.kubectl
  exit /b 1
)

"%KIND_CMD%" get clusters | findstr /R /C:"^sk-idp$" >nul
if errorlevel 1 (
  "%KIND_CMD%" create cluster --config ..\..\kind\cluster.yaml
)
docker build -t oauth-api:local .
"%KIND_CMD%" load docker-image oauth-api:local --name sk-idp
"%KUBECTL_CMD%" apply -f k8s
"%KUBECTL_CMD%" rollout status deployment/oauth-api --timeout=60s
"%KUBECTL_CMD%" get pods
echo Open http://localhost:31000
echo Health http://localhost:31000/health
