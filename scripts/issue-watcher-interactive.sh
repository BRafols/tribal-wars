#!/bin/bash

# Interactive Issue Watcher - Prompts before developing each issue
# Usage: ./scripts/issue-watcher-interactive.sh [poll_interval_seconds]

set -e

POLL_INTERVAL=${1:-30}
PROCESSED_FILE=".claude/processed-issues.txt"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPO_ROOT"

mkdir -p .claude
touch "$PROCESSED_FILE"

echo "🤖 Interactive Issue Watcher started"
echo "   Polling interval: ${POLL_INTERVAL}s"
echo ""
echo "Press Ctrl+C to stop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

while true; do
    # Get open issues as JSON
    ISSUES=$(gh issue list --state open --json number,title --limit 10 2>/dev/null || echo "[]")

    if [ "$ISSUES" = "[]" ] || [ -z "$ISSUES" ]; then
        sleep "$POLL_INTERVAL"
        continue
    fi

    # Get issue numbers into an array (avoid subshell issue with pipes)
    mapfile -t ISSUE_NUMBERS < <(echo "$ISSUES" | jq -r '.[].number')
    mapfile -t ISSUE_TITLES < <(echo "$ISSUES" | jq -r '.[].title')

    for i in "${!ISSUE_NUMBERS[@]}"; do
        number="${ISSUE_NUMBERS[$i]}"
        title="${ISSUE_TITLES[$i]}"

        # Skip if already processed
        if grep -q "^${number}$" "$PROCESSED_FILE" 2>/dev/null; then
            continue
        fi

        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📋 New issue: #$number - $title"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

        # Show issue details (suppress deprecation warning)
        gh issue view "$number" 2>&1 | grep -v "GraphQL.*Projects" || true

        echo ""
        # Read from /dev/tty to get actual terminal input
        read -p "Develop this issue? [Y/n/s(kip permanently)] " -n 1 -r </dev/tty
        echo ""

        case $REPLY in
            [Nn])
                echo "⏭️  Skipped (will ask again next poll)"
                ;;
            [Ss])
                echo "$number" >> "$PROCESSED_FILE"
                echo "⏭️  Skipped permanently"
                ;;
            *)
                echo ""
                echo "🚀 Starting Claude to develop issue #$number..."
                echo "   (Claude will run interactively - you can guide it)"
                echo ""

                # Run Claude with the develop-issue prompt
                # Interactive mode - stdin/stdout connected to terminal
                claude -p "Develop GitHub issue #$number. Complete the FULL workflow without stopping:

1. Fetch issue: gh issue view $number --json title,body
2. Create branch: git checkout master && git pull && git checkout -b feature/$number-<short-desc>
3. Implement the changes following CLAUDE.md conventions
4. Commit: git add <files> && git commit (NO Co-Authored-By lines)
5. Push: git push -u origin <branch>
6. Create PR: gh pr create --title \"...\" --body \"...Closes #$number...\"

IMPORTANT: Complete ALL steps including commit, push, and PR creation. Do not stop to ask for permission - you have all necessary permissions. Follow CLAUDE.md rules (no Anthropic attribution)." </dev/tty

                echo ""
                # Ask if completed successfully AFTER Claude exits
                read -p "Did Claude complete successfully? Mark as done? [Y/n] " -n 1 -r </dev/tty
                echo ""
                if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                    echo "$number" >> "$PROCESSED_FILE"
                    echo "✅ Issue #$number marked as processed"
                else
                    echo "⚠️  Issue #$number NOT marked - will appear again next poll"
                fi
                ;;
        esac
    done

    sleep "$POLL_INTERVAL"
done
