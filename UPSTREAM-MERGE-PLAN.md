# Implementation Plan: Upstream Merge Recommendations

## Summary

Merge selected commits from upstream https://github.com/thomasjsn/hugo-theme-hello-friend into this fork. The upstream repository has 33 commits ahead of our fork point (commit `f7d48e5` from Jan 24, 2022).

This plan focuses on the **recommended high-value commits** that enhance UX without requiring major refactoring.

## Fork Context

- **Fork point:** commit `f7d48e5` (Jan 24, 2022 - "update anchor styling")
- **Upstream ahead:** 33 commits
- **Fork-specific features:** Gallery functionality, Docker build, CI/CD, EXIF processing
- **Status:** Upstream has useful UX improvements; fork has unique gallery features to preserve

## Recommended Commits to Merge

### 1. OS Theme Preference Support ⭐ HIGH PRIORITY
**Commit:** `e99e832` (Jun 4, 2022)
**Author:** panr
**Benefit:** Theme respects system OS dark/light mode preference

**What it does:**
- Checks `window.matchMedia('(prefers-color-scheme: dark)')` before defaulting to dark theme
- Improves UX by honoring user's system-wide preference
- Falls back to explicit theme selection if user has set a preference

**Files affected:**
- `assets/js/theme.js` - Theme detection logic
- `layouts/_default/baseof.html` - Template integration
- CSS variables for theme switching

**Conflict risk:** MEDIUM - You may have modifications to `theme.js` and `baseof.html` from gallery work

---

### 2. Inline Code Font Size Fix ⭐ HIGH PRIORITY
**Commit:** `0840d5a` (Jan 7, 2023)
**Author:** Marius Bergmann
**Benefit:** Typography improvement - inline code scales with surrounding text

**What it does:**
- Changes inline code `font-size` from `rem` (absolute) to `em` (relative)
- Allows `<code>` in headings to scale proportionally
- Single character CSS change

**Files affected:**
- CSS typography rules (1 line change)

**Conflict risk:** LOW - Isolated CSS change

---

### 3. npm Dependency Updates (OPTIONAL)
**Security and maintenance updates:**
- `terser`: 5.9.0 → 5.14.2 (JavaScript minifier)
- `nanoid`: 3.1.30 → 3.3.2 (ID generator)
- `minimist`: 1.2.5 → 1.2.6 (CLI argument parser)

**Files affected:**
- `package.json`

**Conflict risk:** LOW - Dependency updates only

---

## Commits to SKIP

### Hugo Modules Support (commit `54a137a`)
**Why skip:** BREAKING CHANGE - Complete architecture restructure
- Migrates all CSS → SCSS
- Changes build pipeline fundamentally
- Adds Hugo Module installation method
- Removes static fonts, uses webpack for everything

**Recommendation:** Your Docker/Webpack build is already solid. This migration would require extensive refactoring of your gallery features with minimal benefit.

## Implementation Steps

### Phase 1: Prepare for Merge
1. Ensure working tree is clean and all changes committed
2. Add upstream remote if not already added:
   ```bash
   git remote add upstream https://github.com/thomasjsn/hugo-theme-hello-friend.git
   git fetch upstream
   ```
3. Create a new branch for the merge:
   ```bash
   git checkout -b merge-upstream-improvements
   ```

### Phase 2: Cherry-Pick OS Theme Preference (e99e832)
1. Cherry-pick the commit:
   ```bash
   git cherry-pick e99e832
   ```
2. **If conflicts occur** (likely in `assets/js/theme.js` and `layouts/_default/baseof.html`):
   - Review conflicts carefully - preserve gallery-specific modifications
   - The key change is adding OS preference detection before theme initialization
   - Look for `window.matchMedia('(prefers-color-scheme: dark)')` logic
3. Test the theme switching:
   - Run `make build` and `make preview`
   - Test with system in dark mode - verify theme matches
   - Test with system in light mode - verify theme matches
   - Test manual theme toggle still works
4. Commit resolved conflicts if any

### Phase 3: Cherry-Pick Inline Code Fix (0840d5a)
1. Cherry-pick the commit:
   ```bash
   git cherry-pick 0840d5a
   ```
2. **Conflict resolution:** Unlikely, but if CSS conflicts occur:
   - The change should be: `font-size: 0.92em` instead of `font-size: 0.92rem`
   - Find inline code styling rules and ensure they use `em` units
3. Verify typography:
   - View a page with inline code in headings
   - Confirm code scales with heading size

### Phase 4: Update Dependencies (Optional)
1. Edit `package.json`:
   ```json
   {
     "devDependencies": {
       "terser": "^5.14.2",
       "nanoid": "^3.3.2",
       "minimist": "^1.2.6"
     }
   }
   ```
2. Run `yarn install` or `npm install`
3. Rebuild and test:
   ```bash
   make clean
   make build
   make preview
   ```

### Phase 5: Comprehensive Testing
1. **Build verification:**
   ```bash
   make clean
   make build
   ```
   - Verify no webpack errors
   - Check `static/assets/` contains all files

2. **Gallery functionality:**
   - Navigate to `/gallery/nature/`
   - Verify cover images load correctly
   - Click photos to open slideshow
   - Test slideshow controls (autoplay, thumbnails, next/prev)
   - Verify theme switching doesn't break gallery

3. **Run automated tests:**
   ```bash
   make test
   ```
   - All existing tests should pass

4. **Visual testing:**
   - Check theme respects OS preference
   - Verify inline code in headings scales properly
   - Test dark/light mode toggle

### Phase 6: Commit and Merge
1. If all tests pass, commit any final changes:
   ```bash
   git add .
   git commit -m "Merge upstream improvements: OS theme preference and inline code fix"
   ```
2. Merge to master:
   ```bash
   git checkout master
   git merge merge-upstream-improvements
   ```
3. Clean up branch:
   ```bash
   git branch -d merge-upstream-improvements
   ```

## Critical Files to Monitor

During merge, pay special attention to these files for conflicts:

- `assets/js/theme.js` - Theme switching logic (OS preference detection)
- `layouts/_default/baseof.html` - Template integration
- CSS files with inline code styling (typography)
- `package.json` - Dependency versions
- Any gallery-specific JavaScript in `assets/js/`

## Rollback Plan

If something breaks after merge:

```bash
# Rollback to previous state
git reset --hard HEAD~1

# Or if already pushed
git revert <commit-hash>
```

## Expected Outcome

After successful merge:
- ✅ Theme respects system OS dark/light mode preference
- ✅ Inline code in headings scales properly with surrounding text
- ✅ npm dependencies updated to latest secure versions
- ✅ All gallery functionality remains intact
- ✅ All tests pass
- ✅ No regressions in existing features

## Notes

- The upstream Hugo Modules migration (`54a137a`) is intentionally skipped as it would require major refactoring
- Your fork's unique gallery features are preserved
- These changes enhance UX without breaking existing functionality
