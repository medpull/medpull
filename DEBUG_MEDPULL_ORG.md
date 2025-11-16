# Debug Guide: medpull.org Not Loading

## Step-by-Step Debugging Checklist

### Step 1: Check DNS Resolution
**Is DNS pointing to the right place?**

1. **Check if DNS is resolving:**
   ```powershell
   nslookup medpull.org
   ```
   Or visit: https://dnschecker.org/#A/medpull.org
   - Should show your CloudFront IP addresses or Route 53 nameservers

2. **Check Route 53 records:**
   - Go to Route 53 → Hosted zones → `medpull.org`
   - Verify there's an **A record** (not AAAA unless you have IPv6)
   - Record name: blank or `@`
   - Record type: **A - Alias**
   - Alias target: Should point to your **CloudFront distribution**
   - If it's pointing to S3 directly, that's wrong - it needs to point to CloudFront

### Step 2: Check CloudFront Distribution

1. **Go to CloudFront Console:**
   - https://console.aws.amazon.com/cloudfront/
   - Find your distribution
   - Check **Status** - should be **Deployed** (not "In Progress")

2. **Check CloudFront settings:**
   - **Alternate domain names (CNAMEs)**: Should include `medpull.org`
   - **SSL certificate**: Should be selected (from us-east-1)
   - **Default root object**: Should be `index.html`
   - **Origin**: Should point to your S3 bucket

3. **Get your CloudFront URL:**
   - Look at the **Domain name** (looks like `d1234567890abc.cloudfront.net`)
   - Try visiting this URL directly in your browser
   - If this works, the issue is DNS/Route 53
   - If this doesn't work, the issue is CloudFront/S3

### Step 3: Check S3 Bucket

1. **Go to S3 Console:**
   - Check if `index.html` exists at the root of the bucket
   - Check if `assets/` folder structure is correct

2. **Check S3 permissions:**
   - **Block public access**: Should be OFF (if not using CloudFront OAC)
   - **Bucket policy**: Should allow public read (if not using CloudFront OAC)

3. **Try S3 website endpoint:**
   - If your bucket is in `ap-southeast-2`: `http://medpull.org.s3-website-ap-southeast-2.amazonaws.com`
   - If your bucket is in `ap-southeast-1`: `http://medpull.org.s3-website-ap-southeast-1.amazonaws.com`
   - If this works but CloudFront doesn't, CloudFront origin is wrong

### Step 4: Check SSL Certificate (ACM)

1. **Go to Certificate Manager (ACM):**
   - https://console.aws.amazon.com/acm/
   - **IMPORTANT**: Switch to **us-east-1** region (top right)
   - Find your certificate for `medpull.org`
   - Status should be **Issued**
   - If it's in a different region, create a new one in **us-east-1**

2. **Check certificate domains:**
   - Should include `medpull.org`
   - Optionally `www.medpull.org`

### Step 5: Common Issues

**Issue: "This site can't be reached" or DNS error**
- **Cause**: DNS not configured or not propagated
- **Fix**: Check Route 53 A record points to CloudFront, wait 5-15 min for DNS propagation

**Issue: "Access Denied"**
- **Cause**: S3 bucket permissions wrong
- **Fix**: Check bucket policy and block public access settings

**Issue: "ERR_CERT_AUTHORITY_INVALID" or SSL error**
- **Cause**: Certificate not in us-east-1 or not attached to CloudFront
- **Fix**: Create certificate in us-east-1, attach to CloudFront distribution

**Issue: Blank page or 404**
- **Cause**: CloudFront origin wrong or index.html not at root
- **Fix**: Check CloudFront origin points to correct S3 bucket, verify index.html exists

**Issue: Old content showing**
- **Cause**: CloudFront cache
- **Fix**: Create invalidation: CloudFront → Your distribution → Invalidations → Create invalidation → Enter `/*`

### Step 6: Quick Test URLs

Test these in order:

1. **CloudFront URL**: `https://d1234567890abc.cloudfront.net` (your actual CloudFront domain)
   - If this works → DNS/Route 53 issue
   - If this doesn't work → CloudFront/S3 issue

2. **S3 Website URL**: `http://medpull.org.s3-website-[region].amazonaws.com`
   - If this works → CloudFront origin configuration issue
   - If this doesn't work → S3 bucket/permissions issue

3. **Direct S3 URL**: `https://medpull.org.s3.[region].amazonaws.com/index.html`
   - If this works → S3 is fine, CloudFront needs fixing
   - If this doesn't work → S3 bucket/permissions issue

### Step 7: Verify Complete Setup

Your setup should look like:

```
User → medpull.org (DNS)
  ↓
Route 53 A record (Alias)
  ↓
CloudFront Distribution (d123...cloudfront.net)
  - Alternate domain: medpull.org
  - SSL cert: from us-east-1
  - Origin: S3 bucket (your region)
  ↓
S3 Bucket (medpull.org)
  - index.html at root
  - assets/ folder structure
  - Public read access (or OAC)
```

## Quick Fix Commands

**Check DNS:**
```powershell
nslookup medpull.org
```

**Check if CloudFront is accessible:**
```powershell
# Replace with your actual CloudFront domain
curl https://d1234567890abc.cloudfront.net
```

## Next Steps After Debugging

Once you identify which step is failing, we can fix it specifically.


