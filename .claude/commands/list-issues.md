# List GitHub Issues

Show available GitHub issues that can be worked on.

## Arguments
- `$ARGUMENTS` - Optional filters (e.g., "bug", "enhancement", "@me")

## Workflow

1. Run: `gh issue list --state open --json number,title,labels,assignees --limit 20`
2. Format the output showing:
   - Issue number
   - Title
   - Labels (if any)
   - Assignee (if any)
3. Suggest: "Use `/develop-issue <number>` to start working on one"

## Filters
If arguments provided:
- `bug` → `gh issue list --label bug`
- `enhancement` → `gh issue list --label enhancement`
- `@me` → `gh issue list --assignee @me`

## Example Usage
```
/list-issues
/list-issues bug
/list-issues @me
```
