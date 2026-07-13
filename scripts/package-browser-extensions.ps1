$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root "chrome-extension"
$downloads = Join-Path $root "public/downloads"

New-Item -ItemType Directory -Force -Path $downloads | Out-Null

foreach ($browser in @("chrome", "opera")) {
  $archive = Join-Path $downloads "qr-publish-$browser-extension-v1.1.0.zip"
  if (Test-Path -LiteralPath $archive) {
    Remove-Item -LiteralPath $archive -Force
  }
  Compress-Archive -Path (Join-Path $source "*") -DestinationPath $archive -CompressionLevel Optimal
}
