param([string]$ApkPath = "app/build/outputs/apk/debug/app-debug.apk")

# Ensure ANDROID_HOME is set
if (-not $env:ANDROID_HOME) {
    $env:ANDROID_HOME = "C:\Users\Dell User\AppData\Local\Android\Sdk"
}

$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"

Write-Host "=== FORERUN E2E Test Script ===" -ForegroundColor Cyan

Write-Host "`n[1/5] Waiting for device..." -ForegroundColor Yellow
& $adb wait-for-device

Write-Host "[2/5] Installing APK ($ApkPath)..." -ForegroundColor Yellow
& $adb install -r $ApkPath

Write-Host "[3/5] Clearing logcat..." -ForegroundColor Yellow
& $adb logcat -c

Write-Host "[4/5] Launching app..." -ForegroundColor Yellow
& $adb shell am start -n com.forerun.customer/.MainActivity

Write-Host "`n=== MANUAL TESTS (perform on emulator/device) ===" -ForegroundColor Cyan
Write-Host "  S1: Complete onboarding -> should land on Login" -ForegroundColor White
Write-Host "  S2: Register (use 0988888888 / test1234) -> should land on Pending" -ForegroundColor White
Write-Host "  S3: Logout from Pending -> Login again -> should land on Pending" -ForegroundColor White
Write-Host "  S4: See PROGRESS.md for sessionExpired simulation steps" -ForegroundColor White
Write-Host ""

Read-Host "Press ENTER when all tests are done"

Write-Host "`n[5/5] Dumping relevant logcat..." -ForegroundColor Yellow
& $adb logcat -d | Select-String "Forerun|sessionExpired|AndroidRuntime"

Write-Host "`n=== Done. Copy the output above. ===" -ForegroundColor Green
