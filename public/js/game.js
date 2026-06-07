// Whoa Slow Go keeps the fast game interaction in the browser.
// Completed games are sent to the server so scores and answer stats survive refreshes.

const scoreElement = document.querySelector("#score");
const streakElement = document.querySelector("#streak");
const bestStreakElement = document.querySelector("#best-streak");
const roundCountElement = document.querySelector("#round-count");
const questionElement = document.querySelector("#question");
const foodImageElement = document.querySelector("#food-image");
const foodNameElement = document.querySelector("#food-name");
const helperTextElement = document.querySelector("#helper-text");
const answerGridElement = document.querySelector("#answer-grid");
const answerButtons = document.querySelectorAll(".answer-button");
const quitGameButton = document.querySelector("#quit-game-button");
const feedbackElement = document.querySelector("#feedback");
const feedbackTitleElement = document.querySelector("#feedback-title");
const feedbackExplanationElement = document.querySelector(
  "#feedback-explanation",
);
const celebrationElement = document.querySelector("#celebration");
const nextButton = document.querySelector("#next-button");
const finalScreenElement = document.querySelector("#final-screen");
const finalScoreElement = document.querySelector("#final-score");
const bestStreakNoteElement = document.querySelector("#best-streak-note");
const playAgainButton = document.querySelector("#play-again-button");
const timerPillElement = document.querySelector("#timer-pill");
const timerElement = document.querySelector("#timer");
const saveStatusElement = document.querySelector("#save-status");
const leaderboardElement = document.querySelector("#leaderboard");
const leaderboardListElement = document.querySelector("#leaderboard-list");
const startScreenElement = document.querySelector("#start-screen");
const startFormElement = document.querySelector("#start-form");
const startLeaderboardPanelElement = document.querySelector(
  "#start-leaderboard-panel",
);
const playerNameElement = document.querySelector("#player-name");
const playerLocationElement = document.querySelector("#player-location");
const startErrorElement = document.querySelector("#start-error");
const startLeaderboardButton = document.querySelector("#start-leaderboard-button");
const startLeaderboardElement = document.querySelector("#start-leaderboard");
const startLeaderboardListElement = document.querySelector(
  "#start-leaderboard-list",
);
const startLeaderboardStatusElement = document.querySelector(
  "#start-leaderboard-status",
);
const backToStartButton = document.querySelector("#back-to-start-button");
const gameConfig = window.WHOA_FOOD_CONFIG || {};

const BEST_STREAK_KEY = gameConfig.bestStreakStorageKey || "whoaSlowGoBestStreak";
const SCORING = gameConfig.scoring || {
  basePoints: 10,
  difficulties: {
    practice: { label: "Practice", timerSeconds: null, multiplier: 1 },
  },
};
const PLAYER_NAME_MAX_LENGTH = gameConfig.playerNameMaxLength || 8;
const PLAYER_LOCATION_MAX_LENGTH = gameConfig.playerLocationMaxLength || 32;
const LEADERBOARD_LIMIT = gameConfig.leaderboardDefaultLimit || 10;

let foods = [];
let currentFoodIndex = 0;
let score = 0;
let streak = 0;
let bestStreak = Number(localStorage.getItem(BEST_STREAK_KEY)) || 0;
let hasAnsweredCurrentFood = false;
let hasHandledBestForCurrentStreak = false;
let currentPlayer = null;
let gameStartedAt = null;
let roundAnswers = [];
let currentFoodStartedAt = 0;
let currentTimerLimitMs = null;
let timerIntervalId = null;
let timerTimeoutId = null;

bestStreakElement.textContent = bestStreak;

async function loadFoods() {
  try {
    const response = await fetch("/api/foods");

    if (!response.ok) {
      throw new Error("The food list could not be loaded.");
    }

    foods = await response.json();
    showStartScreen();
  } catch (error) {
    roundCountElement.textContent = "The food list is having trouble loading.";
    questionElement.textContent = "Please refresh the page to try again.";
    console.error(error);
  }
}

