const appConfig = {
  appName: "whoa-food",
  bindHost: "127.0.0.1",
  defaultPort: 3001,
  publicEnvFile: ".env-public",

  pageTitle: "Max's Healthy Food Game",
  pageDescription:
    "A playful food categorization game for learning Whoa, Slow, and Go foods.",
  shareImagePath: "/images/share/liger-meat.jpg",

  pointsForCorrectAnswer: 10,
  bestStreakStorageKey: "whoaSlowGoBestStreak",

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
