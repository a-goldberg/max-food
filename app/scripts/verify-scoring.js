const assert = require("assert");
const appConfig = require("../config/app");
const {
  calculateAnswerScore,
  getMaxPointsForDifficulty,
} = require("../lib/scoring");

const scoring = appConfig.scoring;

assert.strictEqual(
  calculateAnswerScore(scoring, "practice", true, null),
  10,
  "Practice correct answers should award 10 points.",
);
assert.strictEqual(
  calculateAnswerScore(scoring, "practice", false, null),
  0,
  "Incorrect practice answers should award 0 points.",
);
assert.strictEqual(
  calculateAnswerScore(scoring, "normal", true, 0),
  12,
  "Normal immediate answers should award 12 points.",
);
assert.strictEqual(
  calculateAnswerScore(scoring, "normal", true, 3000),
  11,
  "Normal half-time answers should award half the bonus.",
);
assert.strictEqual(
  calculateAnswerScore(scoring, "hard", true, 0),
  15,
  "Hard immediate answers should award 15 points.",
);
assert.strictEqual(
  calculateAnswerScore(scoring, "hard", true, 1500),
  13,
  "Hard half-time answers should round 12.5 up to 13 points.",
);
assert.strictEqual(
  calculateAnswerScore(scoring, "hard", true, 3000),
  10,
  "Hard answers at the limit should award only base points.",
);
assert.strictEqual(
  calculateAnswerScore(scoring, "hard", false, 100),
  0,
  "Incorrect hard answers should award 0 points.",
);
assert.strictEqual(
  getMaxPointsForDifficulty(scoring, "practice"),
  10,
  "Practice max points should be 10.",
);
assert.strictEqual(
  getMaxPointsForDifficulty(scoring, "normal"),
  12,
  "Normal max points should be 12.",
);
assert.strictEqual(
  getMaxPointsForDifficulty(scoring, "hard"),
  15,
  "Hard max points should be 15.",
);

console.log("Scoring checks passed.");
