#!/bin/bash

# Issue Watcher - Automatically develops new GitHub issues with Claude Code
# Usage: ./scripts/issue-watcher.sh [poll_interval_seconds]

set -e

POLL_INTERVAL=${1:-30}  # Default: check every 30 seconds
PROCESSED_FILE=".claude/processed-issues.txt"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPO_ROOT"

# Ensure processed file exists
mkdir -p .claude
touch "$PROCESSED_FILE"

echo "🤖 Issue Watcher started"
echo "   Polling interval: ${POLL_INTERVAL}s"
echo "   Processed issues file: $PROCESSED_FILE"
echo ""
echo "Create issues in another terminal with:"
echo "   gh issue create --title \"...\" --body \"...\""
echo ""
echo "Press Ctrl+C to stop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

while true; do
    # Get open issues assigned to no one (or you can filter differently)
    ISSUES=$(gh issue list --state open --json number,title,labels,assignees --limit 10 2>/dev/null || echo "[]")

    if [ "$ISSUES" = "[]" ] || [ -z "$ISSUES" ]; then
        sleep "$POLL_INTERVAL"
        continue
    fi

    # Parse issues and find unprocessed ones
    echo "$ISSUES" | jq -r '.[] | "\(.number)|\(.title)"' | while IFS='|' read -r number title; do
        # Skip if already processed
        if grep -q "^${number}$" "$PROCESSED_FILE" 2>/dev/null; then
            continue
        fi

        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📋 New issue found: #$number - $title"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""

        # Mark as processed BEFORE starting (to avoid double-processing)
        echo "$number" >> "$PROCESSED_FILE"

        # Run Claude to develop the issue
        echo "🚀 Starting Claude to develop issue #$number..."
        echo ""

        # Run claude with the develop-issue command
        # Using --yes to auto-accept, --dangerously-skip-permissions for automation
        claude --yes --dangerously-skip-permissions -p "Develop GitHub issue #$number. Follow the /develop-issue workflow: fetch issue details, create feature branch, implement the changes, and create a PR. Be thorough and follow the project conventions in CLAUDE.md."

        echo ""
        echo "✅ Finished processing issue #$number"
        echo ""
    done

    sleep "$POLL_INTERVAL"
done