function showStartScreen() {
  clearTimer();
  closeFeedbackModal();
  quitGameButton.classList.add("hidden");
  startFormElement.classList.remove("hidden");
  startLeaderboardPanelElement.classList.add("hidden");
  startLeaderboardStatusElement.textContent = "";
  startScreenElement.classList.remove("hidden");
  document.body.classList.add("start-open");
  playerNameElement.focus();
}

function hideStartScreen() {
  startScreenElement.classList.add("hidden");
  document.body.classList.remove("start-open");
}

function handleStartSubmit(event) {
  event.preventDefault();

  const formData = new FormData(startFormElement);
  const playerName = cleanText(
    formData.get("playerName"),
    PLAYER_NAME_MAX_LENGTH,
  );
  const playerLocation = cleanText(
    formData.get("playerLocation"),
    PLAYER_LOCATION_MAX_LENGTH,
  );
  const difficulty = String(formData.get("difficulty") || "normal");

  if (!playerName) {
    startErrorElement.textContent = "Please enter a name.";
    playerNameElement.focus();
    return;
  }

  if (!SCORING.difficulties[difficulty]) {
    startErrorElement.textContent = "Please choose a difficulty.";
    return;
  }

  currentPlayer = {
    name: playerName,
    location: playerLocation,
    difficulty,
  };
  startErrorElement.textContent = "";
  hideStartScreen();
  foods = shuffleFoods(foods);
  startGame();
}

function startGame() {
  currentFoodIndex = 0;
  score = 0;
  streak = 0;
  roundAnswers = [];
  gameStartedAt = new Date().toISOString();
  hasHandledBestForCurrentStreak = false;
  updateScoreBoard();
  showFood();
}

function shuffleFoods(foodList) {
  const shuffledFoods = [...foodList];

  // Fisher-Yates shuffle: walk backward and swap each item with a random earlier item.
  for (let index = shuffledFoods.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const foodToMove = shuffledFoods[index];
    shuffledFoods[index] = shuffledFoods[randomIndex];
    shuffledFoods[randomIndex] = foodToMove;
  }

  return shuffledFoods;
}

function showFood() {
  const currentFood = foods[currentFoodIndex];
  hasAnsweredCurrentFood = false;
  currentFoodStartedAt = performance.now();

  clearTimer();
  closeFeedbackModal();
  finalScreenElement.classList.add("hidden");
  answerGridElement.classList.remove("hidden");
  helperTextElement.classList.remove("hidden");
  quitGameButton.classList.remove("hidden");
  leaderboardElement.classList.add("hidden");
  leaderboardListElement.innerHTML = "";
  saveStatusElement.textContent = "";

  answerButtons.forEach((button) => {
    button.disabled = false;
  });

  roundCountElement.textContent = `Food ${currentFoodIndex + 1} of ${foods.length}`;
  questionElement.textContent = "Is This a Healthy Food?";
  foodNameElement.textContent = currentFood.name;
  foodImageElement.src = currentFood.image;
  foodImageElement.alt = currentFood.name;
  helperTextElement.textContent = getHelperText();
  startTimerIfNeeded();
}

function getHelperText() {
  const difficultyConfig = getCurrentDifficultyConfig();

  if (!difficultyConfig.timerSeconds) {
    return "Practice mode: think carefully, then choose!";
  }

  return `${difficultyConfig.label} mode: choose before time runs out!`;
}

function startTimerIfNeeded() {
  const difficultyConfig = getCurrentDifficultyConfig();

  if (!difficultyConfig.timerSeconds) {
    currentTimerLimitMs = null;
    timerPillElement.classList.add("hidden");
    timerElement.textContent = "--";
    return;
  }

  currentTimerLimitMs = difficultyConfig.timerSeconds * 1000;
  timerPillElement.classList.remove("hidden");
  updateTimerDisplay();

  timerIntervalId = window.setInterval(updateTimerDisplay, 100);
  timerTimeoutId = window.setTimeout(() => {
    recordAnswer("timeout", true);
  }, currentTimerLimitMs);
}

