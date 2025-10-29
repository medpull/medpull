# Deploy medpullwebsite to AWS (S3 + CloudFront + Route 53)

This repo includes a GitHub Actions workflow that deploys the `medpullwebsite/` folder to an S3 bucket and invalidates a CloudFront distribution.

Prereqs (one-time in AWS)
- S3: Create a bucket for the site (e.g., `www.yourdomain.com`). Keep it private if using CloudFront with OAC, or enable static hosting + public read for a quick start.
- CloudFront: Create a distribution pointing to the S3 origin. Set default root object `index.html`. Add custom domain (ALT name) and TLS cert via ACM (in us-east-1). Add error responses mapping 403/404 -> 200 `index.html` for SPA-style routing.
- Route 53: Create A/AAAA alias records for your domain (and/or `www`) to the CloudFront distribution.
- IAM (recommended): Create an IAM role for GitHub OIDC with least-privilege S3/CloudFront permissions; note its ARN.

GitHub repository secrets
- AWS_REGION: e.g., us-east-1
- AWS_ROLE_TO_ASSUME: IAM role ARN for GitHub OIDC (recommended)
- S3_BUCKET: your site bucket name (e.g., `www.yourdomain.com`)
- CLOUDFRONT_DISTRIBUTION_ID: the distribution ID to invalidate

Workflow
- On push to `medpullwebsite/**`, the workflow syncs files to S3, sets long cache for assets, no-cache for HTML, and invalidates CloudFront.

Deploy
- Commit changes in `medpullwebsite/` and push to main. Monitor the Actions tab.

Notes
- If not using OIDC, you can switch the workflow to use `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` secrets in `configure-aws-credentials`.
- For troubleshooting, check CloudFront logs and S3 object metadata (Cache-Control, Content-Type).