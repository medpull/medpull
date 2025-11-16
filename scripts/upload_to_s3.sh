#!/usr/bin/env bash
set -euo pipefail

# Upload medpullwebsite folder to S3 bucket
# Usage:
#   ./scripts/upload_to_s3.sh
#   S3_BUCKET=medpull.org ./scripts/upload_to_s3.sh

S3_BUCKET=${S3_BUCKET:-""}

if [ -z "$S3_BUCKET" ]; then
  echo "Error: S3_BUCKET environment variable is required"
  echo "Usage: S3_BUCKET=your-bucket-name ./scripts/upload_to_s3.sh"
  exit 1
fi

SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)/medpullwebsite"

if [ ! -d "$SITE_DIR" ]; then
  echo "Error: medpullwebsite directory not found at $SITE_DIR"
  exit 1
fi

echo "Uploading medpullwebsite to s3://$S3_BUCKET"
echo "Source: $SITE_DIR"

# Check if AWS CLI is installed
if ! command -v aws >/dev/null 2>&1; then
  echo "Error: AWS CLI is not installed. Please install it first."
  exit 1
fi

# Upload assets with long cache (CSS, JS, images, etc.)
echo ""
echo "Uploading assets with long cache headers..."
aws s3 sync "$SITE_DIR" "s3://$S3_BUCKET" \
  --delete \
  --exclude "*.html" \
  --exclude "README*.md" \
  --cache-control "public, max-age=31536000, immutable"

# Upload HTML files with no-cache
echo ""
echo "Uploading HTML files with no-cache headers..."
aws s3 cp "$SITE_DIR" "s3://$S3_BUCKET" \
  --recursive \
  --exclude "*" \
  --include "*.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html; charset=utf-8" \
  --metadata-directive REPLACE

echo ""
echo "✅ Upload complete!"
echo "Files uploaded to: s3://$S3_BUCKET"


