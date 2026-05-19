const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

// Keep important folders in named variables so the paths are easy to follow.
const publicFolder = path.join(__dirname, "public");
const viewsFolder = path.join(__dirname, "views");
const foodsFile = path.join(__dirname, "data", "foods.json");
const publicEnvFile = path.join(__dirname, ".env-public");

app.set("view engine", "ejs");
app.set("views", viewsFolder);

// Anything in /public can be loaded directly by the browser.
app.use(express.static(publicFolder));

// Serve the browser build of canvas-confetti from the installed npm package.
// This keeps the project npm-based without adding a bundler.
app.use(
  "/vendor/canvas-confetti",
  express.static(
    path.join(__dirname, "node_modules", "canvas-confetti", "dist"),
  ),
);

app.get("/", (request, response) => {
  const requestOrigin = getRequestOrigin(request);

  response.render("game", {
    pageTitle: "A Healthy Food Game",
    pageDescription:
      "A playful food categorization game for learning Whoa, Slow, and Go foods.",
    shareImageUrl: `${requestOrigin}/images/share/barbecue-plate-share.jpg`,
    pageUrl: requestOrigin,
    versionNumber: getPublicEnvValue("version", "0.0.0"),
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

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Whoa Slow Go is running at http://localhost:${PORT}`);
});

function getPublicEnvValue(key, fallbackValue) {
  try {
    const fileContents = fs.readFileSync(publicEnvFile, "utf8");
    const publicValues = parsePublicEnv(fileContents);

    return publicValues[key] || fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function getRequestOrigin(request) {
  const forwardedProtocol = request.get("x-forwarded-proto");
  const protocol = forwardedProtocol || request.protocol;

  return `${protocol}://${request.get("host")}`;
}

function parsePublicEnv(fileContents) {
  const values = {};

  // This intentionally supports only simple key=value lines so the public
  // config stays easy to read and safe to check into version control.
  fileContents.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return;
    }

    const equalsIndex = trimmedLine.indexOf("=");

    if (equalsIndex === -1) {
      return;
    }

    const key = trimmedLine.slice(0, equalsIndex).trim();
    const value = trimmedLine.slice(equalsIndex + 1).trim();

    values[key] = value;
  });

  return values;
}
