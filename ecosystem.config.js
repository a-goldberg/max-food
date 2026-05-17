module.exports = {
  apps: [
    {
      name: "whoa-slow-go",
      script: "server.js",
      watch: ["server.js", "views", "public", "data"],
      ignore_watch: ["node_modules", ".git"],
      env: {
        NODE_ENV: "development",
        PORT: 3000
      }
    }
  ]
};
