const VALID_SELECTIONS = ["whoa", "slow", "go", "timeout"];

function makePublicGameConfig(appConfig) {
  return {
    bestStreakStorageKey: appConfig.bestStreakStorageKey,
    scoringConfigVersion: appConfig.scoringConfigVersion,
    scoring: appConfig.scoring,
    playerNameMaxLength: appConfig.playerNameMaxLength,
    playerLocationMaxLength: appConfig.playerLocationMaxLength,
    leaderboardDefaultLimit: appConfig.leaderboardDefaultLimit,
  };
}

function getDifficultyConfig(scoring, difficulty) {
  return scoring.difficulties[difficulty] || null;
}

function getMaxPointsForDifficulty(scoring, difficulty) {
  const difficultyConfig = getDifficultyConfig(scoring, difficulty);

  if (!difficultyConfig) {
    return 0;
  }

  return Math.round(scoring.basePoints * difficultyConfig.multiplier);
}

function calculateAnswerScore(scoring, difficulty, isCorrect, responseTimeMs) {
  const difficultyConfig = getDifficultyConfig(scoring, difficulty);

  if (!difficultyConfig || !isCorrect) {
    return 0;
  }

  if (!difficultyConfig.timerSeconds) {
    return scoring.basePoints;
  }

  const timerLimitMs = difficultyConfig.timerSeconds * 1000;
  const safeResponseTimeMs = clampNumber(responseTimeMs, 0, timerLimitMs);
  const timeRemainingMs = timerLimitMs - safeResponseTimeMs;
  const timeRemainingRatio = timeRemainingMs / timerLimitMs;
  const availableBonus =
    scoring.basePoints * (difficultyConfig.multiplier - 1);

  return Math.round(scoring.basePoints + availableBonus * timeRemainingRatio);
}

function normalizePlayerName(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizePlayerLocation(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function clampNumber(value, minimum, maximum) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return minimum;
  }

  return Math.min(maximum, Math.max(minimum, number));
}

module.exports = {
  VALID_SELECTIONS,
  calculateAnswerScore,
  getDifficultyConfig,
  getMaxPointsForDifficulty,
  makePublicGameConfig,
  normalizePlayerLocation,
  normalizePlayerName,
};
