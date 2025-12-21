# Bug Fixes and Enhancements

## Branch: feature/bug-fixes-and-enhancements

---

## Bugs to Fix

### 1. Collection Sync Issue
**Problem**: Collection not removing records that were removed from Discogs
**Priority**: High
**Status**: ✅ FIXED (commit: ae7054c)
**Solution**: Refactored deletion logic to use temporary table approach instead of NOT IN with parameter lists. This avoids PostgreSQL parameter limits and ensures proper deletion of records no longer in Discogs collection.

### 2. Browser Back Button Navigation
**Problem**: Clicking back arrow in browser takes user to Discogs auth, not previous view in app
**Priority**: Low
**Status**: 📋 BACKLOG (attempted fixes in commits: 78abe6f, cc828dc)
**Notes**: This is a known OAuth limitation. Attempts to fix with history manipulation and popstate listeners have been made. Moving to backlog to focus on feature enhancements. May require deeper architectural changes to OAuth flow.

### 3. User Dropdown Click-Outside Behavior
**Problem**: Clicking outside of user dropdown active should close dropdown
**Priority**: Low
**Status**: ✅ FIXED (commit: d538193)
**Solution**: Added useRef hook and click-outside detection with mousedown event listener. Dropdown now properly closes when clicking anywhere outside of it.

---

## Enhancements

### Now Spinning Feature Improvements

#### 1. End Session Button
**Feature**: Add 'End Session' button next to minimize, closes the stack session
**Priority**: Medium
**Status**: ✅ IMPLEMENTED (commit: 53c6431)
**Details**: Added red-hover "End Session" button in Now Spinning header next to Minimize button.

#### 2. Dynamic Background Gradient
**Feature**: Generate dynamic background gradient from album art
**Priority**: Medium
**Status**: ✅ IMPLEMENTED (commit: 7c4846f)
**Details**: Created color extraction utility that samples album art to generate dynamic gradients. Background smoothly transitions (700ms) between albums with darkened colors for readability.

#### 3. Stack List Item Behavior
**Feature**: Stack list items should have same behavior as collections (add detail view and like button)
**Priority**: Medium
**Status**: ✅ IMPLEMENTED (commit: dbc05b7)
**Details**: Stack items now show Like and Info buttons on hover. Clicking Info opens the album detail modal. Full feature parity with collection view.

#### 4. Session Conflict Prompt
**Feature**: If stack is minimized and another stack is cued, prompt "stop current session? Stop session | keep spinning"
**Priority**: Medium
**Status**: ✅ IMPLEMENTED (commit: ae1f75f)
**Details**: When starting a new stack while one is minimized, a modal prompts user to either "Stop Session" (red) or "Keep Spinning" (gray), preventing accidental session termination.

---

## Implementation Order

1. **Bug Fixes First** (in order of priority):
   - Collection sync issue
   - Browser back button navigation
   - User dropdown click-outside behavior

2. **Enhancements** (grouped by feature area):
   - Now Spinning improvements (all 4 enhancements)

---

## Notes

- Each bug/enhancement should be implemented in separate commits when possible
- Test thoroughly with both local and Docker environments
- Update documentation as needed
