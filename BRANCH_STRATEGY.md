# Branch Strategy

## Branch Overview

### `tauri-build` (Development Branch)
**Purpose:** Active development with full documentation for AI context

**Contains:**
- ✅ All source code
- ✅ All documentation (40+ MD files)
- ✅ Test files
- ✅ Backup files
- ✅ Development scripts
- ✅ AI context files

**Use For:**
- Daily development
- AI pair programming
- Documentation updates
- Feature development
- Bug fixes

**Keep This Branch Active For:**
- Working with AI assistants (full context)
- Team onboarding
- Architecture discussions
- Feature planning

---

### `tauri-release` (Production Branch)
**Purpose:** Clean production-ready source code only

**Contains:**
- ✅ Source code only
- ✅ Minimal README
- ✅ Production dependencies
- ❌ No documentation
- ❌ No test files
- ❌ No backup files
- ❌ No development scripts

**Use For:**
- Production builds
- Customer deployments
- Release packages
- Clean codebase distribution

---

## Workflow

### Daily Development
```bash
# Work on tauri-build (with docs)
git checkout tauri-build

# Make changes, commit
git add .
git commit -m "feat: Add new feature"
git push origin tauri-build
```

### Creating a Release
```bash
# Switch to release branch
git checkout tauri-release

# Merge code changes (without docs)
git merge tauri-build --no-commit

# Remove any new docs that got merged
git rm *.md
git checkout HEAD -- README.md

# Commit and push
git commit -m "chore: Sync production code"
git push origin tauri-release

# Build release
cd frontend
npm run tauri build
```

### Syncing Release Branch
When you want to sync production code from tauri-build to tauri-release:

```bash
# On tauri-build, note the commit hash
git log -1

# Switch to tauri-release
git checkout tauri-release

# Cherry-pick only code changes (manual process)
# Or merge and clean up docs:
git merge tauri-build --no-commit
git rm *.md 2>/dev/null || true
git rm backend/*.md 2>/dev/null || true
git rm backend/*.backup 2>/dev/null || true
git rm backend/test_*.py 2>/dev/null || true
git checkout HEAD -- README.md
git commit -m "chore: Sync from tauri-build"
git push origin tauri-release

# Switch back to development
git checkout tauri-build
```

---

## File Comparison

### Files in `tauri-build` ONLY:
```
Documentation (40+ files):
- DEVELOPER_ONBOARDING.md
- PRODUCT_FEATURES_GUIDE.md
- TOOL_DEVELOPMENT_GUIDE.md
- PAYMENT_LICENSING_GUIDE.md
- SUBSCRIPTION_PLATFORM_DESIGN.md
- IMPLEMENTATION_CHECKLIST.md
- All session summaries
- All feature documentation
- All guides and tutorials

Development Files:
- backend/test_db.py
- backend/temp_license_activator.py
- backend/*.backup
- backend_test.py
- trello_*.py
- start-license-api.sh
- repo_context.md
```

### Files in BOTH branches:
```
Source Code:
- frontend/src/**/*.js
- frontend/src/**/*.css
- backend/**/*.py (production files)
- frontend/public/**/*
- Configuration files
- package.json
- requirements.txt
```

---

## Best Practices

### ✅ DO:
- Always work on `tauri-build` for development
- Keep all documentation in `tauri-build`
- Use `tauri-release` only for production builds
- Sync `tauri-release` before major releases
- Test builds from `tauri-release` branch

### ❌ DON'T:
- Don't develop directly on `tauri-release`
- Don't add documentation to `tauri-release`
- Don't merge `tauri-release` back to `tauri-build`
- Don't delete `tauri-build` branch

---

## Quick Commands

### Check current branch:
```bash
git branch --show-current
```

### See branch differences:
```bash
git diff tauri-build tauri-release --stat
```

### List all branches:
```bash
git branch -a
```

### Switch branches:
```bash
git checkout tauri-build    # Development with docs
git checkout tauri-release  # Production code only
```

---

## Summary

| Aspect | tauri-build | tauri-release |
|--------|-------------|---------------|
| **Purpose** | Development + AI Context | Production Code |
| **Documentation** | ✅ Full (40+ files) | ❌ Minimal README |
| **Test Files** | ✅ Included | ❌ Removed |
| **Backup Files** | ✅ Kept | ❌ Removed |
| **Use With AI** | ✅ Yes (full context) | ❌ No |
| **For Builds** | ⚠️ Works but messy | ✅ Clean builds |
| **For Customers** | ❌ Too much info | ✅ Professional |
| **Active Work** | ✅ Daily development | ❌ Release only |

---

**Current Branch:** `tauri-build` (You should stay here for development)

**Last Sync:** Created on Nov 9, 2025
