const appConfig = {
  appName: "whoa-food",
  bindHost: "127.0.0.1",
  defaultPort: 3001,
  publicEnvFile: ".env-public",

  pageTitle: "Max's Healthy Food Game",
  pageDescription:
    "A playful food categorization game for learning Whoa, Slow, and Go foods.",
  shareImagePath: "/images/share/liger-meat.jpg",

  databasePathEnvVar: "WHOA_FOOD_DB_PATH",
  defaultDatabasePath: "../data/game.sqlite",

  bestStreakStorageKey: "whoaSlowGoBestStreak",
  scoringConfigVersion: "v2-2026-06",
  scoring: {
    basePoints: 10,
    difficulties: {
      practice: {
        label: "Practice",
        timerSeconds: null,
        multiplier: 1,
      },
      normal: {
        label: "Normal",
        timerSeconds: 6,
        multiplier: 1.2,
      },
      hard: {
        label: "Hard",
        timerSeconds: 3,
        multiplier: 1.5,
      },
    },
  },
  playerNameMaxLength: 8,
  playerLocationMaxLength: 32,
  leaderboardDefaultLimit: 10,
  leaderboardMaxLimit: 25,

  validCategories: {
    whoa: "Whoa",
    slow: "Slow",
    go: "Go",
  },

  categoryLabelExceptions: {
    "hot-dog": "Not Hot Dog",
  },
};

module.exports = appConfig;