function updateTimerDisplay() {
  if (!currentTimerLimitMs) {
    return;
  }

  const elapsedMs = performance.now() - currentFoodStartedAt;
  const remainingMs = Math.max(0, currentTimerLimitMs - elapsedMs);
  timerElement.textContent = `${(remainingMs / 1000).toFixed(1)}s`;
}

function clearTimer() {
  if (timerIntervalId) {
    window.clearInterval(timerIntervalId);
    timerIntervalId = null;
  }

  if (timerTimeoutId) {
    window.clearTimeout(timerTimeoutId);
    timerTimeoutId = null;
  }
}

function handleAnswerClick(event) {
  const selectedButton = event.target.closest("button");

  if (!selectedButton || hasAnsweredCurrentFood) {
    return;
  }

  recordAnswer(selectedButton.dataset.category, false);
}

function recordAnswer(selectedCategory, timedOut) {
  if (hasAnsweredCurrentFood) {
    return;
  }

  const currentFood = foods[currentFoodIndex];
  const responseTimeMs = currentTimerLimitMs
    ? Math.round(performance.now() - currentFoodStartedAt)
    : null;
  const isCorrect = selectedCategory === currentFood.category && !timedOut;
  const pointsAwarded = calculateAnswerScore(
    currentPlayer.difficulty,
    isCorrect,
    responseTimeMs,
  );

  hasAnsweredCurrentFood = true;
  clearTimer();

  answerButtons.forEach((button) => {
    button.disabled = true;
  });

  roundAnswers.push({
    foodId: currentFood.id,
    selectedCategory,
    correctCategory: currentFood.category,
    timedOut,
    responseTimeMs,
    timerLimitMs: currentTimerLimitMs,
    pointsAwarded,
  });

  if (isCorrect) {
    score += pointsAwarded;
    streak += 1;
    const reachedNewBestStreak = saveBestStreakIfNeeded();
    feedbackTitleElement.textContent = `Correct! +${pointsAwarded}`;
    celebrationElement.textContent = getStreakCelebration(
      streak,
      reachedNewBestStreak,
    );
  } else {
    streak = 0;
    hasHandledBestForCurrentStreak = false;
    feedbackTitleElement.textContent = timedOut
      ? `Time! This one is ${currentFood.categoryLabel}.`
      : `Good try! This one is ${currentFood.categoryLabel}.`;
    celebrationElement.textContent = "";
  }

  feedbackExplanationElement.textContent = currentFood.explanation;
  helperTextElement.textContent = "Read the clue, then move to the next food.";
  openFeedbackModal();
  updateScoreBoard();
}

function calculateAnswerScore(difficulty, isCorrect, responseTimeMs) {
  const difficultyConfig = SCORING.difficulties[difficulty];

  if (!difficultyConfig || !isCorrect) {
    return 0;
  }

  if (!difficultyConfig.timerSeconds) {
    return SCORING.basePoints;
  }

  const timerLimitMs = difficultyConfig.timerSeconds * 1000;
  const safeResponseTimeMs = Math.min(
    timerLimitMs,
    Math.max(0, Number(responseTimeMs) || 0),
  );
  const timeRemainingRatio = (timerLimitMs - safeResponseTimeMs) / timerLimitMs;
  const availableBonus =
    SCORING.basePoints * (difficultyConfig.multiplier - 1);

  return Math.round(SCORING.basePoints + availableBonus * timeRemainingRatio);
}

function openFeedbackModal() {
  feedbackElement.classList.remove("hidden");
  document.body.classList.add("feedback-open");

  // Move keyboard focus into the modal so keyboard and screen reader users land on the next action.
  nextButton.focus();
}

