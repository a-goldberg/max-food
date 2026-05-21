const express = require("express");
const fs = require("fs");
const path = require("path");
const appConfig = require("./config/app");

const app = express();
const PORT = process.env.PORT || appConfig.defaultPort;

// Keep important folders in named variables so the paths are easy to follow.
const publicFolder = path.join(__dirname, "public");
const viewsFolder = path.join(__dirname, "views");
const foodsFile = path.join(__dirname, "data", "foods.json");
const publicEnvFile = path.join(__dirname, appConfig.publicEnvFile);

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
  const gameConfig = {
    pointsForCorrectAnswer: appConfig.pointsForCorrectAnswer,
    bestStreakStorageKey: appConfig.bestStreakStorageKey,
  };

  response.render("game", {
    pageTitle: appConfig.pageTitle,
    pageDescription: appConfig.pageDescription,
    shareImageUrl: `${requestOrigin}${appConfig.shareImagePath}`,
    pageUrl: requestOrigin,
    gameConfigJson: serializeForInlineScript(gameConfig),
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

app.use((request, response) => {
  if (wantsJson(request)) {
    response.status(404).json({ error: "Not found" });
    return;
  }

  sendErrorPage(response, 404, "Page Not Found", "That page is not part of this game.");
});

app.use((error, request, response, next) => {
  console.error(error);

  if (wantsJson(request)) {
    response.status(500).json({ error: "Something went wrong." });
    return;
  }

  sendErrorPage(
    response,
    500,
    "Something Went Wrong",
    "The game hit a server problem. Please refresh the page and try again.",
  );
});

app.listen(PORT, appConfig.bindHost, () => {
  console.log(`Whoa Slow Go is running at http://localhost:${PORT}`);
});

function serializeForInlineScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

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

function wantsJson(request) {
  return request.path.startsWith("/api/") || request.accepts(["html", "json"]) === "json";
}

function sendErrorPage(response, statusCode, title, message) {
  response.status(statusCode).send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,nofollow" />
    <title>${title}</title>
  </head>
  <body>
    <main style="max-width: 42rem; margin: 4rem auto; padding: 1rem; font-family: system-ui, sans-serif;">
      <h1>${title}</h1>
      <p>${message}</p>
      <p><a href="/">Back to the game</a></p>
    </main>
  </body>
</html>`);
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
