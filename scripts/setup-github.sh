#!/bin/bash

# Script to create GitHub repository and push code
# Usage: ./scripts/setup-github.sh [repo-name] [github-token]

set -e

REPO_NAME="${1:-spacex-model}"
GITHUB_TOKEN="${2:-$GITHUB_TOKEN}"
GIT_USERNAME=$(git config --global user.name | tr ' ' '-' | tr '[:upper:]' '[:lower:]' || echo "user")
GIT_EMAIL=$(git config --global user.email)

echo "🚀 Setting up GitHub repository: $REPO_NAME"

# Check if already has remote
if git remote get-url origin 2>/dev/null; then
    echo "✓ Remote already configured"
    git push -u origin main
    exit 0
fi

# Try to get username from email or git config
if [ -z "$GITHUB_USERNAME" ]; then
    # Try to extract username from email
    GITHUB_USERNAME=$(echo "$GIT_EMAIL" | cut -d'@' -f1 | tr '[:upper:]' '[:lower:]')
fi

# If token provided, create repo via API
if [ -n "$GITHUB_TOKEN" ]; then
    echo "Creating repository via GitHub API..."
    RESPONSE=$(curl -s -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        https://api.github.com/user/repos \
        -d "{\"name\":\"$REPO_NAME\",\"private\":false,\"auto_init\":false}" 2>&1)
    
    if echo "$RESPONSE" | grep -q '"id"'; then
        echo "✓ Repository created successfully"
        REPO_URL="https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
    elif echo "$RESPONSE" | grep -q "name already exists"; then
        echo "⚠ Repository already exists, using existing repo"
        REPO_URL="https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
    else
        echo "❌ Failed to create repository: $RESPONSE"
        echo "Falling back to manual setup..."
        exit 1
    fi
else
    # Try using gh CLI
    if command -v gh &> /dev/null && gh auth status &> /dev/null; then
        echo "Using GitHub CLI to create repository..."
        gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
        exit 0
    else
        echo "❌ No GitHub token provided and gh CLI not authenticated"
        echo ""
        echo "Please provide a GitHub personal access token:"
        echo "1. Go to https://github.com/settings/tokens"
        echo "2. Generate a new token with 'repo' scope"
        echo "3. Run: GITHUB_TOKEN=your_token ./scripts/setup-github.sh"
        echo ""
        echo "Or authenticate gh CLI:"
        echo "gh auth login"
        exit 1
    fi
fi

# Add remote and push
echo "Adding remote: $REPO_URL"
git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"

echo "Pushing to GitHub..."
git branch -M main
git push -u origin main

echo "✅ Successfully pushed to GitHub!"
echo "Repository: https://github.com/$GITHUB_USERNAME/$REPO_NAME"





