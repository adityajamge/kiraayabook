#!/bin/bash
set -e

# ============================================
# Push to BOTH GitHub accounts
# ============================================
# origin     → adityajamge/kiraayabook  (Personal graph) — uses adityajamgelatur@gmail.com
# production → adijam-dev/kiraayabook   (Vercel) — uses adijam.dev@gmail.com
# ============================================
#
# WORKFLOW:
#   git push origin main   → adityajamge (Personal), adityajamgelatur@gmail.com
#   bash pushall.sh        → adijam-dev  (Vercel),   adijam.dev@gmail.com
# ============================================

BRANCH=$(git branch --show-current)

if [ -z "$BRANCH" ]; then
    echo "❌ Not on any branch. Aborting."
    exit 1
fi

echo ""
echo "📦 Branch: $BRANCH"
echo "============================================"

# ── Push to production repo (adijam-dev) with rewritten author ──
echo ""
echo "🔄 Preparing push for adijam-dev/kiraayabook..."

# Stash any uncommitted changes so filter-branch can work
STASHED=false
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "📋 Stashing uncommitted changes..."
    git stash push -m "pushall-temp-stash"
    STASHED=true
fi

# Clean up any leftover temp branch
git branch -D _temp_production 2>/dev/null || true

# Create temp branch from current position
git checkout -b _temp_production

# Rewrite ALL commits on this branch to use production email
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --env-filter '
GIT_AUTHOR_NAME="Aditya Jamge"
GIT_AUTHOR_EMAIL="adijam.dev@gmail.com"
GIT_COMMITTER_NAME="Aditya Jamge"
GIT_COMMITTER_EMAIL="adijam.dev@gmail.com"
' HEAD

# Force push to production remote (force needed because commit hashes differ)
echo "🚀 Pushing to adijam-dev/kiraayabook (Vercel/Production)..."
git push production "_temp_production:$BRANCH" --force

# ── Cleanup ──
git checkout "$BRANCH"
git branch -D _temp_production
# Clean filter-branch backup refs
git for-each-ref --format='delete %(refname)' refs/original/ | git update-ref --stdin 2>/dev/null || true

# Restore stashed changes if any
if [ "$STASHED" = true ]; then
    echo "📋 Restoring stashed changes..."
    git stash pop
fi

echo ""
echo "============================================"
echo "✅ Done! Pushed to adijam-dev/kiraayabook (Vercel/Production)"
echo "============================================"
