# UPlus (UdemyPlus)

UPlus is a Chrome extension that enhances Udemy course pages with:
- A floating progress panel
- Bulk lesson actions (mark all / reset)
- Advanced video controls

This version targets Udemy course learning pages (`/course/.../learn/...`) and uses the current curriculum layout.

## Features

- Floating, draggable, and resizable stats panel
- Persisted panel state (`position`, `width`, `minimized`) via `localStorage`
- Real lesson-based progress tracking:
  - Completed lessons / total lessons
  - Watched time / total time
  - Completion percentage
- Accurate duration counting from lesson items (ignores items without time, e.g. coding exercises without duration)
- Auto-refresh of stats when:
  - A lesson checkbox is toggled
  - The current lesson URL changes
- Course image fetch from Udemy API (when `courseId` is available)
- Bulk actions with confirmation modal:
  - `Mark All`
  - `Reset`
  - Risk warning shown in English (not officially recommended by Udemy; no known ban reports; use at your own risk)
- Loading overlay during bulk operations
- Video tools:
  - Speed control (mouse wheel + click reset to `1.00x`)
  - Picture-in-Picture
  - Volume boost
  - Auto Skip Delay
  - Loop mode
  - Focus mode

## Project Scope

- Included: course page features (`scripts/course-page`)
- Excluded: popup UI, explore page features, and video filters

## Tech Stack

- Manifest V3
- Vanilla JavaScript (modular source files)
- `esbuild` for bundling
- CSS + Bootstrap + FontAwesome + Poppins
- `interact.js` for drag behavior

## Structure

```text
manifest.json
build.js
dist/course-page.bundle.js
scripts/course-page/*
styles/udemyplus.css
libs/*
assets/logo.png
```

## Build

```bash
npm install
npm run build
```

Build output:
- `dist/course-page.bundle.js`

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this project folder

## Notes

- The extension injects features directly on Udemy learning pages.
- Some selectors may need future updates if Udemy changes their DOM/classes.
