const appConfig = require("./config/app");

module.exports = {
  apps: [
    {
      name: appConfig.appName,
      script: "server.js",
      instances: 2,
      autorestart: true,
      watch: ["server.js", "views", "public", "data"],
      ignore_watch: ["node_modules", ".git", "ignored"],
      max_memory_restart: "128M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        NODE_ENV: "production",
        PORT: appConfig.defaultPort,
      },
    },
  ],
};
