data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "github_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:mostafabdelaal/ecommerce-devops-platform:*"]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "github-actions-ecr-role"
  assume_role_policy = data.aws_iam_policy_document.github_assume_role.json
}

resource "aws_iam_role_policy_attachment" "github_actions_ecr" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

data "aws_iam_policy_document" "github_actions_frontend" {
  statement {
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:ListBucket",
      "s3:DeleteObject"
    ]
    resources = [
      "arn:aws:s3:::cloudmart-frontend-${local.account_id}",
      "arn:aws:s3:::cloudmart-frontend-${local.account_id}/*"
    ]
  }

  statement {
    actions = [
      "cloudfront:CreateInvalidation",
      "cloudfront:ListDistributions"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "github_actions_frontend" {
  name   = "github-actions-frontend-policy"
  role   = aws_iam_role.github_actions.name
  policy = data.aws_iam_policy_document.github_actions_frontend.json
}

output "github_actions_role_arn" {
  value = aws_iam_role.github_actions.arn
}
