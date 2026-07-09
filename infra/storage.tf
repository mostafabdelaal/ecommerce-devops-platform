# S3 bucket serving the static frontend as a website.
# Bucket names are globally unique, so the account id is appended.

locals {
  bucket_name  = "${var.project}-frontend-${data.aws_caller_identity.current.account_id}"
  frontend_dir = "${path.module}/../Frontend"
}

resource "aws_s3_bucket" "frontend" {
  bucket = local.bucket_name
  tags   = { Name = "${var.project}-frontend" }
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }
}

# Allow public read (required for static website hosting).
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
    }]
  })

  # The policy needs the public access block relaxed first.
  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

# Upload the frontend files. CloudMart.dc.html becomes the site index.
resource "aws_s3_object" "index" {
  bucket       = aws_s3_bucket.frontend.id
  key          = "index.html"
  source       = "${local.frontend_dir}/CloudMart.dc.html"
  etag         = filemd5("${local.frontend_dir}/CloudMart.dc.html")
  content_type = "text/html"
}

resource "aws_s3_object" "support" {
  bucket       = aws_s3_bucket.frontend.id
  key          = "support.js"
  source       = "${local.frontend_dir}/support.js"
  etag         = filemd5("${local.frontend_dir}/support.js")
  content_type = "application/javascript"
}
