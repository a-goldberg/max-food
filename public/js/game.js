// Whoa Slow Go keeps all game state in the browser.
// The server only sends the page and the food data.

const scoreElement = document.querySelector("#score");
const streakElement = document.querySelector("#streak");
const bestScoreElement = document.querySelector("#best-score");
const roundCountElement = document.querySelector("#round-count");
const questionElement = document.querySelector("#question");
const foodImageElement = document.querySelector("#food-image");
const foodNameElement = document.querySelector("#food-name");
const helperTextElement = document.querySelector("#helper-text");
const answerGridElement = document.querySelector("#answer-grid");
const answerButtons = document.querySelectorAll(".answer-button");
const feedbackElement = document.querySelector("#feedback");
const feedbackTitleElement = document.querySelector("#feedback-title");
const feedbackExplanationElement = document.querySelector("#feedback-explanation");
const celebrationElement = document.querySelector("#celebration");
const nextButton = document.querySelector("#next-button");
const finalScreenElement = document.querySelector("#final-screen");
const finalScoreElement = document.querySelector("#final-score");
const bestScoreNoteElement = document.querySelector("#best-score-note");
const playAgainButton = document.querySelector("#play-again-button");

const POINTS_FOR_CORRECT_ANSWER = 10;
const BEST_SCORE_KEY = "whoaSlowGoBestScore";

let foods = [];
let currentFoodIndex = 0;
let score = 0;
let streak = 0;
let bestScore = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
let hasAnsweredCurrentFood = false;

bestScoreElement.textContent = bestScore;

async function loadFoods() {
  try {
    const response = await fetch("/api/foods");

    if (!response.ok) {
      throw new Error("The food list could not be loaded.");
    }

    const loadedFoods = await response.json();
    foods = shuffleFoods(loadedFoods);
    startGame();
  } catch (error) {
    roundCountElement.textContent = "The food list is having trouble loading.";
    questionElement.textContent = "Please refresh the page to try again.";
    console.error(error);
  }
}

function startGame() {
  currentFoodIndex = 0;
  score = 0;
  streak = 0;
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

  feedbackElement.classList.add("hidden");
  finalScreenElement.classList.add("hidden");
  answerGridElement.classList.remove("hidden");
  helperTextElement.classList.remove("hidden");

  answerButtons.forEach((button) => {
    button.disabled = false;
  });

  roundCountElement.textContent = `Food ${currentFoodIndex + 1} of ${foods.length}`;
  questionElement.textContent = "Which kind of food is this?";
  foodNameElement.textContent = currentFood.name;
  foodImageElement.src = currentFood.image;
  foodImageElement.alt = currentFood.name;
  helperTextElement.textContent = "Think carefully, then choose!";
}

function handleAnswerClick(event) {
  const selectedButton = event.target.closest("button");

  if (!selectedButton || hasAnsweredCurrentFood) {
    return;
  }

  const selectedCategory = selectedButton.dataset.category;
  const currentFood = foods[currentFoodIndex];
  const isCorrect = selectedCategory === currentFood.category;

  hasAnsweredCurrentFood = true;

  answerButtons.forEach((button) => {
    button.disabled = true;
  });

  if (isCorrect) {
    score += POINTS_FOR_CORRECT_ANSWER;
    streak += 1;
    feedbackTitleElement.textContent = "Correct!";
    celebrationElement.textContent = getStreakCelebration(streak);
    launchConfetti();
  } else {
    streak = 0;
    feedbackTitleElement.textContent = `Good try! This one is ${currentFood.categoryLabel}.`;
    celebrationElement.textContent = "";
  }

  feedbackExplanationElement.textContent = currentFood.explanation;
  helperTextElement.textContent = "Read the clue, then move to the next food.";
  feedbackElement.classList.remove("hidden");
  updateScoreBoard();
}

function getStreakCelebration(currentStreak) {
  if (currentStreak > 0 && currentStreak % 5 === 0) {
    return `${currentStreak} in a row! You are on a big thinking streak.`;
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
    origin: { y: 0.7 }
  });
}

function goToNextFood() {
  currentFoodIndex += 1;

  if (currentFoodIndex >= foods.length) {
    showFinalScore();
    return;
  }

  showFood();
}

function showFinalScore() {
  answerGridElement.classList.add("hidden");
  feedbackElement.classList.add("hidden");
  helperTextElement.classList.add("hidden");
  finalScreenElement.classList.remove("hidden");

  roundCountElement.textContent = "Game complete";
  questionElement.textContent = "You sorted all the foods!";
  foodImageElement.src = makePlaceholderImage("All done!");
  foodImageElement.alt = "A cheerful all done message";
  foodNameElement.textContent = "Final Score";
  finalScoreElement.textContent = `You scored ${score} out of ${foods.length * POINTS_FOR_CORRECT_ANSWER} points.`;

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    bestScoreNoteElement.textContent = "New best score!";
  } else {
    bestScoreNoteElement.textContent = `Best score: ${bestScore}`;
  }

  updateScoreBoard();
}

function playAgain() {
  foods = shuffleFoods(foods);
  startGame();
}

function updateScoreBoard() {
  scoreElement.textContent = score;
  streakElement.textContent = streak;
  bestScoreElement.textContent = bestScore;
}

function makePlaceholderImage(label) {
  const safeLabel = encodeURIComponent(label);

  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' rx='34' fill='%23fff7dc'/%3E%3Ccircle cx='400' cy='180' r='82' fill='%23ffd22e'/%3E%3Ctext x='400' y='310' text-anchor='middle' font-family='Arial' font-size='52' font-weight='700' fill='%23434343'%3E${safeLabel}%3C/text%3E%3C/svg%3E`;
}

foodImageElement.addEventListener("error", () => {
  foodImageElement.src = makePlaceholderImage(foodNameElement.textContent);
});

answerGridElement.addEventListener("click", handleAnswerClick);
nextButton.addEventListener("click", goToNextFood);
playAgainButton.addEventListener("click", playAgain);

loadFoods();
