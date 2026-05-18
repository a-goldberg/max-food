module.exports = {
  apps: [
    {
      name: "whoa-food",
      script: "server.js",
      watch: ["server.js", "views", "public", "data"],
      ignore_watch: ["node_modules", ".git"],
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
