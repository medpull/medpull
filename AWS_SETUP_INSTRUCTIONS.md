# AWS Setup Instructions for medpull.org

## Current Status
✅ Domain `medpull.org` registered  
✅ Route 53 hosted zone created  
⏳ Next: Add DNS records and complete AWS infrastructure

## Step-by-Step Setup

### Step 1: Create S3 Bucket

1. Go to **AWS S3 Console** (https://console.aws.amazon.com/s3/)
2. Click **Create bucket**
3. Bucket name: `medpull.org` (or `www.medpull.org`)
4. AWS Region: Choose your region (e.g., `us-east-1`)
5. **Block Public Access**: 
   - **Uncheck** "Block all public access" (if using CloudFront with OAC, you can keep it blocked)
   - Or if using public hosting, uncheck it and acknowledge
6. Click **Create bucket**

### Step 2: Upload Your Website Files (Temporary)

1. Go to your S3 bucket
2. Click **Upload**
3. Upload the contents of `medpullwebsite/` folder
4. Set permissions to public read (if not using CloudFront OAC)

**OR** wait until Step 4 to configure automatic deployment via GitHub Actions.

### Step 3: Request SSL Certificate in ACM

1. Go to **AWS Certificate Manager** (https://console.aws.amazon.com/acm/)
2. Make sure you're in **US East (N. Virginia) us-east-1** region (required for CloudFront)
3. Click **Request certificate**
4. Choose **Request a public certificate**
5. Domain names:
   - Add `medpull.org`
   - Add `www.medpull.org` (optional, for www subdomain)
6. Validation: **DNS validation** (since you're using Route 53)
7. Click **Request**
8. Click **Create record in Route 53** for each domain (this will auto-create the validation records)
9. Wait for certificate status to become **Issued** (may take a few minutes)

### Step 4: Create CloudFront Distribution

1. Go to **CloudFront Console** (https://console.aws.amazon.com/cloudfront/)
2. Click **Create distribution**
3. **Origin domain**: Select your S3 bucket (e.g., `medpull.org.s3.amazonaws.com`)
   - Or use the S3 website endpoint if you enabled static hosting
4. **Name**: `medpull.org` (or leave default)
5. **Viewer protocol policy**: **Redirect HTTP to HTTPS**
6. **Allowed HTTP methods**: `GET, HEAD`
7. **Default root object**: `index.html`
8. **Alternate domain names (CNAMEs)**:
   - Add `medpull.org`
   - Add `www.medpull.org` (if you want www support)
9. **Custom SSL certificate**: Select the certificate you created in Step 3
10. **Default cache behavior**:
    - **Cache policy**: `CachingOptimized` or create custom
    - **Origin request policy**: `AllViewer` (or `CORS-S3Origin` if needed)
11. **Error pages** (optional but recommended):
    - Create custom error responses:
      - HTTP error code: `403`, Response page path: `/index.html`, HTTP response code: `200`
      - HTTP error code: `404`, Response page path: `/index.html`, HTTP response code: `200`
12. Click **Create distribution**
13. **Wait for deployment** (status will change from "In Progress" to "Deployed" - takes 5-15 minutes)
14. **Note your CloudFront distribution domain name** (looks like: `d1234567890abc.cloudfront.net`)

### Step 5: Add DNS Records in Route 53

1. Go to **Route 53 Console** (https://console.aws.amazon.com/route53/)
2. Click **Hosted zones** → Select `medpull.org`
3. Click **Create record**

#### For Root Domain (medpull.org):
- **Record name**: Leave blank (for root domain) or enter `@`
- **Record type**: **A - Routes traffic to an IPv4 address and some AWS resources**
- **Alias**: **Yes**
- **Route traffic to**: 
  - **Alias to CloudFront distribution**
  - Select your CloudFront distribution from the dropdown
- Click **Create records**

#### For www Subdomain (optional):
- **Record name**: `www`
- **Record type**: **A - Routes traffic to an IPv4 address and some AWS resources**
- **Alias**: **Yes**
- **Route traffic to**: 
  - **Alias to CloudFront distribution**
  - Select the same CloudFront distribution
- Click **Create records**

### Step 6: Verify DNS Propagation

1. Wait 5-15 minutes for DNS propagation
2. Test your domain:
   ```bash
   # Check if DNS is resolving
   nslookup medpull.org
   
   # Or visit in browser
   https://medpull.org
   ```

### Step 7: Manual Upload to S3 (Recommended if you don't own the GitHub repo)

**If this is not your GitHub repository, upload manually:**

1. **Option A: Using AWS CLI** (if you have it installed):
   ```bash
   # Upload assets (CSS, JS, images) with long cache
   aws s3 sync medpullwebsite s3://medpull.org --delete --exclude "*.html" --exclude "README*.md" --cache-control "public, max-age=31536000, immutable"
   
   # Upload HTML files with no-cache
   aws s3 cp medpullwebsite s3://medpull.org --recursive --exclude "*" --include "*.html" --cache-control "no-cache, no-store, must-revalidate" --content-type "text/html; charset=utf-8" --metadata-directive REPLACE
   ```
   Replace `medpull.org` with your actual S3 bucket name.

2. **Option B: Using AWS Console**:
   - Go to S3 Console → Your bucket
   - Click **Upload**
   - Drag and drop all files from `medpullwebsite/` folder
   - Click **Upload**

3. **After uploading, invalidate CloudFront cache** (if you have CloudFront):
   ```bash
   aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
   ```
   Or use CloudFront Console → Your distribution → Invalidations → Create invalidation → Enter `/*` → Create

### Step 8: Configure GitHub Actions (Optional - ONLY if you own/fork the GitHub repo)

**Skip this step if you're manually uploading.**

1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:
   - `AWS_REGION`: e.g., `us-east-1`
   - `AWS_ROLE_TO_ASSUME`: IAM role ARN (see Step 9)
   - `S3_BUCKET`: `medpull.org` (your bucket name)
   - `CLOUDFRONT_DISTRIBUTION_ID`: Your CloudFront distribution ID (found in CloudFront console)

### Step 9: Create IAM Role for GitHub Actions (Optional - ONLY if using GitHub Actions)

1. Go to **IAM Console** → **Roles** → **Create role**
2. **Trusted entity**: **Web identity**
3. **Identity provider**: GitHub
4. **Repository**: `yourusername/medpull` (or your org/orgname/medpull)
5. Add permissions:
   - `AmazonS3FullAccess` (or create custom policy for your bucket only)
   - `CloudFrontFullAccess` (or custom policy for invalidation only)
6. Name the role: `GitHubActions-MedPull-Deploy`
7. Note the **Role ARN** and add it to GitHub secrets as `AWS_ROLE_TO_ASSUME`

## Quick Checklist

- [ ] S3 bucket created
- [ ] SSL certificate requested and validated in ACM (us-east-1)
- [ ] CloudFront distribution created with custom domain
- [ ] Route 53 A record created for `medpull.org` → CloudFront
- [ ] Route 53 A record created for `www.medpull.org` → CloudFront (optional)
- [ ] DNS propagation verified
- [ ] Website accessible at https://medpull.org
- [ ] GitHub Actions secrets configured (if using auto-deploy)

## Troubleshooting

### Domain not resolving:
- Wait 15-30 minutes for DNS propagation
- Check Route 53 records are created correctly
- Verify CloudFront distribution is "Deployed"

### SSL certificate issues:
- Make sure certificate is in **us-east-1** region
- Verify DNS validation records were created in Route 53
- Wait for certificate to show "Issued" status

### 403 Forbidden errors:
- Check S3 bucket permissions
- Verify CloudFront origin is configured correctly
- Check CloudFront distribution status is "Deployed"

### CloudFront not updating:
- After deploying via GitHub Actions, check CloudFront invalidation status
- Create manual invalidation if needed: `/*` path