function closeFeedbackModal() {
  feedbackElement.classList.add("hidden");
  document.body.classList.remove("feedback-open");
}

function getStreakCelebration(currentStreak, reachedNewBestStreak) {
  if (reachedNewBestStreak) {
    launchConfetti();

    return `New best streak: ${currentStreak} in a row!`;
  }

  if (currentStreak > 0 && currentStreak % 10 === 0) {
    return `${currentStreak} in a row! Look at the big brain on this one.`;
  }

  if (currentStreak > 0 && currentStreak % 5 === 0) {
    return `${currentStreak} in a row! You are on a thinking streak.`;
  }

  if (currentStreak > 0 && currentStreak % 3 === 0) {
    return `${currentStreak} in a row! Nice focus.`;
  }

  return "";
}

function launchConfetti() {
  if (typeof confetti !== "function") {
    return;
  }

  confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.7 },
  });
}

function goToNextFood() {
  closeFeedbackModal();
  currentFoodIndex += 1;

  if (currentFoodIndex >= foods.length) {
    showFinalScore();
    return;
  }

  showFood();
}

function quitGame() {
  if (!currentPlayer || finalScreenElement.classList.contains("hidden") === false) {
    return;
  }

  hasAnsweredCurrentFood = true;
  showFinalScore(true);
}

function showFinalScore(wasQuitEarly = false) {
  const maxPossibleScore = getMaxPossibleScore();

  clearTimer();
  timerPillElement.classList.add("hidden");
  answerGridElement.classList.add("hidden");
  closeFeedbackModal();
  helperTextElement.classList.add("hidden");
  quitGameButton.classList.add("hidden");
  finalScreenElement.classList.remove("hidden");

  roundCountElement.textContent = "Game complete";
  questionElement.textContent = wasQuitEarly
    ? "You stopped this round."
    : "You sorted all the foods!";
  foodImageElement.src = makePlaceholderImage("All done!");
  foodImageElement.alt = "A cheerful all done message";
  foodNameElement.textContent = "Final Score";
  finalScoreElement.textContent = `You scored ${score} out of ${maxPossibleScore} points.`;

  if (bestStreak > 0) {
    bestStreakNoteElement.textContent = `Best streak: ${bestStreak} in a row`;
  } else {
    bestStreakNoteElement.textContent = "Best streak: 0";
  }

  updateScoreBoard();
  submitScoreAndLoadLeaderboard(maxPossibleScore);
}

async function submitScoreAndLoadLeaderboard(maxPossibleScore) {
  saveStatusElement.textContent = "Saving score...";

  try {
    const completedAt = new Date().toISOString();
    const saveResponse = await fetch("/api/scores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerName: currentPlayer.name,
        playerLocation: currentPlayer.location,
        difficulty: currentPlayer.difficulty,
        startedAt: gameStartedAt,
        completedAt,
        scoringConfigVersion: gameConfig.scoringConfigVersion,
        totalScore: score,
        maxPossibleScore,
        answers: roundAnswers,
      }),
    });

    if (!saveResponse.ok) {
      throw new Error("Score could not be saved.");
    }

    const savedScore = await saveResponse.json();
    score = savedScore.totalScore;
    finalScoreElement.textContent = `You scored ${score} out of ${savedScore.maxPossibleScore} points.`;
    updateScoreBoard();
    saveStatusElement.textContent = "Score saved.";
    await loadLeaderboard(leaderboardElement, leaderboardListElement);
  } catch (error) {
    saveStatusElement.textContent =
      "Your score is shown here, but it could not be saved.";
    console.error(error);
  }
}

async function loadLeaderboard(leaderboardContainer, leaderboardList) {
  const response = await fetch(
    `/api/leaderboard?difficulty=all&limit=${LEADERBOARD_LIMIT}`,
  );

  if (!response.ok) {
    throw new Error("Leaderboard could not be loaded.");
  }

  const leaderboard = await response.json();
  return renderLeaderboard(
    leaderboard.scores || [],
    leaderboardContainer,
    leaderboardList,
  );
}

