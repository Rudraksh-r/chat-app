# Chat App -- Feature Expansion Execution Plan

## Context

Your project currently includes authentication, real-time messaging,
presence, typing indicators, read receipts and media sharing. These
additions naturally belong after the Advanced Features phase of your
roadmap.

## Recommended Implementation Order

### Milestone 1 -- Profile System Upgrade

**Goal:** Extend the user profile into a complete identity page.

#### Database

Add optional fields to the User model: - about - socialLinks - github -
linkedin - twitter/x - instagram - website

#### Backend APIs

-   GET /users/:id/profile
-   PATCH /users/profile
-   Validate URLs
-   Limit "about" length (150--300 chars)

#### Frontend

Profile page: - Avatar - Full name - Username - Email - About - Social
links - Change password - Logout

#### About Suggestions

Examples: - Building awesome web applications. - Coffee, code and
creativity. - Always learning something new. - Full‑stack developer in
progress. - Open to collaboration.

------------------------------------------------------------------------

### Milestone 2 -- User Profile Preview

Clicking another user's avatar should open a modal.

Contents: - Avatar - Name - Username - About - Social links

Buttons: - Open Chat - Info

The Info button opens the full read-only profile.

------------------------------------------------------------------------

### Milestone 3 -- Block User

Database: - blockedUsers\[\] - blockedBy\[\]

Rules: - Blocked users cannot send messages. - Hide typing indicators. -
Hide online status. - Prevent starting new conversations. - Existing
history remains visible. - Allow unblock.

------------------------------------------------------------------------

### Milestone 4 -- Chat Theme System (Client Side)

Keep themes completely client-side.

Store per-chat preferences:

``` ts
chatTheme = {
  chatId,
  wallpaper,
  bubbleColor,
  accentColor,
  backgroundColor
}
```

Suggested storage: - IndexedDB (best for web) - localStorage (acceptable
for small apps)

Lookup flow: 1. Open chat. 2. Read theme by chatId. 3. Apply CSS
variables. 4. Render.

No backend API required.

Suggested themes: - Default - Dark - Forest - Ocean - Purple - Sunset -
AMOLED

------------------------------------------------------------------------

## Suggested Folder Structure

``` text
src/
 ├── features/
 │    ├── profile/
 │    ├── block-user/
 │    └── chat-theme/
 ├── hooks/
 ├── stores/
 ├── services/
 ├── components/
 │     ├── ProfileModal
 │     ├── UserInfoModal
 │     └── ThemePicker
```

## Zustand Stores

-   useProfileStore
-   useBlockStore
-   useThemeStore

Persist only theme store.

## Execution Order

1.  Fix Change Password.
2.  Extend User schema.
3.  Profile APIs.
4.  Profile UI.
5.  Profile preview modal.
6.  Block user backend.
7.  Block user frontend.
8.  Theme system.
9.  Theme picker.
10. Polish.

## Architecture Notes

Server-side: - Authentication - Profiles - Blocking - Validation

Client-side: - Theme storage - Theme rendering - Theme persistence

This minimizes server load while keeping themes instant and personal.

## Why This Order?

Each milestone builds on the previous one, minimizes refactoring, keeps
API changes isolated, and avoids coupling visual customization to
backend state.
