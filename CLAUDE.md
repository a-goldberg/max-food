# CLAUDE.md

Concise project context for future AI/code sessions.

## Project

Small Node/Express/EJS browser game. No React, TypeScript, Tailwind, database, auth, or build system.

App/game identity:

- PM2/app/package name going forward: `whoa-food`
- Visible H1 currently: `A Healthy Food Game`
- Original/game concept: “Whoa Slow Go”
- Production Express bind: `127.0.0.1:3001`, behind OpenLiteSpeed

## Core Files

- `server.js`: Express app, static serving, `/api/foods`, EJS render, simple 404/500 handlers.
- `config/app.js`: centralized app constants. Use this for high-level values instead of scattering literals.
- `.env-public`: checked-in public release values. Currently used for `version`.
- `views/game.ejs`: main page template, metadata, score UI, answer buttons, feedback modal.
- `public/js/game.js`: all browser game state and interaction logic.
- `public/css/game.css`: single stylesheet, organized by section comments.
- `data/foods.json`: source of truth for food items.
- `scripts/validate-foods.js`: food data validator.
- `data/README.md`: food data conventions.
- `ecosystem.config.js`: PM2 config.

## Current Cleanup State

Changes were committed to the v1-code-cleanup branch and pushed to remote.

After local testing, the branch will be merged into main and pulled onto the remote production server.

## Data Conventions

`data/foods.json` items require:

- `id`
- `name`
- `category`: lowercase `whoa`, `slow`, or `go`
- `categoryLabel`: normally `Whoa`, `Slow`, or `Go`
- `image`: `/images/foods/webp/<filename>.webp`
- `explanation`

Intentional exception:

- `hot-dog` has `categoryLabel: "Not Hot Dog"` as a joke. Do not “fix” it.

Run after food/image changes:

```bash
npm run validate:data
```

Validator checks required fields, duplicate ids/images, lowercase categories, label mappings except configured exceptions, image existence, and WebP coverage.

## Images

Game food images now use WebP paths in:

```text
public/images/foods/webp/
```

Old PNGs still exist in `public/images/foods/` and are large. Future cleanup may move/remove them if no longer needed.

Share images live in:

```text
public/images/share/
```

Current share image configured in `config/app.js`.

## Browser Game Logic

`public/js/game.js`:

- Fetches `/api/foods`
- Shuffles food order
- Shows one food at a time
- Compares selected `data-category` to food `category`
- Correct answer adds `pointsForCorrectAnswer` from `config/app.js`
- Tracks current score, current streak, and persistent best streak in `localStorage`
- Best streak storage key comes from `config/app.js`
- Confetti only fires when a new best streak is first exceeded in the current streak, excluding initial best of 0
- Feedback appears in modal overlay
- Escape advances/ closes feedback modal

DOM ids after cleanup:

- `#score`
- `#streak`
- `#best-streak`
- `#best-streak-note`

Avoid reintroducing `best-score` naming.

## Server / Routing

`server.js`:

- Serves `/public` statics
- Serves canvas-confetti package from `/vendor/canvas-confetti`
- Renders `/`
- Serves food data at `/api/foods`
- Has basic 404/500 responses

Metadata/OG URLs are built from request origin plus config paths. If deployed behind OpenLiteSpeed, make sure forwarded proto/host are correct.

## PM2 / Deployment

PM2 is intended to be global on production, not a project dependency.

Useful scripts:

```bash
npm run pm2:start
npm run pm2:restart
npm run pm2:stop
npm run pm2:logs
```

These refer to PM2 app name `whoa-food`.

Remote deploy reminder:

```bash
npm install
npm run validate:data
pm2 restart whoa-food
```

If dependencies missing on server, run `npm install` in project directory. Do not commit `node_modules`.

## SEO / Privacy / Crawling

The app has:

- `public/robots.txt` with `Disallow: /`
- `<meta name="robots" content="noindex,nofollow">`
- Google Analytics is currently present in `views/game.ejs`, which conflicts somewhat with the private/noindex posture. Decide intentionally before changing.

GitHub issue #3 exists for OpenLiteSpeed static custom error pages:

- 404
- 500
- 503

Those should live outside Node-managed `/public` and be configured in OLS.

## Known Gotchas

- `category` values are case-sensitive; `Go` breaks gameplay.
- Confetti script path must be `/vendor/canvas-confetti/confetti.browser.js`; `.min.js` did not exist in installed package.
- The app may have playful/non-clinical food explanations. Preserve intentional jokes unless user asks to normalize tone.
- Page title and H1 intentionally do not currently match; user said this is fine for now.
- `package-lock.json` may change substantially if PM2 dependency is removed; this is expected in cleanup.

## Recommended Future Cleanup

- Commit the current cleanup changes if not already committed.
- Consider removing/moving old PNG food images to reduce deploy size.
- Decide whether Google Analytics belongs in a noindex personal app.
- Add OLS static error pages per issue #3.
- Update main `README.md` after cleanup settles.
