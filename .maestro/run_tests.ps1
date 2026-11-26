# ElectraGuard - Maestro test runner
#
# Istemal (ElectraGuard folder se):
#   .\.maestro\run_tests.ps1                     # saare tests (auth + consumer + admin)
#   .\.maestro\run_tests.ps1 -Suite consumer     # sirf ek folder
#   .\.maestro\run_tests.ps1 -Suite smoke        # sirf smoke tag wale tests
#   .\.maestro\run_tests.ps1 -IncludeWrites      # wo tests bhi jo asli data banate hain
#   .\.maestro\run_tests.ps1 -Flow consumer\05_chatbot.yaml   # sirf ek file
#
# PowerShell script block ho to pehle:  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

param(
    [ValidateSet("all", "auth", "consumer", "admin", "smoke")]
    [string]$Suite = "all",
    [string]$Flow = "",
    [switch]$IncludeWrites
)

# ───── Apni test details yahan likhein ─────
$CONSUMER_EMAIL    = "consumer@example.com"   # test consumer ka email ya Consumer ID
$CONSUMER_PASSWORD = "Test@1234"
$ADMIN_EMAIL       = "admin@example.com"
$ADMIN_PASSWORD    = "Admin@1234"
$ISSUE_TYPE        = "Meter Tampering"        # Report screen ke dropdown mein jo naam nazar aata hai
$OTP               = ""                       # khali chhorein: OTP aane par phone par khud type karein
# ───────────────────────────────────────────

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Set-Location $root

if (-not (Get-Command maestro -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\maestro\bin") { $env:Path += ";C:\maestro\bin" }
    else { Write-Host "Maestro nahi mila. C:\maestro\bin ko PATH mein add karein." -ForegroundColor Red; exit 1 }
}
if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\platform-tools") { $env:Path += ";C:\platform-tools" }
}

# Phone connected hai?
$devices = (adb devices) -match "\tdevice$"
if (-not $devices) { Write-Host "Koi phone connect nahi. 'adb devices' check karein." -ForegroundColor Red; exit 1 }

# CSV upload test ke liye file phone ke Download folder mein bhejein
adb push "$root\test-data\electraguard_test.csv" /sdcard/Download/electraguard_test.csv | Out-Null

$envArgs = @(
    "-e", "CONSUMER_EMAIL=$CONSUMER_EMAIL",
    "-e", "CONSUMER_PASSWORD=$CONSUMER_PASSWORD",
    "-e", "ADMIN_EMAIL=$ADMIN_EMAIL",
    "-e", "ADMIN_PASSWORD=$ADMIN_PASSWORD",
    "-e", "ISSUE_TYPE=$ISSUE_TYPE",
    "-e", "OTP=$OTP"
)
$tagArgs = @()
if (-not $IncludeWrites) { $tagArgs += "--exclude-tags=writes-data" }

New-Item -ItemType Directory -Force "$root\reports" | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmm"

if ($Flow) {
    maestro test @envArgs $Flow
    exit $LASTEXITCODE
}

$targets = switch ($Suite) {
    "all"   { @("auth", "consumer", "admin") }
    "smoke" { @("auth", "consumer", "admin") }
    default { @($Suite) }
}
if ($Suite -eq "smoke") { $tagArgs += "--include-tags=smoke" }

$failed = 0
foreach ($t in $targets) {
    Write-Host "`n===== $t tests =====" -ForegroundColor Cyan
    maestro test @envArgs @tagArgs --format junit --output "reports\${t}_$stamp.xml" $t
    if ($LASTEXITCODE -ne 0) { $failed++ }
}

Write-Host ""
if ($failed -eq 0) { Write-Host "Saare tests pass ho gaye." -ForegroundColor Green }
else { Write-Host "$failed suite(s) mein failures hain. Report: .maestro\reports" -ForegroundColor Yellow }
Write-Host "Screenshots aur JUnit reports: $root\reports"
exit $failed
