#!/bin/bash
set -e

# ============================================
# Push to BOTH GitHub accounts
# ============================================
# origin   → adijam-dev/kiraayabook   (Vercel) — uses adijam.dev@gmail.com
# personal → adityajamge/kiraayabook  (Green graph) — uses adityajamgelatur@gmail.com
# ============================================
#
# WORKFLOW:
#   git push origin main   → adijam-dev (Vercel), adijam.dev@gmail.com
#   bash pushall.sh        → adityajamge (Personal), adityajamgelatur@gmail.com
# ============================================

BRANCH=$(git branch --show-current)

if [ -z "$BRANCH" ]; then
    echo "❌ Not on any branch. Aborting."
    exit 1
fi

echo ""
echo "📦 Branch: $BRANCH"
echo "============================================"

# ── Push to personal repo (adityajamge) with rewritten author ──
echo ""
echo "🔄 Preparing push for adityajamge/kiraayabook..."

# Stash any uncommitted changes so filter-branch can work
STASHED=false
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "📋 Stashing uncommitted changes..."
    git stash push -m "pushall-temp-stash"
    STASHED=true
fi

# Clean up any leftover temp branch
git branch -D _temp_personal 2>/dev/null || true

# Create temp branch from current position
git checkout -b _temp_personal

# Rewrite ALL commits on this branch to use personal email
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --env-filter '
GIT_AUTHOR_NAME="Aditya Jamge"
GIT_AUTHOR_EMAIL="adityajamgelatur@gmail.com"
GIT_COMMITTER_NAME="Aditya Jamge"
GIT_COMMITTER_EMAIL="adityajamgelatur@gmail.com"
' HEAD

# Force push to personal remote (force needed because commit hashes differ)
echo "🚀 Pushing to adityajamge/kiraayabook (Personal)..."
git push personal "_temp_personal:$BRANCH" --force

# ── Cleanup ──
git checkout "$BRANCH"
git branch -D _temp_personal
# Clean filter-branch backup refs
git for-each-ref --format='delete %(refname)' refs/original/ | git update-ref --stdin 2>/dev/null || true

# Restore stashed changes if any
if [ "$STASHED" = true ]; then
    echo "📋 Restoring stashed changes..."
    git stash pop
fi

echo ""
echo "============================================"
echo "✅ Done! Pushed to adityajamge/kiraayabook (Personal)"
echo "============================================"
