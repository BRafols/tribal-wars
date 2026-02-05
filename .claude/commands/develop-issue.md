# Develop GitHub Issue

Automatically develop a GitHub issue into a working implementation with a pull request.

## Arguments
- `$ARGUMENTS` - GitHub issue number (e.g., "42" or "#42")

## Workflow

### Step 1: Fetch Issue Details
1. Parse the issue number from arguments (strip # if present)
2. Run: `gh issue view <number> --json number,title,body,labels`
3. Understand the requirements from the issue body

### Step 2: Create Feature Branch
1. Ensure on master and up to date: `git checkout master && git pull origin master`
2. Create branch: `git checkout -b feature/<issue-number>-<short-description>`
   - Extract short description from issue title (lowercase, hyphens, max 40 chars)

### Step 3: Plan Implementation
1. Analyze the codebase to understand:
   - Affected components (extension/ or api/ or both)
   - Existing patterns to follow
   - Files that need modification
2. Create a mental task list

### Step 4: Implement Changes
1. Work through each task systematically
2. Follow project conventions from CLAUDE.md
3. Run linting as you go: `npm run lint` in extension/
4. Make atomic commits with conventional commit messages

### Step 5: Create Pull Request
1. Push the branch: `git push -u origin <branch-name>`
2. Create PR:
   ```
   gh pr create --title "<title>" --body "## Summary
   <description>

   Closes #<issue-number>

   ## Changes
   - <bullet points>

   ## Test Plan
   - [ ] Manual testing completed
   - [ ] No console errors"
   ```
3. Return the PR URL to the user

## Example Usage
```
/develop-issue 42
/develop-issue #42
```

## Notes
- Always ask for confirmation before creating the PR
- If implementation is unclear, ask clarifying questions first