function renderLeaderboard(scores, leaderboardContainer, leaderboardList) {
  leaderboardList.innerHTML = "";

  if (scores.length === 0) {
    leaderboardContainer.classList.add("hidden");
    return false;
  }

  scores.forEach((entry) => {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    const details = document.createElement("span");

    name.textContent = `${entry.playerName} - ${entry.totalScore}`;
    details.textContent = [
      entry.playerLocation,
      formatDifficulty(entry.difficulty),
      formatShortDate(entry.completedAt),
    ]
      .filter(Boolean)
      .join(" | ");

    item.append(name, details);
    leaderboardList.append(item);
  });

  leaderboardContainer.classList.remove("hidden");
  return true;
}

async function showStartLeaderboard() {
  startErrorElement.textContent = "";
  startFormElement.classList.add("hidden");
  startLeaderboardPanelElement.classList.remove("hidden");
  startLeaderboardStatusElement.textContent = "Loading leaderboard...";

  try {
    const hasScores = await loadLeaderboard(
      startLeaderboardElement,
      startLeaderboardListElement,
    );
    startLeaderboardStatusElement.textContent = hasScores
      ? ""
      : "No scores yet. You can be the first.";
    backToStartButton.focus();
  } catch (error) {
    startLeaderboardStatusElement.textContent =
      "The leaderboard could not be loaded.";
    console.error(error);
  }
}

function showStartFormPanel() {
  startLeaderboardPanelElement.classList.add("hidden");
  startFormElement.classList.remove("hidden");
  startLeaderboardStatusElement.textContent = "";
  playerNameElement.focus();
}

function playAgain() {
  showStartScreen();
}

function updateScoreBoard() {
  scoreElement.textContent = score;
  streakElement.textContent = streak;
  bestStreakElement.textContent = bestStreak;
}

function saveBestStreakIfNeeded() {
  if (streak <= bestStreak) {
    return false;
  }

  const previousBestStreak = bestStreak;
  bestStreak = streak;
  localStorage.setItem(BEST_STREAK_KEY, String(bestStreak));

  if (hasHandledBestForCurrentStreak) {
    return false;
  }

  hasHandledBestForCurrentStreak = true;
  return previousBestStreak > 0;
}

function getCurrentDifficultyConfig() {
  return SCORING.difficulties[currentPlayer.difficulty];
}

function getMaxPossibleScore() {
  const difficultyConfig = getCurrentDifficultyConfig();

  return foods.length * Math.round(SCORING.basePoints * difficultyConfig.multiplier);
}

function formatDifficulty(difficulty) {
  const difficultyConfig = SCORING.difficulties[difficulty];

  return difficultyConfig ? difficultyConfig.label : difficulty;
}

function formatShortDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function makePlaceholderImage(label) {
  const safeLabel = encodeURIComponent(label);

  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' rx='34' fill='%23fff7dc'/%3E%3Ccircle cx='400' cy='180' r='82' fill='%23ffd22e'/%3E%3Ctext x='400' y='310' text-anchor='middle' font-family='Arial' font-size='52' font-weight='700' fill='%23434343'%3E${safeLabel}%3C/text%3E%3C/svg%3E`;
}

foodImageElement.addEventListener("error", () => {
  foodImageElement.src = makePlaceholderImage(foodNameElement.textContent);
});

answerGridElement.addEventListener("click", handleAnswerClick);
quitGameButton.addEventListener("click", quitGame);
nextButton.addEventListener("click", goToNextFood);
playAgainButton.addEventListener("click", playAgain);
startFormElement.addEventListener("submit", handleStartSubmit);
startLeaderboardButton.addEventListener("click", showStartLeaderboard);
backToStartButton.addEventListener("click", showStartFormPanel);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !feedbackElement.classList.contains("hidden")) {
    goToNextFood();
  }
});

loadFoods();
