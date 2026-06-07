const express = require("express");
const fs = require("fs");
const path = require("path");
const appConfig = require("./config/app");
const {
  getLeaderboard,
  openGameDatabase,
  saveCompletedGame,
} = require("./lib/database");
const {
  VALID_SELECTIONS,
  calculateAnswerScore,
  getDifficultyConfig,
  getMaxPointsForDifficulty,
  makePublicGameConfig,
  normalizePlayerLocation,
  normalizePlayerName,
} = require("./lib/scoring");

const app = express();
const PORT = process.env.PORT || appConfig.defaultPort;

// Keep important folders in named variables so the paths are easy to follow.
const publicFolder = path.join(__dirname, "public");
const viewsFolder = path.join(__dirname, "views");
const foodsFile = path.join(__dirname, "data", "foods.json");
const publicEnvFile = path.join(__dirname, appConfig.publicEnvFile);
const databaseFile = path.resolve(
  __dirname,
  process.env[appConfig.databasePathEnvVar] || appConfig.defaultDatabasePath,
);
const gameDatabase = openGameDatabase(databaseFile);

app.set("view engine", "ejs");
app.set("views", viewsFolder);

// Anything in /public can be loaded directly by the browser.
app.use(express.json({ limit: "80kb" }));
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
  const gameConfig = makePublicGameConfig(appConfig);

  response.render("game", {
    pageTitle: appConfig.pageTitle,
    pageDescription: appConfig.pageDescription,
    shareImageUrl: `${requestOrigin}${appConfig.shareImagePath}`,
    pageUrl: requestOrigin,
    gameConfigJson: serializeForInlineScript(gameConfig),
    versionNumber: getPublicEnvValue("version", "0.0.0"),
    playerNameMaxLength: appConfig.playerNameMaxLength,
    playerLocationMaxLength: appConfig.playerLocationMaxLength,
  });
});

app.post("/api/scores", (request, response) => {
  try {
    const foods = readFoods();
    const completedGame = buildCompletedGame(request.body, foods);
    const sessionId = saveCompletedGame(gameDatabase, completedGame);

    response.status(201).json({
      sessionId,
      totalScore: completedGame.totalScore,
      maxPossibleScore: completedGame.maxPossibleScore,
    });
  } catch (error) {
    if (error.statusCode) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }

    throw error;
  }
});

app.get("/api/leaderboard", (request, response) => {
  const difficulty = String(request.query.difficulty || "all").toLowerCase();
  const limit = clampLeaderboardLimit(request.query.limit);

  if (
    difficulty !== "all" &&
    !getDifficultyConfig(appConfig.scoring, difficulty)
  ) {
    response.status(400).json({ error: "Unknown leaderboard difficulty." });
    return;
  }

  response.json({
    difficulty,
    scores: getLeaderboard(gameDatabase, difficulty, limit),
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

function readFoods() {
  const fileContents = fs.readFileSync(foodsFile, "utf8");

  return JSON.parse(fileContents);
}

function buildCompletedGame(payload = {}, foods) {
  const errors = [];
  const playerName = normalizePlayerName(
    payload.playerName,
    appConfig.playerNameMaxLength,
  );
  const playerLocation = normalizePlayerLocation(
    payload.playerLocation,
    appConfig.playerLocationMaxLength,
  );
  const difficulty = String(payload.difficulty || "").toLowerCase();
  const difficultyConfig = getDifficultyConfig(appConfig.scoring, difficulty);
  const foodById = new Map(foods.map((food) => [food.id, food]));
  const answers = Array.isArray(payload.answers) ? payload.answers : [];
  const startedAt = normalizeIsoDate(payload.startedAt);
  const completedAt = normalizeIsoDate(payload.completedAt);

  if (!playerName) {
    errors.push("Player name is required.");
  }

  if (!difficultyConfig) {
    errors.push("Unknown difficulty.");
  }

  if (!startedAt || !completedAt) {
    errors.push("Game start and completion times are required.");
  }

  if (answers.length > foods.length) {
    errors.push("A submitted game cannot include more answers than foods.");
  }

  const seenFoodIds = new Set();
  const timerLimitMs = difficultyConfig && difficultyConfig.timerSeconds
    ? difficultyConfig.timerSeconds * 1000
    : null;

  const normalizedAnswers = answers.map((answer, index) => {
    const foodId = String(answer.foodId || "");
    const food = foodById.get(foodId);
    const selectedCategory = String(answer.selectedCategory || "").toLowerCase();
    const timedOut = Boolean(answer.timedOut);

    if (!food) {
      errors.push(`Unknown food id at answer ${index + 1}.`);
    } else if (seenFoodIds.has(foodId)) {
      errors.push(`Duplicate food id at answer ${index + 1}.`);
    } else {
      seenFoodIds.add(foodId);
    }

    if (!VALID_SELECTIONS.includes(selectedCategory)) {
      errors.push(`Unknown selected category at answer ${index + 1}.`);
    }

    if (timedOut && selectedCategory !== "timeout") {
      errors.push(`Timed-out answer ${index + 1} must use timeout.`);
    }

    if (!timedOut && selectedCategory === "timeout") {
      errors.push(`Timeout answer ${index + 1} must be marked timed out.`);
    }

    const correctCategory = food ? food.category : "";
    const isCorrect = selectedCategory === correctCategory && !timedOut;
    const responseTimeMs = normalizeResponseTime(answer.responseTimeMs);
    const pointsAwarded = calculateAnswerScore(
      appConfig.scoring,
      difficulty,
      isCorrect,
      responseTimeMs,
    );

    return {
      roundNumber: index + 1,
      foodId,
      selectedCategory,
      correctCategory,
      isCorrect,
      timedOut,
      responseTimeMs,
      timerLimitMs,
      pointsAwarded,
    };
  });

  if (seenFoodIds.size !== answers.length) {
    errors.push("Submitted answers cannot include the same food twice.");
  }

  if (errors.length > 0) {
    throw makeHttpError(400, errors[0]);
  }

  const totalScore = normalizedAnswers.reduce(
    (runningTotal, answer) => runningTotal + answer.pointsAwarded,
    0,
  );
  const maxPossibleScore =
    foods.length * getMaxPointsForDifficulty(appConfig.scoring, difficulty);

  return {
    playerName,
    playerLocation,
    difficulty,
    startedAt,
    completedAt,
    scoringConfigVersion: appConfig.scoringConfigVersion,
    scoringConfig: appConfig.scoring,
    totalScore,
    maxPossibleScore,
    answers: normalizedAnswers,
  };
}

function normalizeResponseTime(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Math.round(Number(value));

  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeIsoDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function clampLeaderboardLimit(value) {
  const number = Math.round(Number(value));

  if (!Number.isFinite(number)) {
    return appConfig.leaderboardDefaultLimit;
  }

  return Math.min(appConfig.leaderboardMaxLimit, Math.max(1, number));
}

function makeHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
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
