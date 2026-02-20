#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Pulling latest..."
git pull --ff-only

echo "Syncing from Google Sheet..."
npm run sync --silent

if git diff --quiet data/books.json; then
  echo "No changes."
  exit 0
fi

echo "Changes detected, committing..."
git add data/books.json
git commit -m "Update books from Google Sheet"
git push

echo "Done."
