#!/usr/bin/env bash
# Sets up branch protection rules for EddaCraft/kindling.
# Requires: gh CLI authenticated with admin access.
#
# Usage: bash .github/setup-branch-protection.sh

set -euo pipefail

REPO="EddaCraft/kindling"

echo "Setting default branch to dev..."
gh repo edit "$REPO" --default-branch dev

echo "Protecting dev branch..."
gh api -X PUT "repos/$REPO/branches/dev/protection" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["check"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1
  },
  "restrictions": null
}
EOF

echo "Protecting main branch..."
gh api -X PUT "repos/$REPO/branches/main/protection" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["check"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1
  },
  "restrictions": null
}
EOF

echo "Done. Branch protections applied."
echo "  dev  — requires CI + 1 approval, default branch"
echo "  main — requires CI + 1 approval, enforced for admins"
