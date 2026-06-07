# Whoa Slow Go

A small browser-based educational food categorization game built with Node.js, Express, EJS, vanilla JavaScript, CSS, and JSON data.

The game shows one food at a time. Players choose whether it is a **Whoa**, **Slow**, or **Go** food, then get immediate feedback, points, streaks, and a final score. V2 adds an arcade-style start screen, difficulty timers, and a small SQLite-backed leaderboard.

## Run locally

1. Install packages:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Or start it with PM2, which watches for changes and restarts Express automatically:

   ```bash
   npm run pm2:start
   ```

   Useful PM2 commands:

   ```bash
   npm run pm2:logs
   npm run pm2:restart
   npm run pm2:stop
   ```

4. Open the app:

   ```text
   http://localhost:3001
   ```

## Data and scoring

- Food data still lives in `data/foods.json`.
- Score and answer history are stored in SQLite. By default, the database file is `data/game.sqlite`.
- Override the database location in production with:

  ```bash
  WHOA_FOOD_DB_PATH=/path/to/whoa-food.sqlite
  ```

- Local SQLite files are ignored by git. Back up the main `.sqlite` file, plus any `-wal` and `-shm` files if they exist while the app is running.
- The SQLite support uses Node's built-in `node:sqlite`, so production should run Node 22 or newer.
- Scoring settings live in `config/app.js`.
- Run the scoring checks with:

  ```bash
  npm run verify:scoring
  ```

## Project files

- `.env-public` contains checked-in public release values like the visible app version.
- `server.js` starts the Express server, serves the food data, saves scores, and returns leaderboard data.
- `lib/database.js` initializes SQLite and stores completed games.
- `lib/scoring.js` contains the shared scoring rules.
- `views/game.ejs` is the main page template.
- `public/css/game.css` contains the responsive game styling.
- `public/js/game.js` contains the browser game logic.
- `data/foods.json` contains the sample food list.
- `public/images/foods/` is where food images should be placed.
