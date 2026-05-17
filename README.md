# Whoa Slow Go

A small browser-based educational food categorization game built with Node.js, Express, EJS, vanilla JavaScript, CSS, and JSON data.

The game shows one food at a time. Players choose whether it is a **Whoa**, **Slow**, or **Go** food, then get immediate feedback, points, streaks, and a final score.

## Run locally

1. Install packages:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open the app:

   ```text
   http://localhost:3000
   ```

## Project files

- `server.js` starts the Express server and serves the food data.
- `views/game.ejs` is the main page template.
- `public/css/game.css` contains the responsive game styling.
- `public/js/game.js` contains the browser game logic.
- `data/foods.json` contains the sample food list.
- `public/images/foods/` is where food images should be placed.
