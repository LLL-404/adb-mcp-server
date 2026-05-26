# Install ADB (Android Debug Bridge) on Windows
Write-Host "Installing Android Platform Tools (ADB)..." -ForegroundColor Cyan

# Check if ADB already exists
if (Get-Command adb -ErrorAction SilentlyContinue) {
    Write-Host "ADB already installed:" -ForegroundColor Green
    adb --version
    exit 0
}

# Try winget first
try {
    Write-Host "Trying winget..." -ForegroundColor Yellow
    winget install Google.PlatformTools --accept-package-agreements --accept-source-agreements
    if ($?) {
        Write-Host "ADB installed successfully!" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host "winget failed, trying manual download..." -ForegroundColor Yellow
}

# Manual download fallback
$url = "https://dl.google.com/android/repository/platform-tools-latest-windows.zip"
$zipPath = "$env:TEMP\platform-tools.zip"
$extractPath = "$env:LOCALAPPDATA\Android\platform-tools"

Write-Host "Downloading from $url..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing

Write-Host "Extracting to $extractPath..." -ForegroundColor Yellow
Expand-Archive -Path $zipPath -DestinationPath "$env:LOCALAPPDATA\Android" -Force

# Add to PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$extractPath*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$extractPath", "User")
    Write-Host "Added $extractPath to PATH (reopen terminal to apply)" -ForegroundColor Yellow
}

Remove-Item $zipPath -Force
Write-Host "ADB installed successfully!" -ForegroundColor Green

# Verify
& "$extractPath\adb.exe" --version
