const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Keep important folders in named variables so the paths are easy to follow.
const publicFolder = path.join(__dirname, "public");
const viewsFolder = path.join(__dirname, "views");
const foodsFile = path.join(__dirname, "data", "foods.json");

app.set("view engine", "ejs");
app.set("views", viewsFolder);

// Anything in /public can be loaded directly by the browser.
app.use(express.static(publicFolder));

// Serve the browser build of canvas-confetti from the installed npm package.
// This keeps the project npm-based without adding a bundler.
app.use(
  "/vendor/canvas-confetti",
  express.static(path.join(__dirname, "node_modules", "canvas-confetti", "dist"))
);

app.get("/", (request, response) => {
  response.render("game", {
    pageTitle: "Whoa Slow Go"
  });
});

app.get("/api/foods", (request, response, next) => {
  fs.readFile(foodsFile, "utf8", (error, fileContents) => {
    if (error) {
      next(error);
      return;
    }

    try {
      const foods = JSON.parse(fileContents);
      response.json(foods);
    } catch (parseError) {
      next(parseError);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Whoa Slow Go is running at http://localhost:${PORT}`);
});
