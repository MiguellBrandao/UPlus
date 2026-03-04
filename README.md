# UPlus (UdemyPlus)

UPlus is a Chrome extension that enhances Udemy learning pages with progress tracking, bulk lesson actions, and video productivity controls.

It targets Udemy course learning URLs (`/course/.../learn/...`) and is adapted to the current curriculum layout.

## Features

- Floating stats panel on course pages
- Draggable + resizable panel with persisted state (`position`, `width`, `minimized`)
- Real lesson-based progress metrics:
  - completed lessons / total lessons
  - watched time / total time
  - remaining time
  - completion percentage
- Accurate duration parsing from lesson items (ignores items without valid time)
- Per-course stats cache with 24h TTL
- Manual stats refresh button
- Cache/source metadata in panel (`cache` vs `live scrape` + timestamp)
- Section-state safe scraping:
  - temporarily expands sections when needed
  - restores original open/closed state
  - refocuses the top section that was originally open
- Bulk actions:
  - `Mark All`
  - `Reset`
- Confirmation modals for `Mark All`, `Reset`, and `Refresh`
- Per-action “don’t show again” option in confirmations
- Loading overlay for bulk operations
- Course history saved to extension storage (`https://www.udemy.com/course/.../`)
- Video controls:
  - speed control via mouse wheel (up to `16x`)
  - quick speed keys: `S` (slower), `D` (faster)
  - Picture-in-Picture
  - volume boost
  - auto skip delay toggle
  - loop toggle
  - focus mode toggle

## Popup, Settings, Shortcuts

- **Popup** (`popup.html`):
  - recent course history list
  - opens settings page
  - opens shortcuts page
  - shows “Go to Udemy” quick action only when current tab is not a Udemy course

- **Settings page** (`settings.html`):
  - show/hide course image
  - show/hide completion percentage in panel
  - show/hide remaining time in panel
  - auto refresh stats mode
  - per-action confirmation state (Mark All, Reset, Refresh) with Active/Ignored control
  - save feedback via stacked toast notifications (top-right, 10s each)

- **Shortcuts page** (`shortcuts.html`):
  - full keyboard shortcut reference

## Keyboard Shortcuts

On focused Udemy course pages:

- `S`: slow down video
- `D`: speed up video
- `Alt+Shift+R`: refresh stats
- `Alt+Shift+M`: minimize/expand panel
- `Alt+Shift+F`: toggle focus mode
- `Alt+Shift+L`: toggle loop
- `Alt+Shift+S`: toggle auto skip
- `Alt+Shift+P`: toggle Picture in Picture
- `Alt+Shift+V`: toggle volume boost

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript (modular source)
- `esbuild` for bundling
- CSS + Bootstrap + FontAwesome + Poppins
- `interact.js` for panel drag/resize behavior

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

- DOM selectors may need updates if Udemy changes markup/classes.
- Some controls depend on Udemy UI elements that can vary by locale/experiment.

