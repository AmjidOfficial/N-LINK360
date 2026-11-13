#!/usr/bin/env bash
# Push to GitHub repository AmjidOfficial/N-LINK360 using PAT
set -e

TOKEN="$1"

if [ -z "$TOKEN" ]; then
  echo "Usage: ./scripts/push-to-github.sh <GITHUB_PERSONAL_ACCESS_TOKEN>"
  exit 1
fi

echo "Configuring authenticated git remote..."
git remote set-url origin "https://x-access-token:${TOKEN}@github.com/AmjidOfficial/N-LINK360.git"

echo "Pushing main branch to AmjidOfficial/N-LINK360..."
git push -u origin main --force

echo "Scrubbing token from git config..."
git remote set-url origin "https://github.com/AmjidOfficial/N-LINK360.git"

echo "✓ Code successfully pushed to https://github.com/AmjidOfficial/N-LINK360 (branch: main)"
