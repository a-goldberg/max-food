module.exports = {
  apps: [
    {
      name: "whoa-food",
      script: "server.js",
      instances: 1,
      autorestart: true,
      watch: ["server.js", "views", "public", "data"],
      ignore_watch: ["node_modules", ".git"],
      max_memory_restart: "128M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
