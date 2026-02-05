# Create Pull Request

Create a pull request from current branch changes.

## Arguments
- `$ARGUMENTS` - Optional: Related issue number to link

## Workflow

### Step 1: Verify State
1. Check current branch is not master: `git branch --show-current`
2. If on master, abort with error message

### Step 2: Handle Uncommitted Changes
1. Run `git status` to check for uncommitted changes
2. If changes exist, commit them with appropriate message

### Step 3: Analyze Changes
1. Get commits on branch: `git log master..HEAD --oneline`
2. Summarize what this PR accomplishes

### Step 4: Push and Create PR
1. Push branch: `git push -u origin $(git branch --show-current)`
2. Create PR:
   ```
   gh pr create --title "<generated-title>" --body "## Summary
   <description from commits>

   [Closes #<issue> if provided]

   ## Changes
   <bullet points from commits>

   ## Test Plan
   - [ ] Manual testing completed
   - [ ] Build passes"
   ```

### Step 5: Report
Return the PR URL

## Example Usage
```
/create-pr
/create-pr 42
```
