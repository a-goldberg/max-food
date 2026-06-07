const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

function openGameDatabase(databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const database = new DatabaseSync(databasePath);

  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS game_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_name TEXT NOT NULL,
      player_location TEXT NOT NULL DEFAULT '',
      difficulty TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      scoring_config_version TEXT NOT NULL,
      scoring_config_json TEXT NOT NULL,
      total_score INTEGER NOT NULL,
      max_possible_score INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS round_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      round_number INTEGER NOT NULL,
      food_id TEXT NOT NULL,
      selected_category TEXT NOT NULL,
      correct_category TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      timed_out INTEGER NOT NULL,
      response_time_ms INTEGER,
      timer_limit_ms INTEGER,
      points_awarded INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS food_option_counts (
      food_id TEXT NOT NULL,
      selected_category TEXT NOT NULL,
      selection_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (food_id, selected_category)
    );

    CREATE INDEX IF NOT EXISTS idx_game_sessions_score
      ON game_sessions (total_score DESC, completed_at ASC);

    CREATE INDEX IF NOT EXISTS idx_game_sessions_difficulty_score
      ON game_sessions (difficulty, total_score DESC, completed_at ASC);

    CREATE INDEX IF NOT EXISTS idx_round_answers_food
      ON round_answers (food_id, selected_category);
  `);

  return database;
}

function saveCompletedGame(database, game) {
  const insertSession = database.prepare(`
    INSERT INTO game_sessions (
      player_name,
      player_location,
      difficulty,
      started_at,
      completed_at,
      scoring_config_version,
      scoring_config_json,
      total_score,
      max_possible_score
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAnswer = database.prepare(`
    INSERT INTO round_answers (
      session_id,
      round_number,
      food_id,
      selected_category,
      correct_category,
      is_correct,
      timed_out,
      response_time_ms,
      timer_limit_ms,
      points_awarded
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateOptionCount = database.prepare(`
    INSERT INTO food_option_counts (food_id, selected_category, selection_count)
    VALUES (?, ?, 1)
    ON CONFLICT(food_id, selected_category)
    DO UPDATE SET
      selection_count = selection_count + 1,
      updated_at = CURRENT_TIMESTAMP
  `);

  database.exec("BEGIN IMMEDIATE");

  try {
    const result = insertSession.run(
      game.playerName,
      game.playerLocation,
      game.difficulty,
      game.startedAt,
      game.completedAt,
      game.scoringConfigVersion,
      JSON.stringify(game.scoringConfig),
      game.totalScore,
      game.maxPossibleScore,
    );
    const sessionId = Number(result.lastInsertRowid);

    game.answers.forEach((answer) => {
      insertAnswer.run(
        sessionId,
        answer.roundNumber,
        answer.foodId,
        answer.selectedCategory,
        answer.correctCategory,
        answer.isCorrect ? 1 : 0,
        answer.timedOut ? 1 : 0,
        answer.responseTimeMs,
        answer.timerLimitMs,
        answer.pointsAwarded,
      );

      updateOptionCount.run(answer.foodId, answer.selectedCategory);
    });

    database.exec("COMMIT");
    return sessionId;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function getLeaderboard(database, difficulty, limit) {
  if (difficulty === "all") {
    return database
      .prepare(`
        SELECT
          id,
          player_name AS playerName,
          player_location AS playerLocation,
          difficulty,
          total_score AS totalScore,
          max_possible_score AS maxPossibleScore,
          completed_at AS completedAt
        FROM game_sessions
        ORDER BY total_score DESC, completed_at ASC
        LIMIT ?
      `)
      .all(limit);
  }

  return database
    .prepare(`
      SELECT
        id,
        player_name AS playerName,
        player_location AS playerLocation,
        difficulty,
        total_score AS totalScore,
        max_possible_score AS maxPossibleScore,
        completed_at AS completedAt
      FROM game_sessions
      WHERE difficulty = ?
      ORDER BY total_score DESC, completed_at ASC
      LIMIT ?
    `)
    .all(difficulty, limit);
}

module.exports = {
  getLeaderboard,
  openGameDatabase,
  saveCompletedGame,
};
