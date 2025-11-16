# Upload medpullwebsite folder to S3 bucket (PowerShell)
# Usage:
#   .\scripts\upload_to_s3.ps1
#   $env:S3_BUCKET="medpull.org"; .\scripts\upload_to_s3.ps1

param(
    [string]$S3Bucket = $env:S3_BUCKET
)

if ([string]::IsNullOrEmpty($S3Bucket)) {
    Write-Host "Error: S3_BUCKET is required" -ForegroundColor Red
    Write-Host "Usage: `$env:S3_BUCKET='your-bucket-name'; .\scripts\upload_to_s3.ps1" -ForegroundColor Yellow
    exit 1
}

$SiteDir = Join-Path $PSScriptRoot ".." "medpullwebsite" | Resolve-Path -ErrorAction SilentlyContinue

if (-not $SiteDir -or -not (Test-Path $SiteDir)) {
    Write-Host "Error: medpullwebsite directory not found" -ForegroundColor Red
    exit 1
}

Write-Host "Uploading medpullwebsite to s3://$S3Bucket" -ForegroundColor Green
Write-Host "Source: $SiteDir" -ForegroundColor Gray

# Check if AWS CLI is installed
try {
    $null = Get-Command aws -ErrorAction Stop
} catch {
    Write-Host "Error: AWS CLI is not installed. Please install it first." -ForegroundColor Red
    exit 1
}

# Upload assets with long cache (excluding HTML files)
Write-Host "`nUploading assets with long cache headers..." -ForegroundColor Cyan
aws s3 sync "$SiteDir" "s3://$S3Bucket" `
    --delete `
    --exclude "*.html" `
    --exclude "README*.md" `
    --cache-control "public, max-age=31536000, immutable"

# Upload HTML files with no-cache
Write-Host "`nUploading HTML files with no-cache headers..." -ForegroundColor Cyan
Get-ChildItem -Path $SiteDir -Filter "*.html" -Recurse | ForEach-Object {
    $relativePath = $_.FullName.Substring($SiteDir.Length + 1).Replace('\', '/')
    aws s3 cp $_.FullName "s3://$S3Bucket/$relativePath" `
        --cache-control "no-cache, no-store, must-revalidate" `
        --content-type "text/html; charset=utf-8" `
        --metadata-directive REPLACE
}

Write-Host "`n✅ Upload complete!" -ForegroundColor Green
Write-Host "Files uploaded to: s3://$S3Bucket" -ForegroundColor Gray


